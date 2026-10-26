# Campaign planning arithmetic v0.2

Generated with `python3 calculate.py`. Values are proposed budgets, not game measurements.

| Metric | Value |
| --- | --- |
| normalPixels | 468,000 |
| bossPixels | 132,000 |
| uniquePhysicalPixels | 600,000 |
| bossFirstRewards | 110,000 |
| singlePassExactly70Income | 437,600 |
| singlePassAllNormal100Income | 578,000 |
| baseForecastIncome | 927,500 |
| baseCheckpointSpend | 784,450 |
| baseCheckpointWallet | 143,050 |
| allUpgradeOwnershipCost | 2,760,630 |
| targetMinutes | 300.0 |
| sameAttempts30PctFasterMinutes | 227.4 |
| sameAttempts30PctSlowerMinutes | 372.6 |
| unlimitedReplayIncomeCap | Unbounded by replay |

## Region ledger

| Region | Normal pixels | Boss pixels | First boss reward | Income forecast | Cumulative spend | Wallet | Minutes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 아치 지구 | 18,000 | 6,000 | 4,000 | 23,800 | 17,340 | 6,460 | 30.0 |
| 처마 골목 | 33,000 | 10,000 | 8,000 | 57,500 | 57,810 | 23,490 | 45.0 |
| 호박빛 시장 | 54,000 | 16,000 | 12,000 | 98,400 | 140,020 | 39,680 | 50.0 |
| 수로 공업지 | 81,000 | 23,000 | 18,000 | 155,700 | 283,520 | 51,880 | 55.0 |
| 계단 고원 | 117,000 | 32,000 | 28,000 | 238,600 | 486,810 | 87,190 | 60.0 |
| 모자이크 분지 | 165,000 | 45,000 | 40,000 | 353,500 | 784,450 | 143,050 | 60.0 |

## Fixed core prices and sample levels

`price = ceil(base × growth^currentLevel / 10) × 10`. Current level starts at zero. Prices depend only on the purchased track level, not earnings or region selection. Steps are additive to baseline.

| Track | Base cost | Cost growth | Cap | R1 | R2 | R3 | R4 | R5 | R6 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 배터리 용량 | 150 | 1.2 | 24 | 8 | 12 | 16 | 18 | 21 | 24 |
| 폭파 힘 | 180 | 1.23 | 30 | 8 | 14 | 18 | 22 | 24 | 27 |
| 폭파 직접 반경 | 300 | 1.25 | 20 | 4 | 8 | 12 | 14 | 16 | 18 |
| 폭파 힘 전달 범위 | 150 | 1.22 | 20 | 4 | 8 | 10 | 12 | 15 | 17 |
| 블랙홀 인력 | 180 | 1.23 | 30 | 3 | 8 | 12 | 15 | 18 | 21 |
| 블랙홀 범위 | 180 | 1.22 | 20 | 2 | 6 | 8 | 10 | 13 | 15 |
| 블랙홀 지속 | 200 | 1.22 | 20 | 2 | 4 | 8 | 9 | 10 | 12 |
| 중심 휘젓기 | 180 | 1.2 | 36 | 2 | 7 | 11 | 13 | 17 | 20 |
| 마모 상한 | 180 | 1.2 | 36 | 2 | 7 | 11 | 13 | 17 | 20 |
| 자동수집 수량 | 80 | 1.15 | 20 | 4 | 7 | 9 | 10 | 12 | 14 |
| 자동수집 간격 | 100 | 1.18 | 15 | 4 | 6 | 8 | 9 | 11 | 12 |

## Owned skill checkpoints (not equipped simultaneously)

0 = not learned. Passive upgrades to levels 2/3/4/5 cost 600/1,800/6,000/18,000. Active upgrades cost 1,200/4,000/12,000/36,000. Recharge has only level 1.

| Skill | Learn cost | R1 | R2 | R3 | R4 | R5 | R6 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Aftershock | 0 | 2 | 3 | 4 | 5 | 5 | 5 |
| Impact Relay | 1000 | 1 | 2 | 3 | 4 | 5 | 5 |
| Lift & Slam | 3500 | 0 | 1 | 2 | 3 | 3 | 4 |
| Pressure Bloom | 6000 | 0 | 0 | 1 | 2 | 3 | 4 |
| Ground Pulse | 10000 | 0 | 0 | 0 | 1 | 2 | 3 |
| Orbital Drop | 2000 | 1 | 2 | 3 | 4 | 5 | 5 |
| Seismic Driver | 4000 | 0 | 1 | 2 | 3 | 4 | 5 |
| Gravity Press | 8000 | 0 | 0 | 1 | 2 | 3 | 4 |
| Sonic Sweep | 12000 | 0 | 0 | 0 | 1 | 2 | 4 |
| Battery Recharge | 12000 | 0 | 0 | 0 | 0 | 1 | 1 |

## Assumptions and limits

- Each region budget repeats every normal map using fractions in order, resets geometry each time, and includes one successful boss and the remaining failed boss attempts.
- Fractions and durations are authored targets, not outputs of physics, player skill or upgrades.
- Normal and boss durations include the maximum ten-second settlement allowance; not added again.
- Core/skill checkpoint costs describe one affordable mixed collection of owned upgrades, not an optimized purchase route or equipped loadout.
- Learning opportunities can occur before these end-of-region checkpoints. Exact in-region affordability and force adequacy are not validated.
- No currency multipliers, tutorial-only bonus, 100% cash bonus, extra boss wins or elective farming in base forecast. Replaying indefinitely has no finite income ceiling.
- Existing live game and accepted physics values are unchanged.
- Region-end affordability passes; the exact purchase order and acquisition milestones still need a route model.
- No-collection and stronger-collection builds earn the same final currency under guaranteed pickup. Collection is convenience, not a money multiplier.
- Three hundred minutes is explicitly assembled from target attempts, sortie durations and menu budgets. It is not a result predicted by physics.
- Final physical map size and moving-body load require device validation.
