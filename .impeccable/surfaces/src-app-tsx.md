---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: ["src/office/OfficeScene.ts"]
---

# Surface: JSM HQ main screen (office + HUD)

Superseded 2026-11-14: the "Cozy Night Studio" redesign contract was rejected by the user ("still bad… pixel was better"). The current pixel design stays. Work on this surface is now themes: a theme recolours the office and the HUD together and never changes layout or pixel art. Classic (current look) is the default; Night ships first; Auto follows the system light/dark setting with a manual override, saved per browser.
Constraints: WCAG AA in every theme; status never by colour alone; reduced motion respected; no new dependency.
