# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A developer supervising a team of 2–5 AI coding agents (Claude Code or Codex) on one of their repos. HQ sits in a browser tab next to their editor for hours. They mostly glance at it, and act when someone needs them: answer an agent's question, allow a website, add a key, review or merge a PR. Desktop browsers, 1024 px and wider.

## Product Purpose

JSM HQ runs a team of AI agents on a repo, each in its own Docker Sandbox, and shows them working. One lead agent plans and assigns tasks; workers build, one task per branch and pull request. HQ tracks PRs on GitHub and collects everything waiting on the user in one place. Success: the user always knows who needs them, can act in a click or two, and trusts what the agents are doing without reading every terminal.

## Positioning

Agents are shown as a team in an office, not as rows in a log. The office is the navigation: desks are agents, the plan wall is the task board, the review gate and conveyor belt are pull requests, server racks are environments. It runs entirely on the user's machine, and HQ never merges or deploys for them.

## Operating Context

- Started with `npx @therealjsmastery/jsm-hq` inside a git repo; opens at `localhost:7420`.
- Surfaces: the office scene, top bar, team panel, activity feed, drawers (agent with live terminal and shell, Boards, PRs, Action items, Terminal, Environment), Settings (Project, Team, Workflow, Stack, MCP, Sandbox, Boards), setup checklist, welcome.
- Rituals: start the team, message the lead, watch tasks move, answer action items, merge PRs on GitHub.
- A demo mode (`pnpm dev`) runs the same UI on fake data.

## Capabilities and Constraints

- React 18 + Vite + Tailwind 4 for the UI; PixiJS 8 for the office scene; xterm.js terminals.
- Terminals are real: keystrokes reach running agents. Keyboard focus must never land in one by accident.
- Must work on macOS, Linux and Windows browsers; no new runtime dependency without approval.
- Redesign order (confirmed): UI (top bar, panels, drawers, settings, welcome) first in the new world, then the office scene redrawn in a second pass.

## Brand Commitments

- **Keep the current JSM HQ design** (binding, confirmed 2026-11-14 after two redesign rounds were rejected as "corporate" and "cheap"): the pixel-art office, its layout, the robot characters and the game-HUD panels stay as they are. "Pixel was better."
- Visual change comes through **themes** added to the package: a theme recolours the office and the HUD together; it never changes layout or the pixel art. Classic (today's look) is the default; Night ships first; more themes later.
- Theme choice: **Auto** follows the system light/dark setting, with a manual override (Classic / Night), saved per browser.
- Live movement stays: agents walk, parcels ride the belt, the camera flies to what you open.
- Playful, game-like charm. It must never become a generic SaaS dashboard.
- Name "JSM HQ"; default agent names come from The Office (Michael leads, then Dwight, Jim, Pam…). The JSM HQ name and logo are trademarks (TRADEMARKS.md).

## Evidence on Hand

- Screenshots of the current UI: `docs/images/office.png`, `docs/images/agent-drawer.png`.
- Critique of the current UI: `.impeccable/critique/` (23/40).
- No user research, testimonials or usage data; don't invent any.

## Product Principles

1. Who needs me comes first: urgent state is unmissable at a glance.
2. The office is the interface, not decoration: everything you can see you can open.
3. Real effects are explicit: anything that reaches an agent, a sandbox or the network is a clear, deliberate action.
4. The user stays in charge: HQ asks, the user decides; HQ never merges or deploys.
5. Charm never costs clarity.

## Accessibility & Inclusion

WCAG AA contrast for all text. Every action reachable by keyboard, with visible focus. No meaning by colour alone; no blinking for urgent state. Respect reduced motion.
