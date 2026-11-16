# Skill future-price source and arithmetic report

Static source inspection and independent Python integer arithmetic only. No engine, scene, save, gameplay, browser or device execution.

- All 15 source/math checks pass; 9009 dense exact price points; 10303 historical transition totals.
- Learn costs, fixed tables and first post-table prices preserved. Recharge and every other existing Money/Economy function unchanged outside the approved price/validator functions.
- Every sampled old-prefix/new-suffix transition accepted; values immediately below/above preserved bounds rejected. Convexity proof extends schedule ordering and mixed-ledger bounds to all permitted integer levels.
- Safe integer guard remains unchanged. New helper has no float price decisions; factor remains within signed 64-bit at the greatest permitted level.

| Skill | Anchor A | L20 new | L20 old | L40 new | L100 new |
|---|---:|---:|---:|---:|---:|
| aftershock | 21,580 | 28,060 | 69,200 | 41,010 | 79,850 |
| relay | 21,580 | 31,300 | 99,980 | 44,240 | 83,090 |
| orbital | 43,160 | 62,590 | 199,950 | 88,480 | 166,170 |
| slam | 14,390 | 20,870 | 66,650 | 29,500 | 55,410 |
| expand | 19,190 | 27,830 | 88,870 | 39,340 | 73,890 |
| wave | 23,980 | 34,780 | 111,090 | 49,160 | 92,330 |
| seismic | 21,580 | 31,300 | 99,980 | 44,240 | 83,090 |
| gravity | 28,780 | 41,740 | 133,300 | 59,000 | 110,810 |
| sonic | 35,970 | 52,160 | 166,630 | 73,740 | 138,490 |
| recharge | 3,600 | 21,260 | 21,260 | 49,960 | 181,740 |

Bounds remain deliberately conservative and can accept totals inside bounds that do not equal a reconstructed purchase sequence. This preserves prior behavior and historical saves; it does not validate live saves or transactions.
