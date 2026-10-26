"""Reproduce planning budgets only. Does not simulate gameplay or mutate game data."""
import csv
import json
from decimal import Decimal, ROUND_CEILING
from pathlib import Path

ROOT = Path(__file__).resolve().parent
config = json.loads((ROOT / 'config.json').read_text())
D = lambda value: Decimal(str(value))


def cost(track, current_level):
    return int((D(track['base']) * D(track['growth']) ** current_level / 10)
               .to_integral_value(rounding=ROUND_CEILING)) * 10


def skill_cost(skill, level):
    if level == 0:
        return 0
    return skill['learn'] + sum(config['skillUpgradePrices'][skill['kind']][:level - 1])


def table(headers, rows):
    return '\n'.join(['| ' + ' | '.join(headers) + ' |',
                      '| ' + ' | '.join(['---'] * len(headers)) + ' |'] +
                     ['| ' + ' | '.join(map(str, row)) + ' |' for row in rows])


tracks, skills = config['tracks'], config['skills']
rows, prices = [], []
earned = spent_before = minutes = 0
previous_core = [0] * len(tracks)
previous_skills = [0] * len(skills)
for track in tracks:
    for level in range(track['cap']):
        prices.append({'id': track['id'], 'nextLevel': level + 1,
                       'price': cost(track, level),
                       'valueAfter': float(D(track['start']) + D(track['step']) * (level + 1))})
for index, region in enumerate(config['regions'], 1):
    assert len(region['maps']) == config['rules']['ordinaryPerRegion']
    assert len(region['core']) == len(tracks) and len(region['skills']) == len(skills)
    assert region['fractions'][-1] >= config['rules']['clearFraction']
    assert all(0 <= f < config['rules']['clearFraction'] for f in region['fractions'][:-1])
    for n, old, track in zip(region['core'], previous_core, tracks):
        assert old <= n <= track['cap']
    for n, old, skill in zip(region['skills'], previous_skills, skills):
        assert old <= n <= skill['cap']
    physical = sum(region['maps'])
    normal_income = sum(int(D(pixels) * D(f)) for pixels in region['maps'] for f in region['fractions'])
    income = normal_income + region['reward']
    normal_runs = len(region['maps']) * len(region['fractions'])
    fight_minutes = (normal_runs * region['normalSeconds'] + region['bossAttempts'] * region['bossSeconds']) / 60
    computed_minutes = fight_minutes + region['campMinutes']
    assert abs(computed_minutes - region['minutes']) < 1e-8
    core_spend = sum(sum(cost(track, level) for level in range(n))
                     for track, n in zip(tracks, region['core']))
    skill_spend = sum(skill_cost(skill, n) for skill, n in zip(skills, region['skills']))
    spent = core_spend + skill_spend + config['rules']['blackHoleLearnCost']
    earned += income
    minutes += computed_minutes
    assert earned >= spent  # End checkpoints only, not in-region affordability.
    rows.append({'region': index, 'name': region['name'], 'normalPixels': physical,
                 'averageMapPixels': physical // len(region['maps']), 'bossPixels': region['boss'],
                 'averageMapGrowthPct': None if index == 1 else round((physical / rows[-1]['normalPixels'] - 1) * 100, 2),
                 'bossFirstReward': region['reward'], 'bossRepeatReward': int(D(region['reward']) * D(config['rules']['bossRepeatMultiplier'])),
                 'normalRuns': normal_runs, 'bossAttempts': region['bossAttempts'],
                 'income': income, 'cumulativeIncome': earned, 'spendThisRegion': spent - spent_before,
                 'cumulativeSpend': spent, 'wallet': earned - spent,
                 'minutes': computed_minutes, 'cumulativeMinutes': minutes})
    spent_before = spent
    previous_core, previous_skills = region['core'], region['skills']

normal_total = sum(r['normalPixels'] for r in rows)
boss_total = sum(r['bossPixels'] for r in rows)
boss_rewards = sum(r['bossFirstReward'] for r in rows)
threshold_income = sum(int((D(n) * D(config['rules']['clearFraction'])).to_integral_value(rounding=ROUND_CEILING))
                       for region in config['regions'] for n in region['maps']) + boss_rewards
