"""Read completed R13 evidence only; no simulator or production imports."""
import hashlib
import json
import math
from collections import Counter
from pathlib import Path

ROOT = Path('.agentdoc/v11-20260918-resume')
RUN = ROOT / 'balance/r13-explore'


def digest(data):
    return hashlib.sha256(data).hexdigest()


def quantiles(values):
    values = sorted(values)
    return {'n': len(values), **{
        f'p{int(p * 100)}': values[math.floor((len(values) - 1) * p)]
        for p in (.1, .5, .9)
    }, 'min': values[0], 'max': values[-1]} if values else {'n': 0}


def hero_percent(damage):
    hero, companion = (int(damage[key]) for key in ('heroApplied', 'companionApplied'))
    return 100 * hero / (hero + companion) if hero + companion else 0


out = {'kind': 'read-only completed R13 reward review', 'humanFun': False,
       'quantiles': 'floor((n-1)*p), same as registered evaluator; no interpolation',
       'unit': 'minutes unless stated otherwise',
       'registration': {name: digest((RUN / name).read_bytes()) for name in (
           'protocol.registered.json', 'candidates.registered.json', 'binding.json')}, 'files': []}
level, xp, milestones = 1, 0, {}
for index in range(368):
    xp += (5 + 3 * index) * (5 if index % 8 == 7 else 1)
    while xp >= math.floor(20 * 1.42 ** (level - 1)):
        xp -= math.floor(20 * 1.42 ** (level - 1))
        level += 1
        milestones[level] = index + 1
