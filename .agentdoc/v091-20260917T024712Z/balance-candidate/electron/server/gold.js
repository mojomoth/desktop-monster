"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.goldStake = exports.lossRemaining = exports.publicGold = exports.DEFENSE_INBOX_MAX = exports.DEFENSE_COOLDOWN_MS = exports.GOLD_PAIR_MS = exports.GOLD_DAILY_LOSS = exports.GOLD_DAILY_GAIN = exports.GOLD_PER_BATTLE = exports.GOLD_KEEP = void 0;
exports.currentGold = currentGold;
exports.raidGold = raidGold;
exports.GOLD_KEEP = 75;
exports.GOLD_PER_BATTLE = 75;
exports.GOLD_DAILY_GAIN = 250;
exports.GOLD_DAILY_LOSS = 250;
exports.GOLD_PAIR_MS = 3_600_000;
exports.DEFENSE_COOLDOWN_MS = 60_000;
exports.DEFENSE_INBOX_MAX = 5;
const DAY_MS = 86_400_000;
function currentGold(value, at) {
    const account = value ? structuredClone(value) : {
        revision: 0, net: '0', balance: 0, enrolled: false, day: -1, peak: 0, gained: 0, lost: 0,
        pairs: {}, lastDefenseAt: null, eventSeq: 0, events: [],
    };
    const day = Math.floor(at / DAY_MS);
    if (account.day < day) {
        account.day = day;
        account.peak = account.balance;
        account.gained = 0;
        account.lost = 0;
    }
    account.peak = Math.max(account.peak, account.balance);
    return account;
}
const publicGold = (value) => ({
    revision: value?.revision ?? 0, net: value?.net ?? '0', balance: value?.balance ?? 0,
});
exports.publicGold = publicGold;
const lossRemaining = (value) => Math.max(0, Math.min(exports.GOLD_DAILY_LOSS, Math.floor(value.peak / 10)) - value.lost);
exports.lossRemaining = lossRemaining;
const goldStake = (value) => Math.min(Math.floor(value.balance / 20), exports.GOLD_PER_BATTLE, Math.max(0, value.balance - exports.GOLD_KEEP), (0, exports.lossRemaining)(value));
exports.goldStake = goldStake;
function raidGold(attacker, defender, attackerId, defenderId, won, at) {
    const loser = won ? defender : attacker, winner = won ? attacker : defender;
    const recent = attacker.pairs[defenderId] ?? defender.pairs[attackerId];
    let reason = 'transfer';
    if (recent !== undefined && at - recent < exports.GOLD_PAIR_MS)
        reason = 'pair-protection';
    else if (attacker.balance <= exports.GOLD_KEEP || loser.balance <= exports.GOLD_KEEP)
        reason = 'protected';
    else if ((0, exports.lossRemaining)(attacker) === 0 || (0, exports.lossRemaining)(loser) === 0 || winner.gained >= exports.GOLD_DAILY_GAIN)
        reason = 'daily-limit';
    else if (winner.balance === Number.MAX_SAFE_INTEGER)
        reason = 'capacity';
    const amount = reason === 'transfer' ? Math.min((0, exports.goldStake)(attacker), (0, exports.goldStake)(loser), exports.GOLD_DAILY_GAIN - winner.gained, Number.MAX_SAFE_INTEGER - winner.balance) : 0;
    if (amount === 0 && reason === 'transfer')
        reason = 'protected';
    if (amount > 0) {
        loser.balance -= amount;
        winner.balance += amount;
        loser.net = String(BigInt(loser.net) - BigInt(amount));
        winner.net = String(BigInt(winner.net) + BigInt(amount));
        loser.lost += amount;
        winner.gained += amount;
        winner.peak = Math.max(winner.peak, winner.balance);
        for (const account of [attacker, defender])
            account.pairs = Object.fromEntries(Object.entries(account.pairs).filter(([, previous]) => at - previous < exports.GOLD_PAIR_MS));
        attacker.pairs[defenderId] = at;
        defender.pairs[attackerId] = at;
    }
    return { amount, delta: amount === 0 ? 0 : won ? amount : -amount, reason };
}
