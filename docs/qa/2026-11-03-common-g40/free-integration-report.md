# Free Godot g40 source integration

Date: 2026-11-03. Status: source merge and static source review complete. Compilation, import, export, native packaging, HTTP delivery and deployment belong to the parent release task and are not established by this report. No game, scene, test, simulation, replay, browser or device was run.

## Inputs and scope

- Free destination: `/Users/roy/Developer/sand/variants/free-web-g40-20261103/demos/planet-patchup/godot-free`.
- Frozen old common ancestor: `/Users/roy/Developer/sand/variants/godot-paid-port/qa/workshop-wallet-skip-2026-11-02/project`.
- Frozen new common source: `/Users/roy/Developer/sand/variants/godot-paid-port/qa/perf-g40-2026-11-03/project`.
- Free baseline was captured before this integration; its original script text and baseline file hash inventory were retained temporarily under `/tmp/free-g40-merge-original` for the three-way review. The durable before/after hashes are below.
- Only free `.gd` sources, the new diagnostics `.gd.uid`, `project.godot`, free-local README/AGENTS and this report were written by this integration. No builder, export preset, native source/library, free content file, primary checkout or Git commit was changed by this subtask.

## Merge decisions

- Fourteen changed common physics/render/probe wrappers match frozen g40 exactly, except `bearing_constraint.gd` has one terminal blank line removed so `git diff --check` passes. They use the same constructors and native helper calls as g40. All 11 instantiated/inherited `PP*` classes exist in the frozen native registration source.
- `world.gd` is frozen g40 with exactly the pre-existing free fallback path retained: `res://data/maps/arch-1-arch-quarter-v2.json` replaces paid `res://data/arch_lane.json`. All g40 roster journals, packed occupancy, native coordinate/selection helpers and lifecycle hooks remain present.
- `skill_physics.gd` uses a three-way merge. Four conflict blocks retained the free deletion of paid-only skill implementation. The g40 changes affecting Aftershock, Relay and Orbital remain: native near-piece selection, membership/ownership, spacing, structure material/bounds, columns and orbital-hit helper calls. PASSIVES remains `["aftershock", "relay"]`; ACTIVES remains `["orbital"]`; both slot limits remain one. No paid skill string identifier remains in this file. Existing skill powers, timing, unlimited upgrade behavior and free level/edition handling were retained.
- `app/screens.gd` merges the optional g40 five-tap diagnostic control while retaining all free region locks, workshop lists, feedback buttons, browser bridge checks and free edition text. Only the build and diagnostic labels were updated to 0.5.40/g40.
- New `platform/diagnostics.gd` is the g40 helper with one free-adapter change: its initial `_enabled` value reads `diagnostics/performance_overlay` (false in this project). A persisted explicit hidden-toggle preference may override that initial value. The same helper controls both HUD visibility and `PerformanceProbe`; the overlay is never forced on. Diagnostic preferences are separate from campaign profiles.
- Free storage/import/settings/analytics/browser bridge, catalog, profile schema, progression/journey, economy, localized text, audio and presentation adapters outside the three overlapping files remain byte-identical to the original free baseline.
- New paid `culture_ground.gd` and `culture_scrap_bank.gd` are omitted. Retained free `culture_backdrop.gd` does not reference them, and importing those paid-only environment helpers/assets is unnecessary for the shared g40 physics/render change.
- Project version is `0.5.40`; application name, Godot 4.6.2 configuration, custom user directory `PlanetPatchupGodotFreeWeb`, main scene, graphics/physics settings and diagnostic-default false are preserved. Native libraries and a matching Web GDExtension template are required and supplied by the parent task.
- README/AGENTS now explicitly supersede the obsolete v34 pin and keep the original free content/save/runtime-validation boundaries.

## Static source review evidence

- `git diff --check -- demos/planet-patchup/godot-free`: passed after removal of the one inherited terminal blank line.
- Read all updated source diffs and reviewed the free skill merge separately. No unresolved merge markers were found in the 55 final `.gd` scripts.
- Literal `preload("res://...")` and `load("res://...")` targets in free scripts all exist. This is a file-reference check, not runtime loading or import evidence.
- The 14 shared changed wrappers compare equal to g40 after terminal-newline normalization; `world.gd` compares exactly to g40 after the one documented fallback substitution.
- All 177 pre-existing files under `data/`, `assets/`, and `locales/` remain SHA-256 identical. No content file in these directories was added or removed by this subtask. Their per-file proof is below.
- Map source inventory remains exactly eight Arch JSON files: tutorial `arch-0` plus `arch-1` through `arch-7`. Other regions remain locked previews in the unchanged catalog/progression adapter. Packaged PCK allowlist verification remains the parent task.
- The g40 grain renderer remains `CHUNK_PIXELS := 32 * 4` with the frozen `PPRenderKernel.sync_grains` path; it has no free-specific chunk sizing or scheduling change.

## Script/config/document three-way SHA-256 proof

All values are full SHA-256 digests. `absent` means the file did not exist in that input. UID rows preserve file identity unless a new helper was added.

