# Contact Map Comparison Implementation Plan

**Goal:** Add Staggered Stack and Bridged Bodies to the existing destruction lab, preserving the three existing layout maps and released campaigns.

**Architecture:** Reuse YardKit art and authored body/roof roles. One-cell assembly gaps prevent grid welding; explicitly release unsupported pieces on these two lab maps so gravity settles them into independent contacts. Do not change structural strength, active-device values, or the shared physics solver.

**Tech Stack:** JavaScript, Phaser/Matter, Vite, node:test.

Approved design: retain column comparison; add offset bodies and a long body supported by two other bodies. New English names; existing map names unchanged.

- [x] Add failing contact-map tests: registration, independent upper bodies, stable initial contacts, and collapse after removing a support, with pixel conservation.
- [x] Add two map definitions in `src/ideas-lab/maps.js`, opt-in loose-body initialization in the lab world and configure path, and map picker copy.
- [x] Run ideas and structure regression tests; build only ideas; verify maps and device activation in browser.
- [ ] Copy ideas output, sync canonical routes, confirm other published editions unchanged, commit/push and verify public map picker.

Validation: 42 ideas tests, 17 structure tests, 5 root route tests passed. Initial stacks remain intact, independently contact and settle; removing a lower support moves upper bodies. Four devices complete on both maps with finite simulation and conserved pixels. Local desktop map picker and both rendered maps checked. Other 121 public edition files are byte-identical. Physical iPhone not checked.

Lab-only limitation: exported new-map JSON contains unconnected assembly gaps; the ordinary grounded-map editor does not yet import those assemblies. This does not affect existing map exports.
