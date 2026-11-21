// Test of the office layout: role → department, and the room-block layout's invariants.
// Run from the repo root: npx tsx scripts/office-layout-test.ts
import { presets } from "../src/data/mock/presets";
import type { Environment, HqConfig } from "../src/data/types";
import { departmentOf, groupByDepartment } from "../src/office/layout/departments";

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

console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
