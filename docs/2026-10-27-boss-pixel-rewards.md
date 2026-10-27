# Free boss pixel rewards — 2026-10-27

The user completed normal sites rapidly after the sensitive fall change, but reported that boss attempts felt unrewarding because recovered pixels could not fund upgrades. Boss farming is now explicitly allowed.

- Every settled boss attempt awards all recovered loose pixels as parts, including failed attempts and voluntary returns.
- Successful clears additionally retain the existing bonus: 4,000 on the first clear, 1,000 on subsequent clears. No bonus below 70%.
- Existing end-of-run loose-pixel sweep applies. Intact chunks are not rewards. Closing/reloading an unfinished run does not settle it, as before.
- Boss unlock requirements, 70% clear requirement, upgrade costs/increments, collection rates, maps, physics and save keys remain unchanged.
- Past settled attempts are not recalculated or retroactively credited. New receipts and run journals record the actual total reward and separate clear bonus.

Implementation: change ArchJourney settlement, boss advice, and receipt copy only. Regression coverage exercises failed/empty/first/repeat runs, upgrade spending after failed attempts, persisted reload, repeated settlement, storage failure/retry and journal export. Existing comparison editions retain their rules.
