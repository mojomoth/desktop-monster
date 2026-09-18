import type { Store } from '../../src/server/store.js';

/** Seed a pre-upgrade committed transfer; the new endpoint must never create one. */
export async function legacyTheft(store: Store, attackerId: string, defenderId: string, originalId: string, at = 1000) {
  return store.transaction(async tx => {
    const attacker = (await tx.getById(attackerId))!;
    const defender = (await tx.getById(defenderId))!;
    const original = defender.snapshot!.companions.find(c => c.id === originalId)!;
    const transferred = { ...original, id: await tx.allocateTransferId(attackerId, 's', 7) };
    const theftId = await tx.allocateTransferId(defenderId, 't', 7);
    await tx.putSnapshot(attackerId, { ...attacker.snapshot!, companions: [...attacker.snapshot!.companions, transferred] });
    await tx.setThefts(defenderId, [...defender.thefts, { id: theftId, companion: original, transferredId: transferred.id,
      thiefId: attackerId, thiefName: attacker.name, at, reclaimUntil: at + 86_400_000 }]);
    return { transferred, theftId };
  });
}
