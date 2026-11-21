// Test of the office layout: role → department, and the room-block layout's invariants.
// Run from the repo root: npx tsx scripts/office-layout-test.ts
import { presets } from "../src/data/mock/presets";
import type { Environment, HqConfig } from "../src/data/types";
import { dropDeadline, walkSeconds } from "../src/office/actors/walk";
import type { Tile } from "../src/office/engine/path";
import { departmentOf, groupByDepartment } from "../src/office/layout/departments";
import { generateLayout, layoutKey, type OfficeLayout, type Room } from "../src/office/layout/layout";

let failed = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : `  ${detail}`}`);
  if (!ok) failed++;
};

/** Environments like a live run would have: none, one per worker plus main, or just main. */
export function envsFor(config: HqConfig): Environment[] {
  const d = config.workflow.deploy;
  if (!d.enabled) return [];
  const env = (name: string, agentId: string | null): Environment => ({ name, agentId, url: "", status: "live", lastDeployAt: "" });
  if (!d.perAgentEnvironments) return [env("main", null)];
  return [...config.team.filter((a) => !a.isLead).map((a) => env(a.id, a.id)), env("main", null)];
}

/** Default-view zoom per preset before departments, at 1440×900 (camera.fitZoom at DPR 2, no HUD insets). */
const BASELINE_FIT: Record<string, number> = { askwell: 2, "big-team": 1.5, duo: 2 };

// ------------------------------------------------------------ departments
check("developer → engineering", departmentOf("Developer") === "engineering");
check("frontend developer → engineering", departmentOf("Frontend Developer") === "engineering");
check("spaced QA → quality", departmentOf("  QA ") === "quality");
check("code reviewer → quality", departmentOf("Code Reviewer") === "quality");
check("security → quality", departmentOf("security") === "quality");
check("designer → design-docs", departmentOf("Designer") === "design-docs");
check("docs → design-docs", departmentOf("Docs") === "design-docs");
check("DEVOPS → ops", departmentOf("DEVOPS") === "ops");
check("unknown → engineering", departmentOf("Data Wizard") === "engineering");
check("empty → engineering", departmentOf("") === "engineering");
const g = groupByDepartment([{ role: "QA" }, { role: "Dev" }, { role: "Docs" }, { role: "qa" }]);
check("groups in building order, empty skipped", g.map((x) => x.dept.id).join() === "engineering,quality,design-docs", g.map((x) => x.dept.id).join());
check("members keep input order", g[1].members.length === 2 && g[1].members[0].role === "QA");

check("every preset has a baseline", presets.every((p) => p.id in BASELINE_FIT));

// ------------------------------------------------------------ layout
const inside = (r: { x: number; y: number; w: number; h: number }, l: OfficeLayout) =>
  r.x >= 0 && r.y >= 0 && r.x + r.w <= l.worldW && r.y + r.h <= l.worldH;
const interior = (r: Room) => ({ x0: r.x0 + 1, y0: r.y0 + 1, x1: r.x0 + r.w - 2, y1: r.y0 + r.h - 2 });
const reaches = (l: OfficeLayout, t: Tile) => {
  const path = l.grid.find(l.door[0], l.door[1], t[0], t[1]);
  const end = path[path.length - 1];
  return (l.door[0] === t[0] && l.door[1] === t[1]) || (!!end && end[0] === t[0] && end[1] === t[1]);
};
const fit = (l: OfficeLayout) => Math.floor((Math.min(1440 / l.worldW, 900 / l.worldH) + 0.2) / 0.5) * 0.5;

function invariants(name: string, l: OfficeLayout, config: HqConfig) {
  const workers = config.team.filter((a) => !a.isLead);
  const depts = l.rooms.filter((r) => r.kind === "department");
  const expected = groupByDepartment(workers).map((g) => g.dept.id);
  check(`${name}: one room per non-empty department`, depts.map((r) => r.id).join() === expected.join(), `${depts.map((r) => r.id)} vs ${expected}`);
  const deskOk = workers.every((a) => {
    const mine = l.desks.filter((d) => d.agentId === a.id);
    const room = depts.find((r) => r.id === departmentOf(a.role));
    if (mine.length !== 1 || !room) return false;
    const d = mine[0];
    return d.x0 > room.x0 && d.x0 + 6 < room.x0 + room.w - 1 && d.y0 > room.y0 && d.y0 + 6 < room.y0 + room.h - 1;
  });
  check(`${name}: every worker has one desk in their department room`, deskOk);
  const ins = l.rooms.map(interior);
  let overlap = "";
  ins.forEach((a, i) =>
    ins.forEach((b, j) => {
      if (j > i && a.x0 <= b.x1 && b.x0 <= a.x1 && a.y0 <= b.y1 && b.y0 <= a.y1) overlap = `${l.rooms[i].id} × ${l.rooms[j].id}`;
    }),
  );
  check(`${name}: rooms don't overlap`, !overlap, overlap);
  check(`${name}: rooms inside the site`, l.rooms.every((r) => r.x0 >= 0 && r.y0 >= 0 && r.x0 + r.w <= l.W && r.y0 + r.h <= l.H));
  const spots: [string, Tile][] = [
    ...l.desks.flatMap((d): [string, Tile][] => [[`seat ${d.agentId}`, d.seat], [`drop ${d.agentId}`, d.drop]]),
    ["lead seat", l.lead.seat],
    ["plan spot", l.plan.spot],
    ...l.lounge.coffee.map((t): [string, Tile] => ["coffee", t]),
    ...l.wander.map((t): [string, Tile] => [`wander ${t}`, t]),
  ];
  const lost = spots.filter(([, t]) => !reaches(l, t)).map(([n]) => n);
  check(`${name}: every spot reachable from the door`, !lost.length, lost.join(", "));
  if (l.gate) {
    const g = l.gate;
    check(`${name}: gate past every drop point`, l.desks.every((d) => g.x - 6 > l.ox + d.drop[0] * 16 + 8));
  }
  if (l.racks.length) {
    const top = l.belt.topY;
    check(`${name}: belt climbs to the racks`, top !== null && top < l.belt.y);
    check(`${name}: racks above the belt`, l.racks.every((r) => r.y + r.h <= l.belt.y));
  }
  check(`${name}: hit areas inside the world`, l.hits.every((h) => inside(h.rect, l)));
  const beltRow = Math.floor((l.belt.y - l.oy) / 16);
  check(`${name}: crossings on the belt row and walkable`, l.crossings.every(([x, y]) => y === beltRow && l.grid.ok(x, y)));
}