assert milestones[25] == 309 and milestones[26] == 368
out['registeredXpAnalysis'] = {
    'basis': 'R13 xpBase20, xpGrowth1.42, xpReward5+3*index, every eighth bossXP multiplier5',
    'sourceHashes': {name: digest((RUN / 'source-core' / name).read_bytes()) for name in ('formulas.ts', 'engine.ts', 'monsters.ts', 'loot.ts')},
    'levelMilestonesAfterKillCount': {str(k): v for k, v in milestones.items() if k >= 21},
    'level25to26Kills': 59, 'level25to26BossGearRollOpportunities': 8,
}
for file in sorted(RUN.glob('*.jsonl')):
    raw = file.read_bytes()
    rows = [json.loads(line) for line in raw.splitlines() if line.strip()]
    assert len(rows) == 20 and [r['seed'] for r in rows] == list(range(120001, 120021))
    assert all(len(r['cycles']) == 3 and r['nonarrival'] == 0 for r in rows)
    cps = [next(cp for cp in r['checkpoints'] if cp['cycle'] == 1 and cp['elapsedMs'] == 1800000) for r in rows]
    group = {'path': str(file), 'sha256': digest(raw), 'n': len(rows),
             'nonarrival': 0, 'growthActions': sum(r['growthConsumes'] for r in rows),
             'firstCompanionMinutes': quantiles([r['firstCompanionMs'] / 60000 for r in rows]),
             'firstCycleLevelMinutes': {level: quantiles([r['cycles'][0]['levelTimesMs'][level] / 60000 for r in rows])
                                        for level in ('15', '20', '21', '22', '23', '24', '25', '26')},
             'cycles': []}
    for index in range(3):
        cycles = [r['cycles'][index] for r in rows]
        damage = [{key: int(r['cycles'][index]['damage'][key]) - (int(r['cycles'][index - 1]['damage'][key]) if index else 0)
                   for key in ('heroApplied', 'companionApplied')} for r in rows]
        assert all(min(d.values()) >= 0 for d in damage)
        group['cycles'].append({
            'number': index + 1, 'intervalMinutes': quantiles([c['intervalMs'] / 60000 for c in cycles]),
            'below120Minutes': sum(c['intervalMs'] < 7200000 for c in cycles),
            'level25to26Minutes': quantiles([(c['levelTimesMs']['26'] - c['levelTimesMs']['25']) / 60000 for c in cycles]),
            'level25to26PercentOfCycle': quantiles([(c['levelTimesMs']['26'] - c['levelTimesMs']['25']) / c['intervalMs'] * 100 for c in cycles]),
            'level20Minutes': quantiles([c['levelTimesMs']['20'] / 60000 for c in cycles]),
            'level21to22Minutes': quantiles([(c['levelTimesMs']['22'] - c['levelTimesMs']['21']) / 60000 for c in cycles]),
            'heroAppliedPercent': quantiles([hero_percent(d) for d in damage]),
            'partyBonusAtEndPercent': quantiles([int(c['field']['partyBonusBps']) / 100 for c in cycles]),
        })
    group['firstCycleAt30Minutes'] = {
        'stage': quantiles([cp['stage'] for cp in cps]), 'levels': dict(Counter(cp['level'] for cp in cps)),
        'roster': quantiles([cp['roster'] for cp in cps]), 'noWeapon': sum(cp['weaponId'] is None for cp in cps),
        'partyBonusPercent': quantiles([int(cp['field']['partyBonusBps']) / 100 for cp in cps]),
        'heroAppliedPercent': quantiles([hero_percent(cp['damage']) for cp in cps]),
    }
    group['firstCycleLevelAt30Seconds'] = dict(Counter(max([1] + [int(level) for level, at in r['cycles'][0]['levelTimesMs'].items() if at <= 30000]) for r in rows))
    group['firstPurchaseBefore30Minutes'] = sum(r['firstPurchaseMs'] is not None and r['firstPurchaseMs'] <= 1800000 for r in rows)
    group['firstPurchaseBeforeFirstRebirth'] = sum(r['firstPurchaseMs'] is not None and r['firstPurchaseMs'] < r['cycles'][0]['acceptedAtMs'] for r in rows)
    group['neverPurchasedInThreeCycles'] = sum(r['firstPurchaseMs'] is None for r in rows)
    group['firstPurchaseMinutesAmongPurchasers'] = quantiles([r['firstPurchaseMs'] / 60000 for r in rows if r['firstPurchaseMs'] is not None])
    deltas, gear_windows = [], []
    for row in rows:
        checkpoints = sorted((cp for cp in row['checkpoints'] if cp['cycle'] == 1), key=lambda cp: cp['elapsedMs'])
        deltas.extend(b['kills'] - a['kills'] for a, b in zip(checkpoints, checkpoints[1:]) if b['elapsedMs'] - a['elapsedMs'] == 1800000)
        changes = [b['elapsedMs'] / 60000 for a, b in zip(checkpoints, checkpoints[1:])
                   if a['weaponId'] != b['weaponId'] or a['spent'] != b['spent']
                   or a['field']['partyBonusBps'] != b['field']['partyBonusBps']]
        gear_windows.append({'seed': row['seed'], 'changedWindowsEndingAtMinutes': changes})
    group['pooledFirstCycleKillsPer30MinutesAfterMinute30'] = quantiles(deltas)
    group['firstCycleObservedEquipmentOrSpendingWindows'] = gear_windows
    group['wholeRunLongestKillGapMinutes'] = quantiles([r['longestKillGapMs'] / 60000 for r in rows])
    worst = max(rows, key=lambda r: r['longestKillGapMs'])
    group['worstKillGap'] = {'seed': worst['seed'], **worst['longestKillGapContext']}
    group['worstGapIsBossCount'] = sum(bool(r['longestKillGapContext']['boss']) for r in rows)
    group['unchangedAfterRead'] = digest(file.read_bytes()) == group['sha256']
    assert group['unchangedAfterRead']
    out['files'].append(group)
assert len(out['files']) == 9
out['growthScreen'] = []
for file in sorted((ROOT / 'balance/r14-growth-screen').glob('*.jsonl')):
    raw = file.read_bytes()
    rows = [json.loads(line) for line in raw.splitlines() if line.strip()]
    assert len(rows) == 1 and rows[0]['seed'] == 120001
    row = rows[0]
    out['growthScreen'].append({'path': str(file), 'sha256': digest(raw), 'n': 1,
        'seed': row['seed'], 'profile': row['profile'], 'cyclesWanted': row['cyclesWanted'],
        'completedIntervalsMinutes': [c['intervalMs'] / 60000 for c in row['cycles']],
        'nonarrival': row['nonarrival'], 'durationMinutes': row['durationMs'] / 60000,
        'growthConsumes': row['growthConsumes'], 'finalRoster': row['final']['companions'],
        'finalStage': row['final']['stage'], 'finalLevel': row['final']['level']})
    assert digest(file.read_bytes()) == digest(raw)
assert len(out['growthScreen']) == 9
(ROOT / 'reviews/DESIGNER_R13_REWARD_REVIEW.json').write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n')
print('Read-only R13 analysis: 9 complete files, 180 trajectories using the same20 seeds, 540 completed cycles; plus9 separate single-seed R14 growth screens. Raw hashes unchanged.')
