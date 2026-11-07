# Destruction midpoint comparison

User authorized changing all five proposed destruction traits to the midpoint between current0.5.52 values and the draft initial values. The clarification refers to the proposed initial values, not historical1→10 tuning or map size. Apply fixed defaults for a feel comparison; no purchasable upgrade system is introduced.

| Setting | Current | Draft initial | Apply now |
| --- | ---: | ---: | ---: |
| Non-fall speed response | 10 | 6 | 8 |
| Base cross-building chain coefficient | 10 | 6 | 8 |
| Internal fall severity start/full speed | 14 /32 | 18 /40 | 16 /36 |
| Fall internal bond resistance | 0.02 | 0.04 | 0.03 |
| Fall crack propagation factor | 3 | 2 | 2.5 |

Keep the minimum fall contact speed14 and its activation curve, ordinary collision start40, non-fall propagation3, chain eligibility/cooldowns/eight-stage rule, tilt assistance, body overflow, gravity, map geometry, tool/skill values, existing purchases/rewards and save paths. Internal fall severity becomes clamp((speed−16)/20,0,1). This separates local low-speed contact damage from deeper internal fracture. Current target caps in the upgrade plan remain the former0.5.52 values; these midpoint defaults are a temporary comparison, not a migration of owned upgrade levels.

## Execution

- [x] Preserve0.5.52 native project/app, registry, maps, relevant GDScript/C++ sources and hashes. Work on the isolated candidate branch and a new0.5.53(63) native QA tree.
- [x] Change only world.gd speed response/severity/fall propagation, chain_physics.gd base power, and the C++ fall crack resistance literal. Use direct constants at the current computation sites; no new gameplay framework or repeated per-pixel setting lookup.
- [x] Rebuild the affected native core for iOS/macOS/Web (and retained Android ABI libraries where available). Update shared source hashes, library paths and provenance. Keep dependency/API/compiler flags and the optimized g40 algorithms unchanged.
- [x] Compile/import/export native and local web, build/sign/update-install iPhone without launch. Validate constant values, unchanged44 maps/profile/economy/skill sources, built/exported library/PCK hashes and local web transport/decoded hashes.
- [x] Record the installed comparison and rollback to0.5.52. Public web is retained; user performs all FPS, loading, gameplay, save and feel checks. No game tests/scenes/simulations/browser/device apps are launched by the agent.
