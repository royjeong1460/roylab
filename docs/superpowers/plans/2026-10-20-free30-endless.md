# Free first zone: clear feedback and post-clear growth

User-authorized scope: automatically complete a boss run when recovered pixels reach ceil(initial * .7), tell the player to keep upgrading, and remove upgrade level caps after the first clear. Ordinary sites retain their current rules. Preserve saves, spent-parts accounting, old variants, physics and sound.

Implementation:
- [x] Test boss threshold, pause, failure, one-time award, post-clear purchases above previous caps, reload and pre-clear cap validation.
- [x] End qualifying boss runs through the existing settlement path; show an explicit clear/continue-upgrading receipt.
- [x] Remove gameplay level caps only for cleared profiles. Keep safe integer currency validation; apply purchased black-hole settings beyond the lab's old 100x UI normalization limit.
- [x] Update upgrade cards, home copy and balance documentation; 85 tests and build passed. Browser QA verified boss threshold receipt and level 12 to 13 purchase beyond the old cap.
- [ ] Deploy Roylab and confirm Cloudflare success.

Balance investigation: user reports 5–10 minutes; clarify whether this means tutorial or first boss. Existing estimator assumes 10-second attacks, 20-second shopping and checks bosses only every fifth run. Compare faster input and every-run boss probes before selecting numerical changes. No claim of validated 30-minute human playtime.

Selected balance: quadratic late-upgrade costs (curve 60, black-hole-specific 30), black-hole battery 24. Keep tutorial first purchases and current boss size. Validate older-save migration with fixed historical discount.
