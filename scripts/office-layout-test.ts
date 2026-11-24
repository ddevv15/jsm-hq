// Test of the office layout: role → department, and the room-block layout's invariants.
// Run from the repo root: npx tsx scripts/office-layout-test.ts
import { presets } from "../src/data/mock/presets";
import type { Environment, HqConfig } from "../src/data/types";
import { dropDeadline, walkSeconds } from "../src/office/actors/walk";
import type { Tile } from "../src/office/engine/path";
import { fitZoom } from "../src/office/engine/zoom";
import { departmentOf, groupByDepartment } from "../src/office/layout/departments";
import { amenitySpots, generateLayout, layoutKey, type OfficeLayout, type Room } from "../src/office/layout/layout";

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


// ------------------------------------------------------------ layout
const inside = (r: { x: number; y: number; w: number; h: number }, l: OfficeLayout) =>
  r.x >= 0 && r.y >= 0 && r.x + r.w <= l.worldW && r.y + r.h <= l.worldH;
const interior = (r: Room) => ({ x0: r.x0 + 1, y0: r.y0 + 1, x1: r.x0 + r.w - 2, y1: r.y0 + r.h - 2 });
const reaches = (l: OfficeLayout, t: Tile) => {
  const path = l.grid.find(l.door[0], l.door[1], t[0], t[1]);
  const end = path[path.length - 1];
  return (l.door[0] === t[0] && l.door[1] === t[1]) || (!!end && end[0] === t[0] && end[1] === t[1]);
};

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
  const cafe = l.rooms.find((r) => r.kind === "cafe");
  if (cafe) {
    const cx0 = l.ox + cafe.x0 * 16;
    const cy0 = l.oy + cafe.y0 * 16;
    const hitsCafe = l.cables.some((cb) =>
      cb.pts.slice(1).some(([x1, y1], i) => {
        const [x0, y0] = cb.pts[i];
        return Math.max(x0, x1) >= cx0 && Math.min(x0, x1) <= cx0 + cafe.w * 16 && Math.max(y0, y1) >= cy0 && Math.min(y0, y1) <= cy0 + cafe.h * 16;
      }),
    );
    check(`${name}: cables stay clear of the café`, !hitsCafe);
  }
  check(`${name}: cable lanes run under the belt`, l.cables.every((cb) => Math.abs(cb.pts[1][1] - l.belt.y) <= 8));
  // campus (revision 2026-11-24)
  const hq = l.rooms.find((r) => r.kind === "lead")!;
  for (const kind of ["cafe", "gym", "game"] as const) {
    const r = l.rooms.find((x) => x.kind === kind);
    check(`${name}: ${kind} building above the HQ row`, !!r && r.y0 + r.h <= hq.y0);
    check(`${name}: ${kind} has a reachable spot`, amenitySpots(l, kind).some((t) => reaches(l, t)));
  }
  const unreachableDoors = l.rooms.filter((r) => r.kind !== "corridor" && r.kind !== "server").flatMap((r) => r.doors.filter((d) => !reaches(l, d)).map(() => r.id));
  check(`${name}: every door reachable`, !unreachableDoors.length, unreachableDoors.join(", "));
  const blds = l.rooms.filter((r) => r.kind !== "corridor");
  let tight = "";
  blds.forEach((a, i) =>
    blds.forEach((b, j) => {
      if (j <= i) return;
      const gap = Math.max(b.x0 - (a.x0 + a.w), a.x0 - (b.x0 + b.w), b.y0 - (a.y0 + a.h), a.y0 - (b.y0 + b.h));
      if (gap < 2) tight = `${a.id}/${b.id} gap ${gap}`;
    }),
  );
  check(`${name}: buildings at least 2 tiles apart`, !tight, tight);
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

const twelve = withTeam(deployPreset, team(12, ["Developer"]));
check("12 developers → one Engineering building", generateLayout(twelve, envsFor(twelve)).rooms.filter((r) => r.kind === "department").length === 1);

// ------------------------------------------------------------ camera fit (campus revision)
// 1440×900 window minus the HUD: team panel on the left, top bar above.
const FREE = { w: 1140, h: 836 };
const MARGIN_PX = 48;
for (const p of presets) {
  const l = generateLayout(p.config, envsFor(p.config));
  const world = { w: l.worldW, h: l.worldH };
  const z2 = fitZoom(FREE, world, MARGIN_PX, 2);
  const shows = (world.w - 2 * MARGIN_PX) * z2 <= FREE.w && (world.h - 2 * MARGIN_PX) * z2 <= FREE.h;
  check(`${p.id}: whole campus visible on a Retina 1440×900`, shows, `zoom ${z2}, world ${world.w}×${world.h}`);
  check(`${p.id}: Retina zoom is a half step`, z2 * 2 === Math.round(z2 * 2));
  check(`${p.id}: 1× screens never go below 1x`, fitZoom(FREE, world, MARGIN_PX, 1) >= 1);
}
{
  const l = generateLayout(presets[0].config, envsFor(presets[0].config));
  check("3-agent demo opens at 1x or more on Retina", fitZoom(FREE, { w: l.worldW, h: l.worldH }, MARGIN_PX, 2) >= 1);
}
check("small world caps at 6x", fitZoom(FREE, { w: 100, h: 80 }, 0, 2) === 6);

const cfg = presets[0].config;
const someWorker = cfg.team.find((a) => !a.isLead)!.id;
check("role change changes layoutKey", layoutKey(cfg, envsFor(cfg)) !== layoutKey(withRole(cfg, someWorker, "QA"), envsFor(cfg)));

console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
