# Price change review

What this change does: It preserves learning costs, fixed tables and the first post-table price, then applies 3% linear growth per additional level to the nine destructive skills. Recharge and tool upgrade prices keep their existing formulas. Historical purchase totals keep their original validation bounds.

**PASS. No actionable findings in the reviewed price scope.**

Reviewed candidate: `qa/ios-skill-range-2026-11-16/project` against `qa/ios-blackhole-growth-2026-11-16/project`.

Checked:

- `campaign/economy.gd:65-85`: learning and fixed-table branches remain unchanged. The first tail level uses the old polynomial anchor A; aftershock uses M=10, the other eight destructive skills M=5. Recharge directly uses the extracted old tail function at every tail level.
- `campaign/money.gd:122-128`: decimal-string multiplication and exact integer comparisons implement `10*ceil(A*(100+3*(L-M))/1000)`. The only native integer factor is at most `100+3*(MAX_SAFE_INTEGER-1-M)`, within signed 64-bit range. The root helper receives degree 1 and a constant initial estimate, so floating point does not decide the returned price. The old polynomial anchor remains unchanged.
- `campaign/economy.gd:127-157`: the lower bound still uses A; the upper bound uses the historical last price. Both old and new prices are monotone and at least A, and the historical schedule dominates the new schedule. Consequently every old/new mixture lies within the preserved bounds. Totals outside those bounds remain rejected. Exact sequence reconstruction remains intentionally outside this conservative validator.
- `campaign/journey.gd:157-197`: offers supply the actual charged price. Purchases add only that price to existing `spent` and `purchaseTotals`, subtract it from existing parts, and retain the recorded purchase history. No retrospective repricing is introduced.
- `campaign/profile_schema.gd` and `campaign/profile_store.gd`: both are byte-identical to the baseline, as is `journey.gd`. Existing balance checks, normalization, schema version, save identity, storage paths and commit flow therefore remain unchanged. No new refund, reset or migration is present.
- Read the supplied `price-diff.patch`, `check-price-growth.py`, `price-growth.json` and `price-growth.md`. The evidence reports 9,009 dense price points and 10,303 transition totals; its source hashes match the reviewed economy and money files. Reviewed the convexity argument extending the mixed-ledger bounds to the allowed level range. Did not rerun the supplied arithmetic checks.

Expected load: the existing single-player shop and profile flow, with the unchanged bounded price cache and fixed-size skill catalog. No new iteration over owned levels is introduced.

Verdict: Ship the reviewed price source scope.

Not checked: engine parsing/compilation, builds, live saves, transactions in the game, scenes, browser, device, gameplay or runtime behavior. This review performed source inspection and file/hash comparisons only; it is not a release or runtime approval.