| Relative free path | Paid34 ancestor | Free before | Frozen g40 | Free after | Decision |
| --- | --- | --- | --- | --- | --- |
| `AGENTS.md` | `absent` | `e35d02e4d6574c4790a07e359a226abc0b084a2863cddb07c716809a80526c39` | `absent` | `679dbce864ba09aaa9ba731c9c170ff8ee05668b3e4e0ced569704202e933b84` | version or guidance update |
| `README.md` | `absent` | `a605115464ff074f00e83eb49cb119da927484dd7a161162334f1677c99f971e` | `absent` | `e57aef6e20d80705eef7daad9d37b5bb4fe540f7552d02cee4aa26c2844919c6` | version or guidance update |
| `app/app.gd` | `0d666453f475ac9b2f5a85886a6a3714809e517ee6e10f3d1375d8b423acd672` | `a37dba3b8bff4a944d6d4ee56bf7d66dea3b153513adb8b96b9c7351d2945af8` | `0d666453f475ac9b2f5a85886a6a3714809e517ee6e10f3d1375d8b423acd672` | `a37dba3b8bff4a944d6d4ee56bf7d66dea3b153513adb8b96b9c7351d2945af8` | retained free |
| `app/app.gd.uid` | `39815e8d48cba6643c4c3fbbf03ab5e99952f0cbb977e0810ae86ba880a02591` | `39815e8d48cba6643c4c3fbbf03ab5e99952f0cbb977e0810ae86ba880a02591` | `39815e8d48cba6643c4c3fbbf03ab5e99952f0cbb977e0810ae86ba880a02591` | `39815e8d48cba6643c4c3fbbf03ab5e99952f0cbb977e0810ae86ba880a02591` | retained free |
| `app/chain_feedback.gd` | `08d4b0be46831a467606d5c30576e59d0e396bff15951cfc5ea10bea6bef25fe` | `08d4b0be46831a467606d5c30576e59d0e396bff15951cfc5ea10bea6bef25fe` | `08d4b0be46831a467606d5c30576e59d0e396bff15951cfc5ea10bea6bef25fe` | `08d4b0be46831a467606d5c30576e59d0e396bff15951cfc5ea10bea6bef25fe` | retained free |
| `app/chain_feedback.gd.uid` | `f1edfeaafb05f774f1cf0919a867f44d4162abd1d811665721619558fb9b5ed3` | `f1edfeaafb05f774f1cf0919a867f44d4162abd1d811665721619558fb9b5ed3` | `f1edfeaafb05f774f1cf0919a867f44d4162abd1d811665721619558fb9b5ed3` | `f1edfeaafb05f774f1cf0919a867f44d4162abd1d811665721619558fb9b5ed3` | retained free |
| `app/localization.gd` | `93001bdcc8cef182ae9f9b9fca47e3eb6f863e8aba922adda0e0f6d22c4f9239` | `12c04c09f44e1d50ff9b8412da5a4c285c7bcac7041ed34e260f0df30b9d139f` | `93001bdcc8cef182ae9f9b9fca47e3eb6f863e8aba922adda0e0f6d22c4f9239` | `12c04c09f44e1d50ff9b8412da5a4c285c7bcac7041ed34e260f0df30b9d139f` | retained free |
| `app/localization.gd.uid` | `feefb6ee76143af2aedf60102f7d4b274cc8b11bcb3eadb0343ef6ef4e93b576` | `feefb6ee76143af2aedf60102f7d4b274cc8b11bcb3eadb0343ef6ef4e93b576` | `feefb6ee76143af2aedf60102f7d4b274cc8b11bcb3eadb0343ef6ef4e93b576` | `feefb6ee76143af2aedf60102f7d4b274cc8b11bcb3eadb0343ef6ef4e93b576` | retained free |
| `app/offer_popup.gd` | `14f9c84c767561482d641ea66fb7d4207b1ba077e3f77fac9c7fadd0e97457ef` | `14f9c84c767561482d641ea66fb7d4207b1ba077e3f77fac9c7fadd0e97457ef` | `14f9c84c767561482d641ea66fb7d4207b1ba077e3f77fac9c7fadd0e97457ef` | `14f9c84c767561482d641ea66fb7d4207b1ba077e3f77fac9c7fadd0e97457ef` | retained free |
| `app/offer_popup.gd.uid` | `9f94b0ecd6d337f09ac4a927c674ac37df757941bcc277a9f19dd559eda16b5c` | `9f94b0ecd6d337f09ac4a927c674ac37df757941bcc277a9f19dd559eda16b5c` | `9f94b0ecd6d337f09ac4a927c674ac37df757941bcc277a9f19dd559eda16b5c` | `9f94b0ecd6d337f09ac4a927c674ac37df757941bcc277a9f19dd559eda16b5c` | retained free |
| `app/play_camera.gd` | `579c751aac4d05f383463171c6b57490953228828520d2b6d4afcddd4346483c` | `579c751aac4d05f383463171c6b57490953228828520d2b6d4afcddd4346483c` | `579c751aac4d05f383463171c6b57490953228828520d2b6d4afcddd4346483c` | `579c751aac4d05f383463171c6b57490953228828520d2b6d4afcddd4346483c` | retained free |
| `app/play_camera.gd.uid` | `5ed5d470c9ae42860339a61f0afecf08297e062f99196355dbaabe17555ce07c` | `5ed5d470c9ae42860339a61f0afecf08297e062f99196355dbaabe17555ce07c` | `5ed5d470c9ae42860339a61f0afecf08297e062f99196355dbaabe17555ce07c` | `5ed5d470c9ae42860339a61f0afecf08297e062f99196355dbaabe17555ce07c` | retained free |
| `app/play_input.gd` | `10ff1519028e515404c685161ad77c08bc63c83488402b52509ce53146987ee7` | `10ff1519028e515404c685161ad77c08bc63c83488402b52509ce53146987ee7` | `10ff1519028e515404c685161ad77c08bc63c83488402b52509ce53146987ee7` | `10ff1519028e515404c685161ad77c08bc63c83488402b52509ce53146987ee7` | retained free |
| `app/play_input.gd.uid` | `dc6889617713eb8889b64ba83f52fa67a8aee4587e19768610686e21bc96dd74` | `dc6889617713eb8889b64ba83f52fa67a8aee4587e19768610686e21bc96dd74` | `dc6889617713eb8889b64ba83f52fa67a8aee4587e19768610686e21bc96dd74` | `dc6889617713eb8889b64ba83f52fa67a8aee4587e19768610686e21bc96dd74` | retained free |
| `app/play_layout.gd` | `3f14891b5d89914f243b29f7abfb6e075e525d6cbd6b61853f75407f53f85fa0` | `3f14891b5d89914f243b29f7abfb6e075e525d6cbd6b61853f75407f53f85fa0` | `3f14891b5d89914f243b29f7abfb6e075e525d6cbd6b61853f75407f53f85fa0` | `3f14891b5d89914f243b29f7abfb6e075e525d6cbd6b61853f75407f53f85fa0` | retained free |
| `app/play_layout.gd.uid` | `5d0b7f05722d9bb17da57a3e9a5ae1a4b1c04f3ddc826e8fb76d5c2fce602a52` | `5d0b7f05722d9bb17da57a3e9a5ae1a4b1c04f3ddc826e8fb76d5c2fce602a52` | `5d0b7f05722d9bb17da57a3e9a5ae1a4b1c04f3ddc826e8fb76d5c2fce602a52` | `5d0b7f05722d9bb17da57a3e9a5ae1a4b1c04f3ddc826e8fb76d5c2fce602a52` | retained free |
| `app/play_view.gd` | `aca3764f5e4ce9e7e98b4b8434a2bad6fa3f294a714c05ca8f59b360f3f296e0` | `2310675bd1ce3fdd51738a39c7014c570b6949c19878d177f36d175c48c6a80c` | `aca3764f5e4ce9e7e98b4b8434a2bad6fa3f294a714c05ca8f59b360f3f296e0` | `2310675bd1ce3fdd51738a39c7014c570b6949c19878d177f36d175c48c6a80c` | retained free |
| `app/play_view.gd.uid` | `13f36529404b67fed6d08afb296521bff6aea5e7747d4c92e90b5d5b57afd528` | `13f36529404b67fed6d08afb296521bff6aea5e7747d4c92e90b5d5b57afd528` | `13f36529404b67fed6d08afb296521bff6aea5e7747d4c92e90b5d5b57afd528` | `13f36529404b67fed6d08afb296521bff6aea5e7747d4c92e90b5d5b57afd528` | retained free |
| `app/screens.gd` | `190c8dfddb052f9c6f5b49b7b7fe05f39697970a5d527d9c3bdd1c6d75f17a1c` | `890d4ab71db064d8ab0b30c0211ba8eb3b296ffba394bcee4de00dc39e267143` | `7adb9a0ac8fa8e4ea8b2646942d49c1fa2f4ffc124f5301535e5cbccc6e24ec8` | `f053466e12ac5b1cada0766bc73a78fad9274d4ad938c8402f735715c6b717fa` | three-way free adapter; see above |
| `app/screens.gd.uid` | `400631c67fc583852a8a7e018487199d3f934acc631fec0fa086b6b238c1d6f9` | `400631c67fc583852a8a7e018487199d3f934acc631fec0fa086b6b238c1d6f9` | `400631c67fc583852a8a7e018487199d3f934acc631fec0fa086b6b238c1d6f9` | `400631c67fc583852a8a7e018487199d3f934acc631fec0fa086b6b238c1d6f9` | retained free |
| `app/skin.gd` | `d53a203bd7fe8d2b38c6db92508ede1f71b0806ed65be5715cceaae29873bbae` | `e7327cb8927f9c4698927d68b65c8238e37829a177303819f171bff5dd35b744` | `d53a203bd7fe8d2b38c6db92508ede1f71b0806ed65be5715cceaae29873bbae` | `e7327cb8927f9c4698927d68b65c8238e37829a177303819f171bff5dd35b744` | retained free |
| `app/skin.gd.uid` | `c1a3162ee7c7b4668dcaca8ca2b34912219f600455b536fb8f8aaf37bada1efc` | `c1a3162ee7c7b4668dcaca8ca2b34912219f600455b536fb8f8aaf37bada1efc` | `c1a3162ee7c7b4668dcaca8ca2b34912219f600455b536fb8f8aaf37bada1efc` | `c1a3162ee7c7b4668dcaca8ca2b34912219f600455b536fb8f8aaf37bada1efc` | retained free |
| `app/ui_theme.gd` | `0caa4ae41aeae777c3d184a7255d5b262f046d32d0742b29e4c75ac3f4f85544` | `0caa4ae41aeae777c3d184a7255d5b262f046d32d0742b29e4c75ac3f4f85544` | `0caa4ae41aeae777c3d184a7255d5b262f046d32d0742b29e4c75ac3f4f85544` | `0caa4ae41aeae777c3d184a7255d5b262f046d32d0742b29e4c75ac3f4f85544` | retained free |
| `app/ui_theme.gd.uid` | `177b5a357b62abfc1900204c615480657c8bcf2f412cb5bf27d271f7b1926933` | `177b5a357b62abfc1900204c615480657c8bcf2f412cb5bf27d271f7b1926933` | `177b5a357b62abfc1900204c615480657c8bcf2f412cb5bf27d271f7b1926933` | `177b5a357b62abfc1900204c615480657c8bcf2f412cb5bf27d271f7b1926933` | retained free |
| `background.gd` | `12160e31ca1bca5dfaabbcc69cd1d7daf2fbe8628d17f26a54e75e0187ca7d23` | `12160e31ca1bca5dfaabbcc69cd1d7daf2fbe8628d17f26a54e75e0187ca7d23` | `12160e31ca1bca5dfaabbcc69cd1d7daf2fbe8628d17f26a54e75e0187ca7d23` | `12160e31ca1bca5dfaabbcc69cd1d7daf2fbe8628d17f26a54e75e0187ca7d23` | retained free |
| `background.gd.uid` | `5b9c17a98868c0a152b96002cfd2bc709cb6f9962e8fa7d5a3758676933ba3f3` | `5b9c17a98868c0a152b96002cfd2bc709cb6f9962e8fa7d5a3758676933ba3f3` | `5b9c17a98868c0a152b96002cfd2bc709cb6f9962e8fa7d5a3758676933ba3f3` | `5b9c17a98868c0a152b96002cfd2bc709cb6f9962e8fa7d5a3758676933ba3f3` | retained free |
| `bearing_constraint.gd` | `3b96a172ab8d41421d392ffff2a3234925c9d7e799aa7a34a048acb5a32de403` | `3b96a172ab8d41421d392ffff2a3234925c9d7e799aa7a34a048acb5a32de403` | `ee6fb829313fc69ec0ef584871535833ea623852be36a197b67f12fb950c6bcd` | `d3327b844c57761c97f0ccc8ab0c787b2a17c11fd153134bd31d27d4c7aa3d50` | g40; terminal blank line removed |
| `bearing_constraint.gd.uid` | `33c3509522e0cde748c032eeda3b9db66c376e3f10f23c3920b6bd3320efb37e` | `33c3509522e0cde748c032eeda3b9db66c376e3f10f23c3920b6bd3320efb37e` | `33c3509522e0cde748c032eeda3b9db66c376e3f10f23c3920b6bd3320efb37e` | `33c3509522e0cde748c032eeda3b9db66c376e3f10f23c3920b6bd3320efb37e` | retained free |
| `blackhole_physics.gd` | `472c3b99f25f65f891619886441d88999289e72f3c081688393abb68cb7876a8` | `472c3b99f25f65f891619886441d88999289e72f3c081688393abb68cb7876a8` | `40a4bc3fd85fe54a16d68dc5a4da9003661e51bcd288c787fe2753a684339a32` | `40a4bc3fd85fe54a16d68dc5a4da9003661e51bcd288c787fe2753a684339a32` | exact g40 |
| `blackhole_physics.gd.uid` | `90bc33ddab53f3a37a06a274e72de9e28950dddeca4bf91a23443d28393dc884` | `90bc33ddab53f3a37a06a274e72de9e28950dddeca4bf91a23443d28393dc884` | `90bc33ddab53f3a37a06a274e72de9e28950dddeca4bf91a23443d28393dc884` | `90bc33ddab53f3a37a06a274e72de9e28950dddeca4bf91a23443d28393dc884` | retained free |
| `campaign/catalog.gd` | `463c0a1bfd7871bb1f4f1913cd4ab0c38676646d2b55638aa0a858733bb0e772` | `3239a2454b64b8f1e2f231ca8639158de2174e1bf2e6185df08349bc9917c53b` | `463c0a1bfd7871bb1f4f1913cd4ab0c38676646d2b55638aa0a858733bb0e772` | `3239a2454b64b8f1e2f231ca8639158de2174e1bf2e6185df08349bc9917c53b` | retained free |
| `campaign/catalog.gd.uid` | `e62b0a2b3af72f21289e3dc7dd3cdbc1609cf00322c5e1eb8f4eafc49e79d379` | `e62b0a2b3af72f21289e3dc7dd3cdbc1609cf00322c5e1eb8f4eafc49e79d379` | `e62b0a2b3af72f21289e3dc7dd3cdbc1609cf00322c5e1eb8f4eafc49e79d379` | `e62b0a2b3af72f21289e3dc7dd3cdbc1609cf00322c5e1eb8f4eafc49e79d379` | retained free |
| `campaign/economy.gd` | `6586c95c097b3c068423b85c7ef719511785ae036595e7014fca112e96ab42f0` | `7f0a8334f0ebfc850d30be1ef1d863eb7d3c5ae8000fa7939a154c64d2a9afc2` | `6586c95c097b3c068423b85c7ef719511785ae036595e7014fca112e96ab42f0` | `7f0a8334f0ebfc850d30be1ef1d863eb7d3c5ae8000fa7939a154c64d2a9afc2` | retained free |
| `campaign/economy.gd.uid` | `4d880e866206a0532f62e888078fb0c8e8b05194ac25c7556922ad7df440ed1b` | `4d880e866206a0532f62e888078fb0c8e8b05194ac25c7556922ad7df440ed1b` | `4d880e866206a0532f62e888078fb0c8e8b05194ac25c7556922ad7df440ed1b` | `4d880e866206a0532f62e888078fb0c8e8b05194ac25c7556922ad7df440ed1b` | retained free |
| `campaign/final_collection.gd` | `4b7c5d49aaf8a91d3cb3cd2d26d653adada1c23cba092792ea4aefb35300963a` | `4b7c5d49aaf8a91d3cb3cd2d26d653adada1c23cba092792ea4aefb35300963a` | `51ca937ac8e91cd806db0c173b54e3fd6eb2d70c2ea384085e1fc3801ad11128` | `51ca937ac8e91cd806db0c173b54e3fd6eb2d70c2ea384085e1fc3801ad11128` | exact g40 |
| `campaign/final_collection.gd.uid` | `f29f247e89876a930f70452664eca5f303756afe184393ec5ba6a5c529e3d720` | `f29f247e89876a930f70452664eca5f303756afe184393ec5ba6a5c529e3d720` | `f29f247e89876a930f70452664eca5f303756afe184393ec5ba6a5c529e3d720` | `f29f247e89876a930f70452664eca5f303756afe184393ec5ba6a5c529e3d720` | retained free |
| `campaign/free_edition.gd` | `absent` | `060c1f1f7a41403c9dafbda49a6d101a631156137efb3a1de66ba7988bc5273b` | `absent` | `060c1f1f7a41403c9dafbda49a6d101a631156137efb3a1de66ba7988bc5273b` | retained free |
| `campaign/free_edition.gd.uid` | `absent` | `a1469545f71ba387547b975fdfa98657ca657c3590bfdcf58310119b9b63b58e` | `absent` | `a1469545f71ba387547b975fdfa98657ca657c3590bfdcf58310119b9b63b58e` | retained free |
| `campaign/journey.gd` | `9235c033a2b604cc34e47535de84da1f21c113fa0dd51e7fcd6b72af663c9263` | `3c72842eb62aecccee4c6f6db98cff79314cc9d08fcccf69475add51e9a00f75` | `9235c033a2b604cc34e47535de84da1f21c113fa0dd51e7fcd6b72af663c9263` | `3c72842eb62aecccee4c6f6db98cff79314cc9d08fcccf69475add51e9a00f75` | retained free |
| `campaign/journey.gd.uid` | `e69a6cb4b07ce98da7f74e277d13280965d790285a90dba0e5bbef33ddf229aa` | `e69a6cb4b07ce98da7f74e277d13280965d790285a90dba0e5bbef33ddf229aa` | `e69a6cb4b07ce98da7f74e277d13280965d790285a90dba0e5bbef33ddf229aa` | `e69a6cb4b07ce98da7f74e277d13280965d790285a90dba0e5bbef33ddf229aa` | retained free |
| `campaign/money.gd` | `89c45b9fd76c7b8b07d5ff452af1b4c579ca9803ddcfc585acaa7fc09d9b7d33` | `89c45b9fd76c7b8b07d5ff452af1b4c579ca9803ddcfc585acaa7fc09d9b7d33` | `89c45b9fd76c7b8b07d5ff452af1b4c579ca9803ddcfc585acaa7fc09d9b7d33` | `89c45b9fd76c7b8b07d5ff452af1b4c579ca9803ddcfc585acaa7fc09d9b7d33` | retained free |
| `campaign/money.gd.uid` | `0608cbec9897312d5ef4ec8145102072e0d640db6966b8b49ea96c0ff7684677` | `0608cbec9897312d5ef4ec8145102072e0d640db6966b8b49ea96c0ff7684677` | `0608cbec9897312d5ef4ec8145102072e0d640db6966b8b49ea96c0ff7684677` | `0608cbec9897312d5ef4ec8145102072e0d640db6966b8b49ea96c0ff7684677` | retained free |
| `campaign/profile_schema.gd` | `f36e7cccaaaf02f98af12816d85611d213d0fef328ae0fa74c7d3750b92c4b48` | `6e2a41bcc6760a1fe20f21999e900b4bb0bfad61f5304aff60968eb32c573a42` | `f36e7cccaaaf02f98af12816d85611d213d0fef328ae0fa74c7d3750b92c4b48` | `6e2a41bcc6760a1fe20f21999e900b4bb0bfad61f5304aff60968eb32c573a42` | retained free |
| `campaign/profile_schema.gd.uid` | `da05ac8a6172e99e2a0fd3c2c582e0e8688ced197a0d6c6926e73add03959657` | `da05ac8a6172e99e2a0fd3c2c582e0e8688ced197a0d6c6926e73add03959657` | `da05ac8a6172e99e2a0fd3c2c582e0e8688ced197a0d6c6926e73add03959657` | `da05ac8a6172e99e2a0fd3c2c582e0e8688ced197a0d6c6926e73add03959657` | retained free |
| `campaign/profile_store.gd` | `60502ca5e0b6ce824758130a80921964f957347526d2fd7f289f9f1e3851f89a` | `3aa1d1e7c3c5a3200f97c757016d1a2c955a8958d2ae07d7cd669b34f93352a5` | `60502ca5e0b6ce824758130a80921964f957347526d2fd7f289f9f1e3851f89a` | `3aa1d1e7c3c5a3200f97c757016d1a2c955a8958d2ae07d7cd669b34f93352a5` | retained free |
| `campaign/profile_store.gd.uid` | `8ea51633c3eac160da3d74dc1b0eb4813c8d93ba4214bfb1075ce837acd76c56` | `8ea51633c3eac160da3d74dc1b0eb4813c8d93ba4214bfb1075ce837acd76c56` | `8ea51633c3eac160da3d74dc1b0eb4813c8d93ba4214bfb1075ce837acd76c56` | `8ea51633c3eac160da3d74dc1b0eb4813c8d93ba4214bfb1075ce837acd76c56` | retained free |
| `campaign/progression.gd` | `eb98ac9f05514a446958cf454fff1a46b8065454e76f54740b11c2e36c82d19c` | `30be1bb3c4494fed1618fa2ee0c4f5dd9ea3fd0e0975ed517683f5d086a7a997` | `eb98ac9f05514a446958cf454fff1a46b8065454e76f54740b11c2e36c82d19c` | `30be1bb3c4494fed1618fa2ee0c4f5dd9ea3fd0e0975ed517683f5d086a7a997` | retained free |
| `campaign/progression.gd.uid` | `902fe04f526fe79056ee6a85deda55033f6888975e6dde3be47d02af0aa2fd9a` | `902fe04f526fe79056ee6a85deda55033f6888975e6dde3be47d02af0aa2fd9a` | `902fe04f526fe79056ee6a85deda55033f6888975e6dde3be47d02af0aa2fd9a` | `902fe04f526fe79056ee6a85deda55033f6888975e6dde3be47d02af0aa2fd9a` | retained free |
| `campaign/run_journal.gd` | `c07ee520b4fd533b4fa9e00d41338d27dd75060c36afd8807d2a2e8566e3c4cd` | `9d5f5f71017f6e53851281a7a508234539838b92ef78cab694ff7525f8a89e05` | `c07ee520b4fd533b4fa9e00d41338d27dd75060c36afd8807d2a2e8566e3c4cd` | `9d5f5f71017f6e53851281a7a508234539838b92ef78cab694ff7525f8a89e05` | retained free |
| `campaign/run_journal.gd.uid` | `acc9dc71e79a6c930dde61f0f0df2df7cc93059f9d72d8e7b02507043b7d41d5` | `acc9dc71e79a6c930dde61f0f0df2df7cc93059f9d72d8e7b02507043b7d41d5` | `acc9dc71e79a6c930dde61f0f0df2df7cc93059f9d72d8e7b02507043b7d41d5` | `acc9dc71e79a6c930dde61f0f0df2df7cc93059f9d72d8e7b02507043b7d41d5` | retained free |
| `campaign/run_session.gd` | `0025384f3c3d53b0681a3bebbd5ad891b544c085271ac4b384f920273ac7c2d4` | `82e1c66944cf2a086c0f58e3e5fd8c802b73a995e3a161609707deac73dac16f` | `0025384f3c3d53b0681a3bebbd5ad891b544c085271ac4b384f920273ac7c2d4` | `82e1c66944cf2a086c0f58e3e5fd8c802b73a995e3a161609707deac73dac16f` | retained free |
| `campaign/run_session.gd.uid` | `0ff333f656958f6581cc065929ec432a56f9a2cb72ff511242c1c58cfb124a89` | `0ff333f656958f6581cc065929ec432a56f9a2cb72ff511242c1c58cfb124a89` | `0ff333f656958f6581cc065929ec432a56f9a2cb72ff511242c1c58cfb124a89` | `0ff333f656958f6581cc065929ec432a56f9a2cb72ff511242c1c58cfb124a89` | retained free |
| `campaign/tutorial.gd` | `6bdb5810fd2fe5d54547b8ec83ab1d40355fee39964cdea29e2bf4f0b919a228` | `6bdb5810fd2fe5d54547b8ec83ab1d40355fee39964cdea29e2bf4f0b919a228` | `6bdb5810fd2fe5d54547b8ec83ab1d40355fee39964cdea29e2bf4f0b919a228` | `6bdb5810fd2fe5d54547b8ec83ab1d40355fee39964cdea29e2bf4f0b919a228` | retained free |
| `campaign/tutorial.gd.uid` | `82880b380d6dd06f939f4e9ed83705e1e0b429baf1f940a5b08f5a00adbc73b5` | `82880b380d6dd06f939f4e9ed83705e1e0b429baf1f940a5b08f5a00adbc73b5` | `82880b380d6dd06f939f4e9ed83705e1e0b429baf1f940a5b08f5a00adbc73b5` | `82880b380d6dd06f939f4e9ed83705e1e0b429baf1f940a5b08f5a00adbc73b5` | retained free |
| `chain_physics.gd` | `563fba377de3a7a69f020f90aa5b8896ab1818b935e0773246b6c7f9b0de4513` | `563fba377de3a7a69f020f90aa5b8896ab1818b935e0773246b6c7f9b0de4513` | `2443d3282a6ab09177412771dff9080b5dcb36ee59f9719d80e2c578cbed2150` | `2443d3282a6ab09177412771dff9080b5dcb36ee59f9719d80e2c578cbed2150` | exact g40 |
| `chain_physics.gd.uid` | `2688b9041175f675408f150aa1dc4d465cec93e059a6bef5afb094ecdc507964` | `2688b9041175f675408f150aa1dc4d465cec93e059a6bef5afb094ecdc507964` | `2688b9041175f675408f150aa1dc4d465cec93e059a6bef5afb094ecdc507964` | `2688b9041175f675408f150aa1dc4d465cec93e059a6bef5afb094ecdc507964` | retained free |
| `fracture_connectivity.gd` | `6749bde3dc14fd96093cd049648e84765e5ff3b5449e95b1da61ca232c8698cb` | `6749bde3dc14fd96093cd049648e84765e5ff3b5449e95b1da61ca232c8698cb` | `cbfc04d405139238196099f4d6bce9f4414324477069461dd751d8ef37cf0b91` | `cbfc04d405139238196099f4d6bce9f4414324477069461dd751d8ef37cf0b91` | exact g40 |
| `fracture_connectivity.gd.uid` | `54b3d3dc54fcdca0c8356768b0360095d297c39809dbaef5d5af267f4d2d7224` | `54b3d3dc54fcdca0c8356768b0360095d297c39809dbaef5d5af267f4d2d7224` | `54b3d3dc54fcdca0c8356768b0360095d297c39809dbaef5d5af267f4d2d7224` | `54b3d3dc54fcdca0c8356768b0360095d297c39809dbaef5d5af267f4d2d7224` | retained free |
| `fracture_graph.gd` | `22120cffeeee299a18169b775b0c9dee5af76f901dff23217b79eaf203733b48` | `22120cffeeee299a18169b775b0c9dee5af76f901dff23217b79eaf203733b48` | `e7d6237a710ef455a0708131b2657984c013cffe6321b7a2a6378f4ef629dfda` | `e7d6237a710ef455a0708131b2657984c013cffe6321b7a2a6378f4ef629dfda` | exact g40 |
| `fracture_graph.gd.uid` | `605eb795cb2e703cc3cead724903e1eadae4f037c92b984669b8da849582cc96` | `605eb795cb2e703cc3cead724903e1eadae4f037c92b984669b8da849582cc96` | `605eb795cb2e703cc3cead724903e1eadae4f037c92b984669b8da849582cc96` | `605eb795cb2e703cc3cead724903e1eadae4f037c92b984669b8da849582cc96` | retained free |
| `grain_physics.gd` | `ec801795f82eaba14e34aa917b05385dec15d327528314e24054b54e167c3eab` | `ec801795f82eaba14e34aa917b05385dec15d327528314e24054b54e167c3eab` | `6581c966da749ca525ac3675d033a6a6c2d3ca9b26b512d91274231c316e4fe3` | `6581c966da749ca525ac3675d033a6a6c2d3ca9b26b512d91274231c316e4fe3` | exact g40 |
| `grain_physics.gd.uid` | `4532093fdd08e8217267f30e310cc66c668ddc1c09605e25bc49a9279483611e` | `4532093fdd08e8217267f30e310cc66c668ddc1c09605e25bc49a9279483611e` | `4532093fdd08e8217267f30e310cc66c668ddc1c09605e25bc49a9279483611e` | `4532093fdd08e8217267f30e310cc66c668ddc1c09605e25bc49a9279483611e` | retained free |
| `impact_physics.gd` | `4fb8a35a244e0ff4a9d2b81ec23a1b65972dfc541187b827e9f362a254d06718` | `4fb8a35a244e0ff4a9d2b81ec23a1b65972dfc541187b827e9f362a254d06718` | `92165c7921602e5ff8efb6191db212ade5d0fcdc4ab2b12e55b962a88b0d0d5b` | `92165c7921602e5ff8efb6191db212ade5d0fcdc4ab2b12e55b962a88b0d0d5b` | exact g40 |
| `impact_physics.gd.uid` | `7fad48ab2f0f463b8def0586fb770d60b771e2ea2664220f6d5d0b62891eadab` | `7fad48ab2f0f463b8def0586fb770d60b771e2ea2664220f6d5d0b62891eadab` | `7fad48ab2f0f463b8def0586fb770d60b771e2ea2664220f6d5d0b62891eadab` | `7fad48ab2f0f463b8def0586fb770d60b771e2ea2664220f6d5d0b62891eadab` | retained free |
| `performance_probe.gd` | `d5cac6f0e732de58437c08cecafa39a21ebf69564867aeb1b29d9e195789a45b` | `d5cac6f0e732de58437c08cecafa39a21ebf69564867aeb1b29d9e195789a45b` | `17e64d7c2c37a436bd42937164eade301a77cd1f13b02384d766b963df27e4b7` | `17e64d7c2c37a436bd42937164eade301a77cd1f13b02384d766b963df27e4b7` | exact g40 |
| `performance_probe.gd.uid` | `34757715d6f80f189e9ad622668141e82c467ef37bdc9db9815f90e5698187b3` | `34757715d6f80f189e9ad622668141e82c467ef37bdc9db9815f90e5698187b3` | `34757715d6f80f189e9ad622668141e82c467ef37bdc9db9815f90e5698187b3` | `34757715d6f80f189e9ad622668141e82c467ef37bdc9db9815f90e5698187b3` | retained free |
| `piece.gd` | `38cf9e51dbd5991c8c480f53d3519087382054eb52ec0396a6ec70ccaad45f4b` | `38cf9e51dbd5991c8c480f53d3519087382054eb52ec0396a6ec70ccaad45f4b` | `c3ad8288a665ffd576eebb9c4d80f11ebb9fb5cbfffe0b1dfa5f8b0837efc24f` | `c3ad8288a665ffd576eebb9c4d80f11ebb9fb5cbfffe0b1dfa5f8b0837efc24f` | exact g40 |
| `piece.gd.uid` | `0b47654f1f9d672f1635e5715ba6f294966feb38e70e1622ee82f18df79a6483` | `0b47654f1f9d672f1635e5715ba6f294966feb38e70e1622ee82f18df79a6483` | `0b47654f1f9d672f1635e5715ba6f294966feb38e70e1622ee82f18df79a6483` | `0b47654f1f9d672f1635e5715ba6f294966feb38e70e1622ee82f18df79a6483` | retained free |
| `platform/diagnostics.gd` | `absent` | `absent` | `8873f6144afdd9a2e16a57f754c05f33ca9dc2b42c64c860432530bf4dc95ab9` | `8c26e851c2e3c3b807fc4e7779f1b4ba30de9c91e48878250710a2c566422b42` | g40; project-flag default |
| `platform/diagnostics.gd.uid` | `absent` | `absent` | `86429cfe64b01584efc139e5f401d5f87d34e3cb4a81f7dba1128dab06ea4716` | `86429cfe64b01584efc139e5f401d5f87d34e3cb4a81f7dba1128dab06ea4716` | exact g40 |
| `platform/export_report.gd` | `61da836edaf881d0a677e4a21f5b4f6ca05bcc8f1b45295466bd9078648592dd` | `61da836edaf881d0a677e4a21f5b4f6ca05bcc8f1b45295466bd9078648592dd` | `61da836edaf881d0a677e4a21f5b4f6ca05bcc8f1b45295466bd9078648592dd` | `61da836edaf881d0a677e4a21f5b4f6ca05bcc8f1b45295466bd9078648592dd` | retained free |
| `platform/export_report.gd.uid` | `b26f90be821ecd2b63c2947a4f1a50f95703a4a0a3ef290cb45d72ff25c87192` | `b26f90be821ecd2b63c2947a4f1a50f95703a4a0a3ef290cb45d72ff25c87192` | `b26f90be821ecd2b63c2947a4f1a50f95703a4a0a3ef290cb45d72ff25c87192` | `b26f90be821ecd2b63c2947a4f1a50f95703a4a0a3ef290cb45d72ff25c87192` | retained free |
| `platform/free_web_bridge.gd` | `absent` | `f51df2b82bdf0a373f57a5dfc5b568d4e08dac47ce1a0eecfba784a3e68cbf6f` | `absent` | `f51df2b82bdf0a373f57a5dfc5b568d4e08dac47ce1a0eecfba784a3e68cbf6f` | retained free |
| `platform/free_web_bridge.gd.uid` | `absent` | `ae9c4eddb968a977a9fc399bda8ef55cb3649fdece5c2c5e161e1d38fe15171f` | `absent` | `ae9c4eddb968a977a9fc399bda8ef55cb3649fdece5c2c5e161e1d38fe15171f` | retained free |
| `platform/haptics.gd` | `af273d380e1292f908e72d4881abcfdbc51f6bdcac13cf8894991e40ae8bca9c` | `af273d380e1292f908e72d4881abcfdbc51f6bdcac13cf8894991e40ae8bca9c` | `af273d380e1292f908e72d4881abcfdbc51f6bdcac13cf8894991e40ae8bca9c` | `af273d380e1292f908e72d4881abcfdbc51f6bdcac13cf8894991e40ae8bca9c` | retained free |
| `platform/haptics.gd.uid` | `6b12ec8c7f8d45bedcdd795940d2d5054064788119e65a948deba78c1580a43b` | `6b12ec8c7f8d45bedcdd795940d2d5054064788119e65a948deba78c1580a43b` | `6b12ec8c7f8d45bedcdd795940d2d5054064788119e65a948deba78c1580a43b` | `6b12ec8c7f8d45bedcdd795940d2d5054064788119e65a948deba78c1580a43b` | retained free |
| `platform/import_export.gd` | `2ec39cad09dc5ebfe8415fe40695d6cbc6ef30172782d534ae0fe548d393eb0f` | `b62f03430f29eaec45efaba7166b588f25b5a01c7f25aa3eda8decb537ce1323` | `2ec39cad09dc5ebfe8415fe40695d6cbc6ef30172782d534ae0fe548d393eb0f` | `b62f03430f29eaec45efaba7166b588f25b5a01c7f25aa3eda8decb537ce1323` | retained free |
| `platform/import_export.gd.uid` | `6f6a0bf78787e14c2871f9a46b8cdc933eb1d9489b0ce56606c3d0b387f03dff` | `6f6a0bf78787e14c2871f9a46b8cdc933eb1d9489b0ce56606c3d0b387f03dff` | `6f6a0bf78787e14c2871f9a46b8cdc933eb1d9489b0ce56606c3d0b387f03dff` | `6f6a0bf78787e14c2871f9a46b8cdc933eb1d9489b0ce56606c3d0b387f03dff` | retained free |
| `platform/legacy_profile.gd` | `dec94f072ea5a533db9975bb282c3d4670749a4fa38813512efa20a73f931a13` | `38b6852d8b915502984d4f5b52cb844392bd80323f98903ca3264c75667a8103` | `dec94f072ea5a533db9975bb282c3d4670749a4fa38813512efa20a73f931a13` | `38b6852d8b915502984d4f5b52cb844392bd80323f98903ca3264c75667a8103` | retained free |
| `platform/legacy_profile.gd.uid` | `497929f2d2b8d75eacf7f671623bcdabe4e46a7b32765f8e2b0eee1e622b837f` | `497929f2d2b8d75eacf7f671623bcdabe4e46a7b32765f8e2b0eee1e622b837f` | `497929f2d2b8d75eacf7f671623bcdabe4e46a7b32765f8e2b0eee1e622b837f` | `497929f2d2b8d75eacf7f671623bcdabe4e46a7b32765f8e2b0eee1e622b837f` | retained free |
| `platform/lifecycle.gd` | `0f31f376438c805edf0a827ea7e91e9fd90fa9f5e17af40d2dd38e57f137616f` | `0f31f376438c805edf0a827ea7e91e9fd90fa9f5e17af40d2dd38e57f137616f` | `0f31f376438c805edf0a827ea7e91e9fd90fa9f5e17af40d2dd38e57f137616f` | `0f31f376438c805edf0a827ea7e91e9fd90fa9f5e17af40d2dd38e57f137616f` | retained free |
| `platform/lifecycle.gd.uid` | `9e9877e589bb8d3bb896842020e0046fe7cbec7a4e17487ef9818120fc504e9c` | `9e9877e589bb8d3bb896842020e0046fe7cbec7a4e17487ef9818120fc504e9c` | `9e9877e589bb8d3bb896842020e0046fe7cbec7a4e17487ef9818120fc504e9c` | `9e9877e589bb8d3bb896842020e0046fe7cbec7a4e17487ef9818120fc504e9c` | retained free |
| `presentation/audio.gd` | `2f63008e30a19cb997acab80ed9a4a5e4a363b63e08eae4728834a3798e7c141` | `6e1ff3e7e06fafef1b4ae9072954dbfcd344d2492f5f8727b11ed09d4c42b8d6` | `2f63008e30a19cb997acab80ed9a4a5e4a363b63e08eae4728834a3798e7c141` | `6e1ff3e7e06fafef1b4ae9072954dbfcd344d2492f5f8727b11ed09d4c42b8d6` | retained free |
| `presentation/audio.gd.uid` | `611c724836aa7966edeb64919756d9f6b07ec2090a5ca7f0291482afd211f14b` | `611c724836aa7966edeb64919756d9f6b07ec2090a5ca7f0291482afd211f14b` | `611c724836aa7966edeb64919756d9f6b07ec2090a5ca7f0291482afd211f14b` | `611c724836aa7966edeb64919756d9f6b07ec2090a5ca7f0291482afd211f14b` | retained free |
| `presentation/cloud_layer.gd` | `df11e57caee66100fb2c68cbae202780ba9149a5dca84f0b8e161762637b1e24` | `df11e57caee66100fb2c68cbae202780ba9149a5dca84f0b8e161762637b1e24` | `df11e57caee66100fb2c68cbae202780ba9149a5dca84f0b8e161762637b1e24` | `df11e57caee66100fb2c68cbae202780ba9149a5dca84f0b8e161762637b1e24` | retained free |
| `presentation/cloud_layer.gd.uid` | `5aab127f36e7dd1b24dc6f8fbd3dcb806e7fa850eef61330a8af34f78ab25e47` | `5aab127f36e7dd1b24dc6f8fbd3dcb806e7fa850eef61330a8af34f78ab25e47` | `5aab127f36e7dd1b24dc6f8fbd3dcb806e7fa850eef61330a8af34f78ab25e47` | `5aab127f36e7dd1b24dc6f8fbd3dcb806e7fa850eef61330a8af34f78ab25e47` | retained free |
| `presentation/collection_overlay.gd` | `d9d912f5534a8ddb3be3f57b063d8da2b48616c0eae9a0b3b98236cb0abd5fcf` | `d9d912f5534a8ddb3be3f57b063d8da2b48616c0eae9a0b3b98236cb0abd5fcf` | `d9d912f5534a8ddb3be3f57b063d8da2b48616c0eae9a0b3b98236cb0abd5fcf` | `d9d912f5534a8ddb3be3f57b063d8da2b48616c0eae9a0b3b98236cb0abd5fcf` | retained free |
| `presentation/collection_overlay.gd.uid` | `cfb1d4fc355722edd77b05bf736ebb46c21523b6b3c979774dba3735a16fc085` | `cfb1d4fc355722edd77b05bf736ebb46c21523b6b3c979774dba3735a16fc085` | `cfb1d4fc355722edd77b05bf736ebb46c21523b6b3c979774dba3735a16fc085` | `cfb1d4fc355722edd77b05bf736ebb46c21523b6b3c979774dba3735a16fc085` | retained free |
| `presentation/culture_backdrop.gd` | `a6c5c8945ee6326c52bb4ec0780e086d2fc476fae27e5a50912ad198637b2206` | `8f2f76347cd88a59615835a71992f257b666655df60b6ac33aa947d19b6c94b5` | `a6c5c8945ee6326c52bb4ec0780e086d2fc476fae27e5a50912ad198637b2206` | `8f2f76347cd88a59615835a71992f257b666655df60b6ac33aa947d19b6c94b5` | retained free |
| `presentation/culture_backdrop.gd.uid` | `506c86e808e1c60c8004cf6803ded656141e8d50757e713cdef72cae9c5f6a3d` | `506c86e808e1c60c8004cf6803ded656141e8d50757e713cdef72cae9c5f6a3d` | `506c86e808e1c60c8004cf6803ded656141e8d50757e713cdef72cae9c5f6a3d` | `506c86e808e1c60c8004cf6803ded656141e8d50757e713cdef72cae9c5f6a3d` | retained free |
| `presentation/environment_receipt.gd` | `82dd5a920932dabc870039f291a700b796b307201cdc86d7eff22dafbf60a871` | `82dd5a920932dabc870039f291a700b796b307201cdc86d7eff22dafbf60a871` | `82dd5a920932dabc870039f291a700b796b307201cdc86d7eff22dafbf60a871` | `82dd5a920932dabc870039f291a700b796b307201cdc86d7eff22dafbf60a871` | retained free |
| `presentation/environment_receipt.gd.uid` | `0174a298de01be468c8b75ae8a1d2a43764352a8349dc589474e292d93f9043c` | `0174a298de01be468c8b75ae8a1d2a43764352a8349dc589474e292d93f9043c` | `0174a298de01be468c8b75ae8a1d2a43764352a8349dc589474e292d93f9043c` | `0174a298de01be468c8b75ae8a1d2a43764352a8349dc589474e292d93f9043c` | retained free |
| `presentation/grain_surface.gd` | `cd966e21fe9aa10291e2dfe5c5393ef3c278b0eee17a18827c30be0a64d48801` | `cd966e21fe9aa10291e2dfe5c5393ef3c278b0eee17a18827c30be0a64d48801` | `88bb7873f1c3dcb9d05028aaad33c1e72de4f39e1bb91c3a92e4234224e75918` | `88bb7873f1c3dcb9d05028aaad33c1e72de4f39e1bb91c3a92e4234224e75918` | exact g40 |
| `presentation/grain_surface.gd.uid` | `056dae9ca7681c3be1bc14d9b04788a0dbf7052f2dd671522d590cdac3c0a242` | `056dae9ca7681c3be1bc14d9b04788a0dbf7052f2dd671522d590cdac3c0a242` | `056dae9ca7681c3be1bc14d9b04788a0dbf7052f2dd671522d590cdac3c0a242` | `056dae9ca7681c3be1bc14d9b04788a0dbf7052f2dd671522d590cdac3c0a242` | retained free |
| `presentation/pixel_surface.gd` | `6c74e063333e8b7233912077a79d87a24773ffafff33f7a806969feab03fe640` | `6c74e063333e8b7233912077a79d87a24773ffafff33f7a806969feab03fe640` | `85edc7d754e822a3deaaa95b7ff53f79e4294d292a804bef8f4cd973edf8c0ba` | `85edc7d754e822a3deaaa95b7ff53f79e4294d292a804bef8f4cd973edf8c0ba` | exact g40 |
| `presentation/pixel_surface.gd.uid` | `182171b2da8c9a1cbb35c6048b7629647bdad4153aca427d202eab35f16ce347` | `182171b2da8c9a1cbb35c6048b7629647bdad4153aca427d202eab35f16ce347` | `182171b2da8c9a1cbb35c6048b7629647bdad4153aca427d202eab35f16ce347` | `182171b2da8c9a1cbb35c6048b7629647bdad4153aca427d202eab35f16ce347` | retained free |
| `presentation/planet_home.gd` | `8d70fd535c929cb25a77cd22ae83251b3359337313668178831c6cfe20474a82` | `0cfd51c66c8e8c71ab64c1635a2e786c350ef2fb6204fb338c5a9b9c934cc147` | `8d70fd535c929cb25a77cd22ae83251b3359337313668178831c6cfe20474a82` | `0cfd51c66c8e8c71ab64c1635a2e786c350ef2fb6204fb338c5a9b9c934cc147` | retained free |
| `presentation/planet_home.gd.uid` | `bee9825e9a7e1e257fe38b169a3630799f26d147461fd36c436227814401ea2f` | `bee9825e9a7e1e257fe38b169a3630799f26d147461fd36c436227814401ea2f` | `bee9825e9a7e1e257fe38b169a3630799f26d147461fd36c436227814401ea2f` | `bee9825e9a7e1e257fe38b169a3630799f26d147461fd36c436227814401ea2f` | retained free |
| `presentation/skill_vfx.gd` | `40133915900cc8af24fd2d214fffad6c6422c151ceeb76a353237d9b3e30df21` | `5fece911a35234505128c456e58319d5d80090a077566e84150ccc87c0691912` | `40133915900cc8af24fd2d214fffad6c6422c151ceeb76a353237d9b3e30df21` | `5fece911a35234505128c456e58319d5d80090a077566e84150ccc87c0691912` | retained free |
| `presentation/skill_vfx.gd.uid` | `098904ba836fb279ca69a28791e6a7feeec1506002628bffd9faea0ffe8c75f1` | `098904ba836fb279ca69a28791e6a7feeec1506002628bffd9faea0ffe8c75f1` | `098904ba836fb279ca69a28791e6a7feeec1506002628bffd9faea0ffe8c75f1` | `098904ba836fb279ca69a28791e6a7feeec1506002628bffd9faea0ffe8c75f1` | retained free |
| `project.godot` | `be7482d332e46dabc89f34d2c579b80981e677d654e64f0774628b8e3538580c` | `78858462d8bc9627a7a1c5f9ecc8892621a16a6fbdaa5cbd161f9acddc14ce03` | `08a8903b8fbf377463092bdda87efc6eef7ff82c1234202408db07af29b42ad8` | `f750f3f0b4ddd66ff34fbe3ec9969c53555125dbe540edfd6246b37307afebbd` | version or guidance update |
| `section_graph.gd` | `75da44182d066d0c20ab03498cc8d489b3c44a460e7447c5b5973f64bbac798a` | `75da44182d066d0c20ab03498cc8d489b3c44a460e7447c5b5973f64bbac798a` | `b617c9433cb34d2e41bb4215d0e626e32af78922efa6a76ebfcd177869ac8bfe` | `b617c9433cb34d2e41bb4215d0e626e32af78922efa6a76ebfcd177869ac8bfe` | exact g40 |
| `section_graph.gd.uid` | `3fef5f66c023aa286798da6fd474b6cf1bf82c760af622ab09cd9387b42ad220` | `3fef5f66c023aa286798da6fd474b6cf1bf82c760af622ab09cd9387b42ad220` | `3fef5f66c023aa286798da6fd474b6cf1bf82c760af622ab09cd9387b42ad220` | `3fef5f66c023aa286798da6fd474b6cf1bf82c760af622ab09cd9387b42ad220` | retained free |
| `skill_physics.gd` | `945d9727b9be0eace7aa5fd4ff765953a58d626f4a9210d7dd6393755e5af912` | `4df7b62e52e78d80b04c0c43dafcb10160b0f3250cc965a2e72c41ed4638b2f5` | `83785a2ffd081f28792eeb2d1fdc97406a1892bb7a2cff92ead04b8daa3d4303` | `f019366077d65ea6cef48550abb69fcb85769a969879ee617afbc554862449db` | three-way free adapter; see above |
| `skill_physics.gd.uid` | `bd94c3d4a8347d5c049cf84150cc389bcf2493e82ecd13f2cbf999733cb4c2cc` | `bd94c3d4a8347d5c049cf84150cc389bcf2493e82ecd13f2cbf999733cb4c2cc` | `bd94c3d4a8347d5c049cf84150cc389bcf2493e82ecd13f2cbf999733cb4c2cc` | `bd94c3d4a8347d5c049cf84150cc389bcf2493e82ecd13f2cbf999733cb4c2cc` | retained free |
| `source_random.gd` | `adf1a8604f607c0f69298fa7f1c8ddc71de07af3baa7aa329b3f8848047d09f9` | `adf1a8604f607c0f69298fa7f1c8ddc71de07af3baa7aa329b3f8848047d09f9` | `adf1a8604f607c0f69298fa7f1c8ddc71de07af3baa7aa329b3f8848047d09f9` | `adf1a8604f607c0f69298fa7f1c8ddc71de07af3baa7aa329b3f8848047d09f9` | retained free |
| `source_random.gd.uid` | `521f5de2e95e28d8632a9a3f90daec3b4e3c46fb80fcb8d2fa601679b54cae74` | `521f5de2e95e28d8632a9a3f90daec3b4e3c46fb80fcb8d2fa601679b54cae74` | `521f5de2e95e28d8632a9a3f90daec3b4e3c46fb80fcb8d2fa601679b54cae74` | `521f5de2e95e28d8632a9a3f90daec3b4e3c46fb80fcb8d2fa601679b54cae74` | retained free |
| `structure_physics.gd` | `9eda599cf6751c73416b14c24d6f17b65f60cb3901793134f22d36ebda06b759` | `9eda599cf6751c73416b14c24d6f17b65f60cb3901793134f22d36ebda06b759` | `7f1e0fa865f9f02c8c68e8e5b70d7870fbf844e8b1f48191f22b475d3e65f8ae` | `7f1e0fa865f9f02c8c68e8e5b70d7870fbf844e8b1f48191f22b475d3e65f8ae` | exact g40 |
| `structure_physics.gd.uid` | `9db132dfb15c30905df1bfc1413d5c021410e598bbf9ed672ee077b153c0590f` | `9db132dfb15c30905df1bfc1413d5c021410e598bbf9ed672ee077b153c0590f` | `9db132dfb15c30905df1bfc1413d5c021410e598bbf9ed672ee077b153c0590f` | `9db132dfb15c30905df1bfc1413d5c021410e598bbf9ed672ee077b153c0590f` | retained free |
| `world.gd` | `daa1ebe143c8d4ac1583453588e035256330ba405afaf821c55d32ef0141f0d9` | `dc5f5bbc3d8ead260446a959304b92cebc57c4ba5288a690d2fdd6534092b4c6` | `995c52e0d9353819f8a6eb178de6be11e680fba8cdd6aa8eb8afb2df9a2951c2` | `4b5898f697c4c84fa8b4b8fa21ad0b29007ce598da9bd4382c0643847dcd390c` | three-way free adapter; see above |
| `world.gd.uid` | `2406c104d93301d5313ace7fd3681a3c6a0005028490e9061d5edf0eebd2a0e1` | `2406c104d93301d5313ace7fd3681a3c6a0005028490e9061d5edf0eebd2a0e1` | `2406c104d93301d5313ace7fd3681a3c6a0005028490e9061d5edf0eebd2a0e1` | `2406c104d93301d5313ace7fd3681a3c6a0005028490e9061d5edf0eebd2a0e1` | retained free |
| `yield_joint.gd` | `cb666244dfff6d97a5ba292ac0ab84c4c4383cf87b303add21026a438f8375d7` | `cb666244dfff6d97a5ba292ac0ab84c4c4383cf87b303add21026a438f8375d7` | `cb666244dfff6d97a5ba292ac0ab84c4c4383cf87b303add21026a438f8375d7` | `cb666244dfff6d97a5ba292ac0ab84c4c4383cf87b303add21026a438f8375d7` | retained free |
| `yield_joint.gd.uid` | `4524bdeb908357a8cbd3ea9300a29a70d113970dec681ea68878277edcfbf461` | `4524bdeb908357a8cbd3ea9300a29a70d113970dec681ea68878277edcfbf461` | `4524bdeb908357a8cbd3ea9300a29a70d113970dec681ea68878277edcfbf461` | `4524bdeb908357a8cbd3ea9300a29a70d113970dec681ea68878277edcfbf461` | retained free |

