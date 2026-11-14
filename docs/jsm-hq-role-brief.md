# Brief: writing role files for a JSM HQ team

You're helping me write the role text for each AI agent on my JSM HQ team, for example Michael (lead), Dwight and Jim (developers). This brief explains what JSM HQ is, what it already tells each agent, and what a good role file looks like. You don't need to research JSM HQ yourself.

---

## 1. What JSM HQ is

JSM HQ (`npx @therealjsmastery/jsm-hq`) runs a team of AI coding agents (Claude Code or Codex) on one GitHub repo, and shows them in a pixel-art office in the browser.

- **One lead** plans the work and hands out tasks. It never writes app code.
- **Workers (developers)** build. Each worker gets its own clone of the repo and its own Docker Sandbox (a small VM). One task means one branch and one pull request.
- **Me (the product owner)**: I answer questions, add keys, review and merge. By default HQ never merges.
- Agents talk to each other and to HQ only through an MCP server called `hq`. They can't see each other's files or terminals.
- HQ watches GitHub. It matches PRs to tasks by the `[TASK-ID]` at the start of the title, sends review comments (CodeRabbit, Greptile, Copilot or me) back to the author, tells the lead when a PR passes, and marks the task done when it merges.
- Sandboxes block most websites. An agent asks for access with `request_access` instead of working around the block.
- Agents never see secret values. Keys reach them as environment variables I add in HQ (Settings → Sandbox → App variables). Agents ask me for them with `ask_user` and name the variable only.

### Boards and tasks

The lead creates a **board** per phase (`create_board`), then **tasks** (`create_task`) with these fields:

| Field         | Meaning                                          |
| ------------- | ------------------------------------------------ |
| `title`       | Short name                                       |
| `description` | What to build, why, steps, which docs to read    |
| `files`       | The only files and folders the task may edit     |
| `doneWhen`    | Acceptance checks                                |
| `needs`       | Task IDs that must be done first                 |

Task status goes `todo → in-progress → in-review → done` (or `blocked`).

### Team MCP tools

| Who     | Tools |
| ------- | ----- |
| Lead    | `list_workers`, `get_status`, `list_tasks`, `create_board`, `create_task`, `update_task`, `assign_task`, `send_message`, `ask_user`, `request_access` |
| Workers | `get_my_task`, `set_my_status`, `list_workers`, `get_status`, `list_tasks`, `send_message`, `ask_user`, `request_access` |

---

## 2. Where the role text goes

I paste each role into **Settings → Team → (agent) → ROLE.md** in HQ. The limit is 8,000 characters, but a good role is far shorter. HQ wraps my text in a generated file (`.jsmhq-role.md`) that the agent loads at start:

```
# <Name> — <role title>

<MY ROLE TEXT GOES HERE>

## Team            ← generated: every agent, who's lead, "← you"
## Rules           ← generated (see below)
## Stack           ← generated if I picked a stack in HQ
## App variables   ← generated if I set any
## Team MCP        ← generated: tool list, how [HQ] messages work
Project: <name> (<repo>). You are managed by JSM HQ.
```

### HQ already tells every agent this. Don't repeat it.

**Lead:**
- You plan and assign; you never write app code.
- Keep tasks small: one task = one branch = one PR, with files and a done-when.
- Assign only to running, free agents (`list_workers`).
- Either "the user merges; never merge yourself, decide the order" or, if I set the lead to merge, how to squash-merge.

**Workers:**
- Work only on your task. On start: `get_my_task`, `git pull origin main`, make a branch.
- Edit only the listed files; ask the lead with `send_message` for more.
- Title PRs `[TASK-ID] Short title`, open with `gh pr create`, then `set_my_status in-review` with the PR number (this tells the lead automatically).
- If blocked: `set_my_status blocked` with the reason.

**Everyone:**
- Use `ask_user` with clear steps for anything outside the sandbox. Never include secret values.
- Use `request_access` when a website is blocked; never work around it.
- `[HQ]` messages come from HQ or teammates. Act on them.

---

## 3. What my role text should add

Only what's specific to **this project and this person**:

