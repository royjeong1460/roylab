# Free30 mobile start screen

Approved: use the saved dusty-alley mobile design, after Figma MCP reached its limit. Latest user clarified the mobile version, not the desktop layout.

- Keep the compact portrait frame (maximum 390 CSS px for the start screen) and fill phone width.
- Use the existing procedural pixel alley without a character or character shadow (user correction on October 19), with a centered PLANET PATCHUP title, prominent Start, and Upgrade / Zones actions.
- Start retains current tutorial / first-upgrade routing. Zones contains the existing manual twin-peak boss entry; no automatic boss progression.
- Move existing stats, practice, and export into Options. Do not add nonfunctional sound controls or achievements.
- Home CSS/art is isolated from gameplay, physics, economy, saves, and touch-release input.
- Fit common portrait screens; short screens scroll instead of hiding actions. No animated home simulation.
- Verify navigation, return, boss dialog closure, onboarding, browser errors, and narrow layout before deploying to the existing Roylab free-demo URL.

## Correct mobile frame — October 19 follow-up

Reference: https://www.figma.com/design/dEvvNjaFdv03v2MvzaU88r?node-id=411-2
Frame name: PC 시작 / 연결된 1차 메뉴; actual canvas is 390 × 844.

User requested the background, title and button placement as well as removal of the character. The prior implementation used the older foreground-trash composition. Replaced it with the open central lane, muted distant skyline, smaller centered title, wide low Start button, current-zone row, and bordered secondary buttons. Existing Upgrade and Zones behavior is retained; no dummy Achievements control is introduced.

Figma MCP design-context and node-property reads remain rate limited. The frame was inspected through the browser; geometry is a visual match rather than an exact exported-node measurement. Background remains procedural code and the title is a local SVG, not a screenshot of the UI.