## Preserved free content SHA-256 proof

Every following digest equals both the captured free-before and current free-after value. The source WAV remains present and unchanged; its exclusion from the exported PCK remains the builder/export allowlist responsibility.

| Relative free path | SHA-256 before = after |
| --- | --- |
| `assets/audio/01-ui-tap.wav` | `11cb6bc34cbd8370fea8880fd3ca49cf24fa0885c3532b03da80b1765ca0bc6c` |
| `assets/audio/01-ui-tap.wav.import` | `4d13abf5cc2da154a91f71cae9e3a80f02139a0f6069b5c10492021599ba0df0` |
| `assets/audio/02-ui-confirm.wav` | `24f25559f1c0b076ac2ccf8bf10f469e507605bf7ad38856d8b12b2f2df705f4` |
| `assets/audio/02-ui-confirm.wav.import` | `6281822e48d4d1a84ed4a01c6e055da9af4463c95a301350d3415d65ab4cb28d` |
| `assets/audio/03-ui-unavailable.wav` | `f97fa7e253db744331c8807678d12c59af26460435d98e7f5e38d54a67e693c5` |
| `assets/audio/03-ui-unavailable.wav.import` | `445ae9b2d8b62de7d6a6be703e14929b46e3d398a8271aa81b8e5e533c7a9a87` |
| `assets/audio/04-blackhole-open.wav` | `2561a2fb2f79ea6ce63ca1592825749978d70deca9d96a4af2af76222dbbf89a` |
| `assets/audio/04-blackhole-open.wav.import` | `15ae076c10f0b499cfdfc61ec01efc66c0769d9a93076d2886f3f0b398f108c3` |
| `assets/audio/05-blackhole-loop.wav` | `620ad11d5118a97abbd6dd6c4c01585201d7bd7dabd5a6f3bbb58cd7204ef9e7` |
| `assets/audio/05-blackhole-loop.wav.import` | `f6111b0acbe895e23a310951b8ec889d595eed5b76ce14b472cdc5770e91ae53` |
| `assets/audio/06-blackhole-close.wav` | `eec304ac7ea8aeb74f7b78b081a2b6b3d3c9aae050256b0c99151e03c783ea85` |
| `assets/audio/06-blackhole-close.wav.import` | `ad0a4797d82673afe17acdda4b5e1d3398e4154285f7da0dd114cd91158ea207` |
| `assets/audio/07-active-ready.wav` | `907e7a1c3d3b090947bd8085f48455faa4d04204c2005ececcbde837071fc631` |
| `assets/audio/07-active-ready.wav.import` | `26b7539a66a97d88825031875d56ead072dedd04edb5f54f2a890d8fe97aeb7f` |
| `assets/audio/08-active-deploy.wav` | `5a13477bfe2c0f66a1ee62ece24a983f9e7f80360e84e1383f672c93cd6fd4da` |
| `assets/audio/08-active-deploy.wav.import` | `0e48c0d3cd5499063985c7f2320671fde9772a301f340333241a11138c9e9b7f` |
| `assets/audio/09-orbital-fall.wav` | `ac5b86b35ec538fbe4af1f796c2778a5b430aeeaffe4924838c87e067eec12c6` |
| `assets/audio/09-orbital-fall.wav.import` | `0951afc283351c752b0ecb5a3c5c5dfe7c89a6c052307172594b1e187b5a1ff3` |
| `assets/audio/10-progress-success.wav` | `faf5c919d512b161b06c271504a2ad0a62acbd19b1fd22ca0fceca018e230460` |
| `assets/audio/10-progress-success.wav.import` | `8a5f354bf225286afb99195670d88ee65b858aaedb03c06003584267f6758638` |
| `assets/audio/16-battery-recharge.wav` | `f5009ddc5e884ef6233abc3a5db5a03b4b38309a3351ed94badd531cb499c0ad` |
| `assets/audio/16-battery-recharge.wav.import` | `811009990f130d48c6fca5b119461a717c77c39796116d8e7a03ab240983dee5` |
| `assets/audio/blast-peoeong.wav` | `c59dec31b0e6f2fc51c75f9c2b418984f201548300206196b60beb801af0c365` |
| `assets/audio/blast-peoeong.wav.import` | `de1d3e01c179b354c9d04d8b94afcf3fd1f5456f60c7cd03949c91a2fe10d005` |
| `assets/audio/metal-tick-single.wav` | `684febaa51ee0132383705c2cbb47f91f7060cc8c1b7105aba3626b343e671f5` |
| `assets/audio/metal-tick-single.wav.import` | `57831943a2e8154a71ab4bf4c61d4f622c5ff8a11e94d4dc1541528ce4ecd1ae` |
| `assets/audio/pixel-metal-chak.wav` | `a9676e43a107e3260933b5179e96a18324ac2672a90251acddb01a0ae6f17b9c` |
| `assets/audio/pixel-metal-chak.wav.import` | `813c2544f5f624e46b2ae4fb10895bb274ec57249ee667c9dcc3a256fafe62ba` |
| `assets/audio/quiet-background-v5-94bpm-32bars.mp3` | `59bea01e7f36c330a30fa37631eeb355f50891d8a536151f675ca817423402ff` |
| `assets/audio/quiet-background-v5-94bpm-32bars.mp3.import` | `5b766b46455bccd38b7427fe7c93a733598899b3375723dfa3c8394cff3b8229` |
| `assets/audio/quiet-background-v5-94bpm-32bars.wav` | `34d6bc8dcb86e450da8b56c7dcdbf70e5aafc3151d0fe6096a8f9f5c236c0f9c` |
| `assets/audio/quiet-background-v5-94bpm-32bars.wav.import` | `5ca7a72a4dd72f7126f3080fb966d2d6fd213c55996d265b4b51abba8f8450d4` |
| `assets/fonts/Galmuri11.ttf` | `3829a46ec3c5c99f907d1a80c46e2dac7c85cb0817f62bc718db335179b301ee` |
| `assets/fonts/Galmuri11.ttf.import` | `2a941731dfeedb0dfce5dce093cdd96a93a0ef10e9670bf443f97d08f345eef1` |
| `assets/fonts/OFL.md` | `9a9e5a342c430c3fcf01a408b680f4405d5bf4ac659c931be35f8a1b27ea69c9` |
| `assets/icons/active-orbital-drop.svg` | `ee5fd67f5bf4f7871d77fcf2e887bc92e1d1529541f7133f7e25f5eecfc5737a` |
| `assets/icons/active-orbital-drop.svg.import` | `81552112a9c681448d05c720598d2cf67daaa59d02a1ed147c27d32cb1bc07dc` |
| `assets/icons/hud-battery.svg` | `73cbeeba6349298f9350f8f2cb9a492a50d6ac138b481f825004123094a1cea5` |
| `assets/icons/hud-battery.svg.import` | `aa92d45db233b7f7e6e8980d7835bd094ac1b39cbc77625f521ef3b464ee797f` |
| `assets/icons/hud-pause.svg` | `3b69a917e8dbb76d3c9675da685db35a58312996e08ee3dad94c5c1481f78746` |
| `assets/icons/hud-pause.svg.import` | `c440a706d58269161b5f4af8a9b5b9c4e34227a205a3a86233fd968d07cbd03d` |
| `assets/icons/hud-recovery.svg` | `4122ba4285ac2f755ebbf5bbe8fe9a45c33cabb14b9a04c77f40c9807e28f6e2` |
| `assets/icons/hud-recovery.svg.import` | `cafcc78245c005ab9ad108a132ac713f2e14d60d33ab156d3de912935bb42331` |
| `assets/icons/hud-switch.svg` | `e6587bd3b4c67c0a6afc9815d37ebda52c5eac4a47a6291ba55751305e1cccc5` |
| `assets/icons/hud-switch.svg.import` | `dbdcc314a67c3d2d001bb4e4dd6f7dde3146611e1a48b9bf1a2e0d86d57e0cd8` |
| `assets/icons/passive-aftershock.svg` | `dccaf85d0d0e077919fdb5323733ccc081e6f0d065b3d7c1158575850db4f74d` |
| `assets/icons/passive-aftershock.svg.import` | `b85694647822808d1727c9c672b70b8f7ea53674bb81eecf118e47d337f22e79` |
| `assets/icons/passive-impact-relay.svg` | `d1edf9645eb3623d2fc79eb2742bfb0eaf87ea9c8f718313a4cca43d92962719` |
| `assets/icons/passive-impact-relay.svg.import` | `530dedc1ea2458cff9ae1454f029b5607d9821827246132b3ef3ae931fd8adb5` |
| `assets/icons/tool-blackhole.svg` | `698ad14ebe9152955fb100ec6ac805751517a1e880865caef137a9b8992774df` |
| `assets/icons/tool-blackhole.svg.import` | `464ef2e71cd04477a7dd6cdaf5c63c1f3de64d194cd5ec3fa8d4c5bd23e72028` |
| `assets/icons/tool-blast.svg` | `b140f5ed56e30d8935d77917a412955dcbc4f1eda7a0bbca6664735c08b3e0a9` |
| `assets/icons/tool-blast.svg.import` | `c229c7f1f86e33845c235dce2a4bacf753c24e4a7aab0e5eefd0eecc69361ea6` |
| `assets/planet/landmark-1.png` | `92c8fe1615a8fdeff7ae0ed0cde1167b6fafb6d6087b36bb0648c6729380959c` |
| `assets/planet/landmark-1.png.import` | `f90a74ee7b039d326cf132cde36677c10632415c5103f6b0f51e14a02df713c6` |
| `assets/planet/landmark-2.png` | `dc16a608cc0ef14feeaefcf3b8c6a311e0d3ad967e6ba18601a3be31787e3861` |
| `assets/planet/landmark-2.png.import` | `de0966e2a813b357674ffca27abaf9141bcb1925b60e410d480071c2af9833e9` |
| `assets/planet/landmark-3.png` | `b3029f7d4a6ff22ea59014941dbf0b95aba5299c4be0a2b100d1ccd1025b296d` |
| `assets/planet/landmark-3.png.import` | `246c1b7a4b5260e94ff9f6c727d3a8d94c73e63e88ddea59e9f894eb9308591f` |
| `assets/planet/landmark-4.png` | `3d7845f736ed49f559e2c94e2ccc0807759e3f2c0213a7aaab9d79338d22d5e8` |
| `assets/planet/landmark-4.png.import` | `c78325e943efc13fec2d8f469ec273dc8240ccf524f6208d675c7022aa4296ae` |
| `assets/planet/landmark-5.png` | `63e862145ded422d2e85bb030574c479eb0a240597bb0e9575626bd4571a61cc` |
| `assets/planet/landmark-5.png.import` | `e944166ef40cd4fa37ac71ac506f703ecf8a5ef906701d23168c44e2645d8bc9` |
| `assets/planet/landmark-6.png` | `a8238ee32f6fe3e321e9cf1a08ad5455632793c85ce88c643d93e4d7c1c21c68` |
| `assets/planet/landmark-6.png.import` | `4596985cd4e594536e7f225aa1e4037fd429ae32bc18c7dd7a8c221eab28de81` |
| `assets/planet/rubble.png` | `52130a833de993fa3452ce967c47882c532f21f06ba963e84b80a391d1af6526` |
| `assets/planet/rubble.png.import` | `cbbd478d8b9f48c5d25de1d8debcd63793c8023378af8233f71f6664960fffbe` |
| `assets/planet/sky.png` | `b28a34b78bfdba8a52e528fe0e05f7a6cdbe7b34311c2f4339a921391de0b902` |
| `assets/planet/sky.png.import` | `5cdb57548618f8991fd6f8e37a2f1b9ef97559e7f2675aaabe2499f5d7ca3949` |
| `assets/planet/worldmap.png` | `5291245987ee514bd95d05fbcee2210ad9f5191bae73920cac97239ce4f202fa` |
| `assets/planet/worldmap.png.import` | `f03e6f72d8da5a3db8c507a9c87ca57f112d21d82d096bd6d656a0d61e1a43a1` |
| `assets/salvage/01-compacted.png` | `912448781d5f52b84243218b9996661aefd07b97eab82e9f0740324cb0c7638b` |
| `assets/salvage/01-compacted.png.import` | `732458e02bd372bd98405f2e229e50fb9882500ec699a6e56b95710f41c458a6` |
| `assets/salvage/02-panels.png` | `76af1a6506e564ed5c9c9f5a034c4cb1d6a1171664f6a16485639244da76a205` |
| `assets/salvage/02-panels.png.import` | `ef9eeefe285b33040ab50ae6a2315faa4ae797baa7ca3376bb232501229b48f3` |
| `assets/salvage/03-pipes.png` | `33cc595541c80c2f8f8b1693149081bf1f45e1b68e3cfa2380d038fdbc141edd` |
| `assets/salvage/03-pipes.png.import` | `20f0eda5296379bb56a6ce377494ffd4d1578b48d23104e09f788b10627d5068` |
| `assets/salvage/04-appliances.png` | `eda0c568f5347ffcdeab22eefb8b8f9335a657a39787991cdaea68e181f0245a` |
| `assets/salvage/04-appliances.png.import` | `232832b5e93ab8ebe29dace064cfe108e4e5bbf6f8d186174b2825ccf8fccf3d` |
| `assets/salvage/05-drums.png` | `986f492ce3ffc64442e1f5ff5ed94cb5ce5c239a817221f4c40b9a0879d2c90a` |
| `assets/salvage/05-drums.png.import` | `590fac0f23fa5225c2d6c17cf821135e879cf249cf7ec54378c8dfe6e0810d31` |
| `assets/salvage/06-mixed.png` | `5adf6ebe358406d6d0cf407bc9c7d78fbc697bc4f2034df35007313ec3c2014e` |
| `assets/salvage/06-mixed.png.import` | `ff7f7853cf74c64a6d2e750029f3ada99f59df12ef4fdb66a54620fc6d3e7991` |
| `assets/salvage/README.md` | `7e80c39edbd43d6ae96a1e091fedd6e698bc11a12f912cfc0f2dcbcbbcba5a6e` |
| `assets/salvage/arch-building-a.png` | `f1bf6f32b87b3e0b9b489ec83763713739419d56fef1270999ab61abaae6d1a3` |
| `assets/salvage/arch-building-a.png.import` | `3225b3ef2dcb2511569c2f22f21ef02dd1c9f16bb27ce25156c21fddacdf00fa` |
| `assets/salvage/arch-building-b.png` | `e895e0d3ef0ce9f49f4cd55a403ba98dd5324d0c56ec3cce2b6c31abb12a3a11` |
| `assets/salvage/arch-building-b.png.import` | `120bdd6f3675571892c3b2e8bd8282abd6e9f3eff4f640d206eeac01683ee6fd` |
| `assets/salvage/arch-building-c.png` | `319f1e2b7c97892704ee8a4e1886cdd77731e620e44cdf0860113657fc2246f3` |
| `assets/salvage/arch-building-c.png.import` | `1432215930235a4cb0fda7c52636891728e0d7b9efdef3b9cf7403ec9e0bfe37` |
| `assets/salvage/arch-ground-a.png` | `ddef068dd544a4e59638fe6a3e8c97e2e3942a379cb025325e3bdc1132d904bf` |
| `assets/salvage/arch-ground-a.png.import` | `3d2ca6481e4b881e89543fde037ad2ef0cfe4d6b18ecaa3c8c7685b95b7232c1` |
| `assets/salvage/arch-ground-b.png` | `835ae3e07ff8bef508a02d29a456e7bddc11fe591840de2f8ab89b1bf1a5898d` |
| `assets/salvage/arch-ground-b.png.import` | `1d7579feb8d07b70efbbaa0580473bd25e27d409be4f3e28754335a4137f405c` |
| `assets/salvage/arch-ground-c.png` | `d05e26144db21f55c26c7f3d10cca2bf993ddfd1810534c83a467be51ae0f78d` |
| `assets/salvage/arch-ground-c.png.import` | `f641f465a2c62b64a7ba95d076a4a08ae04311a04e044d105d29ffe131da2916` |
| `assets/salvage/prop-bench.png` | `12768a8856aee256ae88e97b4f81d418425a221315a90e829074eba696ee2cd4` |
| `assets/salvage/prop-bench.png.import` | `71ef770437a742fb651cba3c7b2d10d56009ee095d677216e7c7edfdadee06b0` |
| `assets/salvage/prop-fountain.png` | `0d4d6558996117e6e7d04a54320e18542fcf1e079a3cab73233aa1b9a122242f` |
| `assets/salvage/prop-fountain.png.import` | `35eb53d966777a3f694be2c7d472af57ace5a6b3eb7481e152c63d7ae7834b0e` |
| `assets/salvage/prop-lamp.png` | `71dbf5df223c613c44ff32346c1acb5077ca748738816b806ffa4f049f160d98` |
| `assets/salvage/prop-lamp.png.import` | `21832e6b881cf99dc8a21b81b69dc9a506dfc941ad7dfbcba22a78c3e3aae069` |
| `assets/salvage/prop-stairs.png` | `d34402cbcb41ad91233d318cc668b47aef1ad1a29358975286cca964bc2a77c8` |
| `assets/salvage/prop-stairs.png.import` | `61034a9b46ad149162b831bc6b5e421ef687a7f07e70852aee74b4d6882bba07` |
| `assets/salvage/shared-cloud-a.png` | `4cf96db15a667715cfb100165444355138ff5880f03cb08d327aad589689d2b8` |
| `assets/salvage/shared-cloud-a.png.import` | `90f92ef5626e79dcce0b657b719a8e789c7981ff28d55a453c774ae6b01b6a05` |
| `assets/salvage/shared-cloud-b.png` | `e3b9f34db0d226c1831ce8191ec446d38dfa66acf08fd71f9f0612f7c8fe8965` |
| `assets/salvage/shared-cloud-b.png.import` | `8e66b480aa110faf33f660bf7070bee1f0a63e03113549cd6437dede215d9aee` |
| `assets/salvage/shared-cloud-c.png` | `4a1f1c5a2b410f327dbee2aea69bec6167e93aad0073a8a136d04d05def2bc5e` |
| `assets/salvage/shared-cloud-c.png.import` | `4190662daed86ee451b29b1eddd61453e3a029e7346dcc92990e20cbe267b5e6` |
| `assets/salvage/shared-mesa-a.png` | `4f949667bb6e31883df911ff9ee956d1d5b2ed576b2f98a004a64e3ea322ac31` |
| `assets/salvage/shared-mesa-a.png.import` | `043d6068dde3451af923ab3569af9c1403ac93a4c2dff6749fd0724f491c9c91` |
| `assets/salvage/shared-mesa-b.png` | `4fae5a143978a44940f5b9ef16bbce7a7c1fb47c09e2e4baa593281e08f1f446` |
| `assets/salvage/shared-mesa-b.png.import` | `8cff5858739358915d2b378fe52d4313536b2538e58608282e5b994e1ddfed5b` |
| `assets/salvage/shared-mesa-c.png` | `9cc75cef08b0e9e2042a964b0ecbf259efa5f08920af96782576ac4638598cea` |
| `assets/salvage/shared-mesa-c.png.import` | `b54fe2d195fab78c3098453550c2b596001e20f0e56ba45103ab90377c5802d5` |
| `assets/salvage/shared-scrap-a.png` | `4e80ada0bacc4d73de8809d9c04a2a4f69ee705d754b21418b06e99d2ce0dee1` |
| `assets/salvage/shared-scrap-a.png.import` | `a39fc14ace95b7397e191549f32a9f1f2108e38d4b399b2ae617636e0eeca9b4` |
| `assets/salvage/shared-scrap-b.png` | `cdfed6d0df6b3ae218af12fd7b963c8e8b7e82095186d61d43967f066cf2177d` |
| `assets/salvage/shared-scrap-b.png.import` | `5132d6066054380dc20f7087148986b865984a1b0193ab245f7fb0a3944a09fa` |
| `assets/salvage/shared-scrap-c.png` | `4fab28c1fdbafb7d34842465affef18c7f53432ed7262060e4be2249f7884d2e` |
| `assets/salvage/shared-scrap-c.png.import` | `6a61c052a879dd306e52566dd375e9c7f5d64da564547e15148853dd67e3bfe1` |
| `assets/scenery/broken-array.svg` | `e73a59e8f959daf70db87c16b74b811585ec0586fdffdc71b2769cbabc4552f0` |
| `assets/scenery/broken-array.svg.import` | `e66597c548cb6d60d33dfe5eb8919b6aa4f3e7d04234b28871aa42fb09c7cbe1` |
| `assets/scenery/dead-satellite.svg` | `81a449f9bd5d81c61943885e9f486ccb7a3ae0fe87132dbf6be7347636c52359` |
| `assets/scenery/dead-satellite.svg.import` | `c8347233c88f7704c586ecc4a039d9e61a0671bee29cba5d79115c30953c68cd` |
| `assets/scenery/dish-satellite.svg` | `cae2704d3d863ef0907be5df50984201467b113e990d6df8527dae2b9a5df1b4` |
| `assets/scenery/dish-satellite.svg.import` | `73e9b335b278763d7e4e7882356f90658db0c99e938eab4f88ca957e3cba27b2` |
| `assets/scenery/rust-moon.svg` | `0459629f674ed0a05e941f7e3bae7368c7db951592b2b20bbae08a7c68f49ab2` |
| `assets/scenery/rust-moon.svg.import` | `1523d6d5fb3adc7ada8e3a4bbc0bd64dddc9fd3c0de56e7a333a9763e16153b7` |
| `assets/scenery/slate-moon.svg` | `5cd6cb84726ed1f0f70eb1c4229ae48a2e061ee5165c232011df530a3c9af910` |
| `assets/scenery/slate-moon.svg.import` | `c59e8cba0669b34acc5c915ed3f1a4f18f3129a2a90e5d72bdeba886efe039dc` |
| `assets/scenery/spent-probe.svg` | `698f0d39f9b02befdfa72f5b2e2099c34bd756596fea257664bb093f82b140fa` |
| `assets/scenery/spent-probe.svg.import` | `5ce32b239fa4a35b5f0206e50c918e6a54fe1aa3accf244d0f988295033f6112` |
| `assets/vfx/blackhole-close.png` | `fefa89b235d15ab5c2a1251f5fd4f692cc443a1a231b21e995ab333c8a671704` |
| `assets/vfx/blackhole-close.png.import` | `eb306de8e8ad384336df9a84c6287a52f4720db4a72bdc79daa32a2ed5d65e5d` |
| `assets/vfx/blackhole-loop.png` | `04d32f8e14d98369d933eacd1850be308672f8f30d47e23baf89bca63488f61c` |
| `assets/vfx/blackhole-loop.png.import` | `b51aa95bbb16744daf3fdc6309d293ffef1a361c21a8d0dacd8d161d418c8e30` |
| `assets/vfx/blackhole-open.png` | `f56c1fa2687dbf6b2ace1c7341c759cbc354abbaa0b0f0006512b0bbca24badb` |
| `assets/vfx/blackhole-open.png.import` | `d57f1766a5f1a6b0388b835b7b1e8f00394d3d72fd5b66e9b22ae479f56037d6` |
| `assets/vfx/blast.png` | `c4f2d5bb4ca4e657b5db9572856820014b5bcf7fb784df84dd64dab235790301` |
| `assets/vfx/blast.png.import` | `da16ebb8ca05cec64bbd72c7b5a378f30a5d3adc7facffb49328bd47b1639a79` |
| `assets/vfx/collect.png` | `386c6d451def4fba7650b1215bbd0501faa01f3f0ec986f87dfcb8b5895826b9` |
| `assets/vfx/collect.png.import` | `dbdc4ef83b240441fb221d969be5287f5227c387fc915f19fcbe5a8148ba41a8` |
| `assets/vfx/impact.png` | `7e34b13cb28733d6140c03c96b5b97fd8e33c1da30bf74ae16b6649a75a7f2ec` |
| `assets/vfx/impact.png.import` | `37269549989976cc682e66cd81497ef666de554690fed14e46ec9e9f11522bcb` |
| `assets/vfx/relay-mark.png` | `577d0c829dc1ca4848a864affd2a2a0c151338b50ab51f59355bbe6894ef02c0` |
| `assets/vfx/relay-mark.png.import` | `965eed925184b7dcbb4c0ed9da070f16702c7eb3ec0c3e5e2cda6b75566d4a88` |
| `assets/vfx/satellite-heavy.png` | `59ae4d95863859b9dca469e5d575d5bd6b43e9baf5ce90346eff72edac3ab453` |
| `assets/vfx/satellite-heavy.png.import` | `f2a24e0cdadc0d106cdb3bad4914f46a1211b968601d75a8c59f8e86d2589762` |
| `assets/vfx/satellite-normal.png` | `74e9481411d7beb0115caf4c04d183b03848725ba1508b21e2900d5a892b288b` |
| `assets/vfx/satellite-normal.png.import` | `db02abde39d8a8606baf4d978c7de7012de18ba51ba0dc191660b45640dba886` |
| `assets/vfx/satellite-trail.png` | `1ea1d98cf482145732c9b8b19ddb90039fa5e326d8a90e773ac633696f3d4685` |
| `assets/vfx/satellite-trail.png.import` | `0e360beba755962d192668a4c4bf56d1854dde571863a7dc306dfddf6939d431` |
| `assets/vfx/satellite-wreck.png` | `d9917d0d2aa6a29ef8739b00542d3886b1f0024cfc7c784c0782336dfd1023a0` |
| `assets/vfx/satellite-wreck.png.import` | `2321a97af1d345a46d0608d3477b2bc483380fa4f1c33f6f84405b3ad2e73eab` |
| `assets/vfx/shockwave.png` | `fc263f0fb06dc5fbe8361961b22697577d22ba5cc9dfa256483a9a7793518eb1` |
| `assets/vfx/shockwave.png.import` | `255089f660c3fc2b05dc4948ecccfcd1bd9cb3d35425994f5e01742c5d036db4` |
| `assets/vfx/smoke.png` | `9c4248129dbbbb443138953360b6639f90b90c2d7a35f9eded61d2f70d9f9213` |
| `assets/vfx/smoke.png.import` | `28ad0661407d75fa8da85133a98a1c7b66b8337abb743548abb1ef96bb334508` |
| `assets/vfx/spark.png` | `17e82280999310e924dae4eb495147def4a3bb0d410ef4825f478b99e75df491` |
| `assets/vfx/spark.png.import` | `6a58e7700d964851383effbfd80adbd0342cf287979355f588c1716733e2d7db` |
| `data/assets.json` | `f721bbc247f08acece2051a7b38a9380c62551ee6fa07c7b41b893911ee0616a` |
| `data/balance.json` | `a269e9893570022847d143e899bdec6b2960a8415595aa51150d4cd70bd4825c` |
| `data/campaign.json` | `2dcf65811cdb8328b6cd82193e3c271bf2782c5bc6530a01ae8f2369a396d4d8` |
| `data/collection_upgrades.json` | `e630a723ead5e3b98d102aa9a37159f8e3fdb024bf40f2e7ee0d57b8cf76e441` |
| `data/free-source-manifest.json` | `310a6809517cf7e9c095a3f36e21f3c1f681037770dde8e0fa05a6e47af1879f` |
| `data/locale-ko.json` | `ec206e97d69c1a2fe0fafa5bfb075ae7a8c61854c142e6ed73cb46c6b41e9274` |
| `data/maps/arch-0-arch-quarter-v2.json` | `5d212ec52080a87c62b6da427381b478cf761a39508fe7a1fd1d3d3e86e498f7` |
| `data/maps/arch-1-arch-quarter-v2.json` | `9c8f1ef8fe8e6ff7cb496948d83afa4b81a0f191f6dfec693dc7bd8cd859e5e9` |
| `data/maps/arch-2-arch-quarter-v2.json` | `4549df3ba023d08064f333373b9d1c0c379417bff044f99d95f1dfe5ccdbc59e` |
| `data/maps/arch-3-arch-quarter-v2.json` | `e147d786925ebf5e2efe21758e5f9560d899d3978e671798b647ccd813e35798` |
| `data/maps/arch-4-arch-quarter-v2.json` | `c4b099fcfc8a4a6bf607beaf794a3a7ab09c15cc82c7ad7daa6076ec1bc5b6cc` |
| `data/maps/arch-5-arch-quarter-v2.json` | `e27a9ea2cbe26531373f72d5336364f32a7bc76aff4f60a9781ecf5f081f3639` |
| `data/maps/arch-6-arch-quarter-v2.json` | `f32934bcefbad2dccb551693cdae4d5c76cac1606e827116934a72bb579cd81d` |
| `data/maps/arch-7-arch-quarter-v2.json` | `f9c99e58372df2ebf75b325d50cb0520a728c639e2ffaf6cba7c07e3df1ffc8f` |
| `data/skill_expansion.json` | `12b6fd3127f44d78f05617aaf9201a2973b485a0e08749d806f699cbcac59501` |

## Remaining release checks

The parent task must supply/verify frozen g40 native binaries and the pinned Godot 4.6.2 GDExtension-enabled Web template, then perform permitted import/check-only/export/package/HTTP/deployment work. This report makes no gameplay, audio playback, touch, durable browser save, frame-rate, thermal or device claim. Those checks remain user-only.