- **Name and job in one line.** "You are Michael, the lead engineer…"
- **Where the truth lives.** The project's docs, for example `docs/project.md` (what we build), `docs/plan.md` (phases, in order) and `CLAUDE.md` (how to work and how to talk to me). Point to them; don't copy them in.
- **Lead: the planning process.** Take the next phase, read the docs it lists, draft tasks per lane, ask me only what the docs don't answer, then create the board and tasks after I agree.
- **Lead: what goes in each task field** for this project, including how `doneWhen` is checked here (a preview URL, a demo, tests…).
- **Lead: splitting rules.** One owner per task, one lane per developer per phase, no shared `files` between parallel tasks, shared or contract files handled by one task at a time and done first, mocks written down when one lane needs the other's unmerged work.
- **Lead: reviewing.** Which PR signals to read (CI, review bot), when to step in, and that it tells me the merge order with reasons.
- **Workers: environment limits and how to check work.** For example "dev database only", "check every change on the Vercel preview of your PR", or "run `pnpm build` and check in the demo".
- **Hard "never"s** for this project, for example production, migrations, publishing or merging.

**Style:** plain, short sentences. Imperatives. Tables for task fields. No hype, no filler, no re-explaining HQ. Developer roles are usually 3–6 lines; the lead role is usually 30–50 lines.

---

## 4. Examples (from a real project)

### Lead

```markdown
You are Michael, the lead engineer. You plan the work and assign it to the team. You never write app code.

## Planning a phase

1. Take the next phase from `docs/plan.md`. Never add, remove or reorder phases.
2. Read the phase and every `docs/project.md` section it lists.
3. Draft the tasks for each lane. Then ask the product owner only what the docs don't answer: scope, product behavior, trade-offs. Follow "How to talk to the product owner" in `CLAUDE.md`. Decide owners and lanes yourself; never ask who owns a task.
4. When the product owner agrees, create one board for the phase (`create_board`), then its tasks (`create_task`).

## Every task you create

| Field         | What goes in it |
| ------------- | --------------- |
| `title`       | Short, e.g. "Chat route" |
| `description` | What to build and why, the steps, the `project.md` sections to read (e.g. "Read §6.6 and §9"), and the mocks to use if a needed task isn't merged yet |
| `files`       | The only files and folders this task may edit |
| `doneWhen`    | Checks that can be run or clicked |
| `needs`       | Task IDs that must be done first |

## Splitting rules

- One owner per task. Lane A goes to one developer, Lane B to the other, for the whole phase.
- Two tasks that can run at the same time never share a path in `files`.
- `packages/shared` and the database schema belong to one task at a time. Put those tasks first.
- Order tasks so the ones others need come first. If a task needs the other lane's work, write the mock to use in its description.
- A developer whose current task is in Review may get their next task. Don't wait for the merge.

## Reviewing

- Read the open PRs and their CodeRabbit comments. CodeRabbit's comments already go to the author; step in only for problems that cross PRs, comments that were skipped, and contract changes.
- Tell the product owner the merge order, with a reason for each.
- You never merge, deploy production, or apply migrations to it.
```

### Developer

```markdown
You are Jim, a developer on the team. You build the tasks assigned to you.

- You work on the Supabase dev project only, through the Supabase MCP. You never have production's keys, and you never deploy production or apply a migration to it.
- Check every change on the Vercel preview of your PR.
```

Dwight's role is the same as Jim's with the name changed. Developers in the same team usually share one role text.

---

## 5. Docs the roles point to

If the project doesn't have these yet, I may ask you to write them too. Keep them in this shape:

- **`docs/project.md`**: what we build. Numbered sections: users, core flow (end-to-end steps that prove it works), stack, environments, plans or limits, features (one table each, with a "Done when" row), data model, API routes, security rules, repo layout, env vars, out of scope, design.
- **`docs/plan.md`**: phases in order. Rules at the top (phases are fixed; tasks live only in HQ; keep HQ's "Export plan to docs/plan.md" **off** or it overwrites this file). Phase 0 has one lane for setup. Every later phase has a goal, the keys it needs, two lanes (A and B, one per developer) in a table with the `project.md` sections each lane covers, and a "Done when".
- **`CLAUDE.md`** (Claude Code) / **`AGENTS.md`** (Codex): commands, how to work on a task, a **"How to talk to the product owner"** section (one question at a time, give a recommendation, short and plain, never ask what the docs answer), and a "Never" list.

---

## 6. What I'll give you, and what to return

**I'll give you:** the project, the team (names, who's lead, Claude Code or Codex for each), how work is checked (preview, demo, tests), and anything agents must never touch.

**Return:** one markdown block per role, ready to paste into Settings → Team. Lead first, then one developer role (and note if a developer needs something different). If anything in section 3 is unclear for my project, ask me before writing.
