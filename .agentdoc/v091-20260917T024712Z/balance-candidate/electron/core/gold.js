"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unsignedGold = exports.signedGold = void 0;
exports.settlePvpGold = settlePvpGold;
const signedGold = (value) => typeof value === 'string' && /^(0|-?[1-9][0-9]*)$/.test(value) && value.replace('-', '').length <= 40;
exports.signedGold = signedGold;
const unsignedGold = (value) => typeof value === 'string' && /^(0|[1-9][0-9]*)$/.test(value) && value.length <= 128;
exports.unsignedGold = unsignedGold;
function settlePvpGold(state, net) {
    const previous = state.pvpGoldNet ?? '0';
    const debt = state.pvpGoldDebt ?? '0';
    if (!(0, exports.signedGold)(net) || !(0, exports.signedGold)(previous) || !(0, exports.unsignedGold)(debt) ||
        !Number.isSafeInteger(state.coins) || state.coins < 0)
        return { error: 'Invalid gold ledger' };
    const total = BigInt(state.coins) - BigInt(debt) + BigInt(net) - BigInt(previous);
    if (total > BigInt(Number.MAX_SAFE_INTEGER) || total < 0n && String(-total).length > 128)
        return { error: 'Gold balance limit reached' };
    return { coins: total > 0n ? Number(total) : 0, pvpGoldNet: net,
        pvpGoldDebt: total < 0n ? String(-total) : '0' };
}