full_catalog = sum(p['price'] for p in prices) + sum(skill_cost(s, s['cap']) for s in skills) + config['rules']['blackHoleLearnCost']
assert len(rows) == 6 and sum(len(r['maps']) + 1 for r in config['regions']) == 42
assert normal_total + boss_total == 600000
assert minutes == 300 and full_catalog > earned
camp = sum(r['campMinutes'] for r in config['regions'])
summary = {'normalPixels': normal_total, 'bossPixels': boss_total, 'uniquePhysicalPixels': normal_total + boss_total,
           'bossFirstRewards': boss_rewards, 'singlePassExactly70Income': threshold_income,
           'singlePassAllNormal100Income': normal_total + boss_rewards,
           'baseForecastIncome': earned, 'baseCheckpointSpend': spent_before, 'baseCheckpointWallet': earned - spent_before,
           'allUpgradeOwnershipCost': full_catalog, 'targetMinutes': minutes,
           'sameAttempts30PctFasterMinutes': round((minutes - camp) * .7 + camp, 1),
           'sameAttempts30PctSlowerMinutes': round((minutes - camp) * 1.3 + camp, 1),
           'unlimitedReplayIncomeCap': None}
(ROOT / 'report.json').write_text(json.dumps({'summary': summary, 'regions': rows, 'assumptions': config['assumptions']}, ensure_ascii=False, indent=2) + '\n')
for filename, data in [('region-budget.csv', rows), ('upgrade-prices.csv', prices)]:
    with (ROOT / filename).open('w', newline='', encoding='utf-8-sig') as handle:
        writer = csv.DictWriter(handle, fieldnames=data[0].keys())
        writer.writeheader()
        writer.writerows(data)

report = '# Campaign planning arithmetic v0.2\n\nGenerated with `python3 calculate.py`. Values are proposed budgets, not game measurements.\n\n'
report += table(['Metric', 'Value'], [[key, f'{value:,}' if isinstance(value, (int, float)) else 'Unbounded by replay'] for key, value in summary.items()])
report += '\n\n## Region ledger\n\n' + table(['Region', 'Normal pixels', 'Boss pixels', 'First boss reward', 'Income forecast', 'Cumulative spend', 'Wallet', 'Minutes'],
    [[r['name'], *[f"{r[k]:,}" for k in ['normalPixels', 'bossPixels', 'bossFirstReward', 'income', 'cumulativeSpend', 'wallet', 'minutes']]] for r in rows])
report += '\n\n## Fixed core prices and sample levels\n\n`price = ceil(base × growth^currentLevel / 10) × 10`. Current level starts at zero. Prices depend only on the purchased track level, not earnings or region selection. Steps are additive to baseline.\n\n'
report += table(['Track', 'Base cost', 'Cost growth', 'Cap', 'R1', 'R2', 'R3', 'R4', 'R5', 'R6'],
    [[t['name'], t['base'], t['growth'], t['cap'], *[r['core'][j] for r in config['regions']]] for j, t in enumerate(tracks)])
report += '\n\n## Owned skill checkpoints (not equipped simultaneously)\n\n0 = not learned. Passive upgrades to levels 2/3/4/5 cost 600/1,800/6,000/18,000. Active upgrades cost 1,200/4,000/12,000/36,000. Recharge has only level 1.\n\n'
report += table(['Skill', 'Learn cost', 'R1', 'R2', 'R3', 'R4', 'R5', 'R6'],
    [[s['name'], s['learn'], *[r['skills'][j] for r in config['regions']]] for j, s in enumerate(skills)])
report += '\n\n## Assumptions and limits\n\n' + '\n'.join('- ' + s for s in config['assumptions'])
report += '\n- Region-end affordability passes; the exact purchase order and acquisition milestones still need a route model.\n- No-collection and stronger-collection builds earn the same final currency under guaranteed pickup. Collection is convenience, not a money multiplier.\n- Three hundred minutes is explicitly assembled from target attempts, sortie durations and menu budgets. It is not a result predicted by physics.\n- Final physical map size and moving-body load require device validation.\n'
(ROOT / 'REPORT.md').write_text(report)
print(json.dumps(summary, ensure_ascii=False, indent=2))
