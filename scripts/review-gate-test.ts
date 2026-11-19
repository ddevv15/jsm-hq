// Headless test of the review gate (plan 012): a PR passes only with every reviewer role's approval
// of its current commit. Run from the repo root:
//   npx tsx scripts/review-gate-test.ts
import { withAgentReviews } from "../server/githubSync";
import { Planner } from "../server/planner";
import type { Hub } from "../server/hub";
import type { Inbox } from "../server/inbox";
import type { AgentConfig, PullRequest, Task } from "../src/data/types";

let failed = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : `  ${detail}`}`);
  if (!ok) failed++;
};

const agent = (id: string, role: string, extra: Partial<AgentConfig> = {}): AgentConfig =>
  ({ id, name: id, role, isLead: false, cli: "claude", model: "", mode: "sandbox", color: "", skills: [], roleMd: "", sandbox: {}, workspacePath: null, ...extra }) as AgentConfig;

function world(withQa = true) {
  const team = [agent("lead", "Lead", { isLead: true }), agent("dev", "Developer", { kind: "builder" }), ...(withQa ? [agent("qa", "QA", { kind: "reviewer" })] : [])];
  const snap = {
    config: { team },
    tasks: [] as Task[],
    boards: [{ id: "B", title: "Backlog", status: "active", order: 0 }],
    pullRequests: [] as PullRequest[],
    messages: [] as unknown[],
    agents: team.map((a) => ({ agentId: a.id, currentTaskId: null as string | null })),
  };
  const sent: { to: string; text: string }[] = [];
  const hub = {
    snap,
    emit: () => {},
    activity: () => {},
    planChanged: () => {},
    name: (id: string | null) => id ?? "HQ",
    cfg: (id: string) => team.find((a) => a.id === id),
    status: (id: string) => snap.agents.find((a) => a.agentId === id),
    setStatus: (id: string, p: { currentTaskId: string | null }) => {
      const a = snap.agents.find((x) => x.agentId === id);
      if (a) a.currentTaskId = p.currentTaskId;
    },
  } as unknown as Hub;
  const inbox = { push: (to: string, m: { text: string }) => sent.push({ to, text: m.text }) } as unknown as Inbox;
  const planner = new Planner(hub, inbox);
  const pr = (n: number, extra: Partial<PullRequest> = {}): PullRequest => ({
    number: n, title: `PR ${n}`, taskId: "", authorId: "dev", review: "passed", openComments: 0, mergeable: true, merged: false, openedAt: "", headSha: "A", ...extra,
  });
  const score = (p: PullRequest) => withAgentReviews(p, snap.tasks, team);
  return { snap, planner, pr, score, sent, team };
}

function buildTask(w: ReturnType<typeof world>) {
  const t = w.planner.createTask({ title: "Login page" }, "lead");
  w.planner.assign(t.id, "dev", "lead");
  return t;
}

// 1. Race: the builder's PR is in review, the tool passed, but HQ hasn't made QA's review task yet.
{
  const w = world();
  const t = buildTask(w);
  const p = w.score(w.pr(5, { taskId: t.id }));
  check("race: no review task yet → not passed", p.review === "reviewing", p.review);
  check("race: shows QA as waiting", p.agentReviews?.some((r) => r.role === "QA" && r.verdict === "pending") === true);
}
// 2. A builder's PR with no task id in the title can't skip reviewers.
{
  const w = world();
  const p = w.score(w.pr(7));
  check("untracked builder PR → not passed", p.review === "reviewing", p.review);
  check("untracked builder PR → note says how to fix", (p.reviewNote ?? "").includes("lead can create"), p.reviewNote ?? "");
}
// 3. No regressions: the user's own PR, and a team without reviewers.
{
  const w = world();
  check("user's PR (no task, not a builder) → tool decides", w.score(w.pr(8, { authorId: "" })).review === "passed");
  const v = world(false);
  const t = buildTask(v);
  check("team without reviewers → tool decides", v.score(v.pr(5, { taskId: t.id })).review === "passed");
}
// 4. Approval is bound to the commit; new commits re-open the review.
{
  const w = world();
  const t = buildTask(w);
  w.snap.pullRequests.push(w.pr(5, { taskId: t.id, headSha: "A" }));
  w.planner.setStatus("dev", "in-review", undefined, 5);
  const review = w.planner.reviewsFor(t.id)[0];
  check("in-review creates a QA review assigned to qa", review?.ownerId === "qa" && review.reviewOf === 5);
  w.planner.setStatus("qa", "done", "looks good", undefined, "approve");
  check("verdict records the head commit", review.reviewedSha === "A", String(review.reviewedSha));
  check("approved on the current commit → passed", w.score(w.pr(5, { taskId: t.id, headSha: "A" })).review === "passed");
  const pushed = w.score(w.pr(5, { taskId: t.id, headSha: "B" }));
  check("new commit → approval no longer counts", pushed.review === "reviewing", pushed.review);
  w.planner.requestReviews(t, "B");
  check("new commit → review re-opened for the same reviewer", review.status === "todo" && review.verdict === null && review.ownerId === "qa", `${review.status} ${review.verdict} ${review.ownerId}`);
  check("re-opened reviewer was told", w.sent.filter((m) => m.to === "qa").length === 2);
  w.planner.requestReviews(t, "B");
  check("re-open is idempotent while the review is open", w.sent.filter((m) => m.to === "qa").length === 2);
}
// 5. A review can't be lent to another PR.
{
  const w = world();
  const t = buildTask(w);
  w.snap.pullRequests.push(w.pr(5, { taskId: t.id }));
  w.planner.setStatus("dev", "in-review", undefined, 5);
  w.planner.setStatus("qa", "done", "ok", undefined, "approve");
  const other = w.score(w.pr(7, { headSha: "A" }));
  check("approval for T's PR #5 doesn't count on untracked PR #7", other.review === "reviewing", other.review);
  // The task moves to a new PR #9: approval of #5 doesn't count there, and the review follows the PR.
  const moved = w.score(w.pr(9, { taskId: t.id, headSha: "C" }));
  check("task's new PR #9 → not passed on #5's approval", moved.review === "reviewing", moved.review);
  w.planner.updateTask(t.id, { prNumber: 9 });
  w.planner.requestReviews(t, "C");
  const review = w.planner.reviewsFor(t.id)[0];
  check("review moves to #9 and re-opens", review.reviewOf === 9 && review.status === "todo" && review.title.startsWith("Review #9"), `${review.reviewOf} ${review.status} ${review.title}`);
}
// 6. A builder can't claim another task's PR.
{
  const w = world();
  const t1 = buildTask(w);
  const t2 = w.planner.createTask({ title: "Other" }, "lead");
  w.snap.pullRequests.push(w.pr(11, { taskId: t2.id }));
  let threw = "";
  try {
    w.planner.setStatus("dev", "in-review", undefined, 11);
  } catch (e) {
    threw = e instanceof Error ? e.message : String(e);
  }
  check("claiming another task's PR is refused", threw.includes(`belongs to ${t2.id}`), threw);
  check("…and the task wasn't changed", w.planner.task(t1.id)?.status === "todo" && !w.planner.task(t1.id)?.prNumber && w.planner.reviewsFor(t1.id).length === 0);
}
// 7. The changes loop still works.
{
  const w = world();
  const t = buildTask(w);
  w.snap.pullRequests.push(w.pr(5, { taskId: t.id }));
  w.planner.setStatus("dev", "in-review", undefined, 5);
  w.planner.setStatus("qa", "done", "button broken", undefined, "changes");
  check("changes → build task back to in-progress", t.status === "in-progress");
  check("changes → PR is changes-requested", w.score(w.pr(5, { taskId: t.id })).review === "changes-requested");
  w.planner.setStatus("dev", "in-review", undefined, 5);
  const review = w.planner.reviewsFor(t.id)[0];
  check("sent back → same reviewer re-opened", review.status === "todo" && review.ownerId === "qa");
}

console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
