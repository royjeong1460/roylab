# Free campaign: falling-body fracture

2026-10-27. User approved applying the local sensitive falling-body response to the free game while keeping current upgrade prices and increments.

## Integration

- `ArchRun` now constructs `FallArchWorld`, which reuses `SensitiveFallWorld` from the accepted local comparison without copying the algorithm.
- All free entries (tutorial, six normal maps, boss and preview runs through `ArchRun`) inherit the same response.
- Downward supporting collisions can chip contact pixels and propagate internal cracks, preserving multiple chunks. The sensitive settings are unchanged: min speed 14, activation span 10, crack start 14, crack span 18, bond resistance 0.02, wave scale 3, spread width 3. These are collision/model parameters, not a guarantee that every 10-cell fall fractures identically.
- Cross-structure chain assistance retains priority and its 10x default. Gravity, primary tool stats, costs, collection, maps, save schema and save keys are unchanged.
- Journals identify new runs as `arch-fall-sensitive-v1`, allowing later playtest comparisons with `arch-chain-v1`.
- The previous chain-only and local fall variants remain available. The two-hour balance proposal remains documentation only.

## Verification

- New integration test first failed on the previous free world, then passed after switching the constructor. Actual Arch Lane support damage now produces internal falling-body splits with finite motion and conserved pixels.
- Targeted chain/fall/integration tests: 28 pass. Arch campaign suite: 124 pass, including current working-tree debug tests. Legacy free suite: 66 pass. Base suite: 50 pass, input cases: 33 pass, configured legacy boss reachability fixture passes. Root route/locale tests: 5 pass.
- Free Vite and root webpack builds pass. Existing large Phaser chunk warning remains.
- Hash comparison preserves all 119 prior comparison files plus the exact Arch balance and map source files.
- Physical iPhone performance and player completion time still require playtesting. Automated fixture time is not human playtime.

Public destination: `https://roylab.pages.dev/planet-patchup/play/`. Final deployment verification is recorded separately in the task evidence; this document alone is not proof of deployment.
