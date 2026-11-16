# Skill range growth and future prices implementation plan

> Execute approved scope continuously in the existing linked release worktree; use independent task implementation and source review. No game/runtime tests.

**Goal:** Ship approved skill reach growth and gentler future prices to Web and iOS. Audit Shockwave/Black-hole balance at user-confirmed level20. Any Black-hole nerf requires a concrete approved scope before inclusion.

**Architecture:** Existing Catalog effect_stats produces the actual radii consumed by SkillPhysics. Existing Economy/Money functions produce exact integer prices and retain previous bounds for stored purchaseTotals. No save migration, reset, refund, art or map changes.

**Global constraints:** Existing native0.5.70(80) and Web free-0541-94f050796091 remain rollback. Candidate0.5.71(81). Existing app IDs, userdirs, ledgers and data stay intact. Assistant only reads, imports/compiles/exports, signs, installs and statically checks HTTP/PCK. No game/tests/scenes/browser/device app execution. Shared Web and iOS logic stays equal.

- [x] Capture baseline hashes, static pre-change failures and copy native candidate/export. Preserve unrelated dirty primary checkout and old untracked packages.
- [x] Catalog: M=10 aftershock,5 other destructive skills. S=1+0.04sqrt(max(0,L-M)); keep existing power curves, proc thresholds, duration/delay/interval, projectile/echo/target/step counts. Carry actual radii to every consumer: aftershock2.5S; relay3S; slam actual capture timesS using current ShockReach; slam continues following captured IDs without a second range gate and its down visual envelope also scales; expand11S/final2S; wave8S/spacing7S; orbital3S/5S; seismic coverage1.2S after5 and hit9S; gravity contact2.5S; sonic scan/hit5S. Recharge unchanged. Keep low-level effects identical.
- [x] Economy task: nine destructive skills retain fixed price tables and first post-table price A. Future price=10ceil(A[1+0.03(L-M)]/10), using exact integer Money arithmetic. Recharge unchanged. validate_purchase_totals keeps prior polynomial last-cost upper bound, common first-price lower bound and original prefix; accept historical/mixed purchases without rewriting totals. Preserve all other prices, save schema and transactions.
- [x] Update skill descriptions and Korean keys so actual growing ranges are visible alongside existing effects. Basic-level demos and assets unchanged. Independently review economy compatibility and skill consumers; resolve findings.
- [x] Compare level20 tools: actual damage cadence, range, costs, support strain, wear and mixing. Record evidence and a bounded nerf proposal separately unless user approves it.
- [x] Static arithmetic and source checks across boundaries/high levels, old/new/mixed price histories and numeric limits. Compile/export/Xcode signing, source and PCK parity, unchanged maps/art/core/other tracks. No runtime claims.
- [x] Site build, explicit package-only Web publication,15 static HTTP raw/decoded hashes. iPhone update install without launch. CURRENT/delivery/rollback/bug records; actual feel/balance/save continuity user validation.