const team = (n: number, roles: string[], lead = true): HqConfig["team"] => {
  const base = presets[0].config.team;
  const out = lead ? [base.find((a) => a.isLead)!] : [];
  for (let i = 0; i < n; i++) out.push({ ...base.find((a) => !a.isLead)!, id: `w${i}`, name: `W${i}`, role: roles[i % roles.length], isLead: false });
  return out;
};
const withTeam = (c: HqConfig, t: HqConfig["team"]): HqConfig => ({ ...c, team: t });
const withRole = (c: HqConfig, id: string, role: string): HqConfig => ({ ...c, team: c.team.map((a) => (a.id === id ? { ...a, role } : a)) });
const noReview = (c: HqConfig): HqConfig => ({ ...c, workflow: { ...c.workflow, review: { ...c.workflow.review, enabled: false } } });
const mixed = ["Developer", "QA", "Designer", "DevOps", "Security", "Docs", "Frontend Developer"];

for (const p of presets) {
  const l = generateLayout(p.config, envsFor(p.config));
  invariants(p.id, l, p.config);
  check(`${p.id}: fit within one step of today`, fit(l) >= BASELINE_FIT[p.id] - 0.5, `${fit(l)} vs ${BASELINE_FIT[p.id]}`);
  const nr = noReview(p.config);
  const lNoReview = generateLayout(nr, envsFor(nr));
  invariants(`${p.id} review off`, lNoReview, nr);
  check(`${p.id}: review off → no gate, no review room`, !lNoReview.gate && !lNoReview.rooms.some((r) => r.kind === "review"));
}
const deployPreset = presets.find((p) => p.config.workflow.deploy.enabled)!.config;
const lNoEnv = generateLayout(deployPreset, []);
invariants("deploy, zero envs", lNoEnv, deployPreset);
check("deploy, zero envs → mailbox, no server", !!lNoEnv.mailbox && !lNoEnv.rooms.some((r) => r.kind === "server") && lNoEnv.belt.topY === null);
for (const [name, t] of [
  ["1 worker", team(1, mixed)],
  ["5 workers", team(5, mixed)],
  ["12 workers", team(12, mixed)],
  ["12 developers", team(12, ["Developer"])],
  ["lead only", team(0, mixed)],
  ["no lead", team(4, mixed, false)],
] as [string, HqConfig["team"]][]) {
  const c = withTeam(deployPreset, t);
  invariants(name, generateLayout(c, envsFor(c)), c);
}
// ------------------------------------------------------------ walks to the belt (final review #1)
const walkTiles = (l: OfficeLayout, a: Tile, b: Tile) => l.grid.find(a[0], a[1], b[0], b[1]).length;
for (const p of presets) {
  const l = generateLayout(p.config, envsFor(p.config));
  const firstRow = Math.min(...l.rooms.filter((r) => r.kind === "department").map((r) => r.y0));
  const slow = l.desks
    .filter((d) => d.y0 < firstRow + 12)
    .map((d) => [d.agentId, walkSeconds(walkTiles(l, d.seat, d.drop))] as const)
    .filter(([, s]) => s > 8);
  check(`${p.id}: first-row desks reach the belt within 8 s`, !slow.length, slow.map(([a, s]) => `${a} ${s.toFixed(1)}s`).join(", "));
}
check("drop deadline: short walk keeps 8 s", dropDeadline(10, 3) === 18);
check("drop deadline: long walk gets walk time + 2 s", Math.abs(dropDeadline(10, 60) - (10 + (60 * 16) / 52 + 2)) < 1e-9);

const cfg = presets[0].config;
const someWorker = cfg.team.find((a) => !a.isLead)!.id;
check("role change changes layoutKey", layoutKey(cfg, envsFor(cfg)) !== layoutKey(withRole(cfg, someWorker, "QA"), envsFor(cfg)));

console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
