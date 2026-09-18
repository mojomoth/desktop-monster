import { describe, expect, it } from 'vitest';
import { conditionStatus, fieldPhase, FIELD_PHASE_MS, FIELD_PHASES, RARE_HERO_FORMS, RARE_MONSTERS, requirementsMet } from '../src/core/discovery.js';
import type { DiscoveryContext, Requirement } from '../src/core/discovery.js';
import { COMMON_SPECIES_IDS, SPECIES_IDS, monsterForIndex, typeOf, sizeOf, attackDelayOf } from '../src/core/monsters.js';

const context = (): DiscoveryContext => ({
  killCount: 0, playTimeMs: 0, speciesKills: {}, elementKills: { fire: 0, water: 0, wind: 0, earth: 0, dark: 0 },
  heroCounts: {}, heroFamilyHistory: Array<number>(10).fill(0), reincarnations: 0, uniqueHeroes: 0,
  seenMonsters: [], seenHeroes: [], pvpWins: 0, goldSpent: 0,
});
function witness(requirement: Requirement, target = 'count' in requirement ? requirement.count : 1): DiscoveryContext {
  const c = context();
  switch (requirement.kind) {
    case 'speciesKills': c.speciesKills = { [requirement.id]: target }; break;
    case 'elementKills': c.elementKills = { ...c.elementKills, [requirement.element]: target }; break;
    case 'heroHistory': c.heroCounts = { [requirement.id]: target }; break;
    case 'heroFamilyHistory': c.heroFamilyHistory = Array.from({ length: 10 }, (_, i) => i === requirement.family ? target : 0); break;
    case 'totalKills': c.killCount = target; break;
    case 'reincarnations': c.reincarnations = target; break;
    case 'uniqueHeroes': c.uniqueHeroes = target; break;
    case 'playTimeMs': c.playTimeMs = target; break;
    case 'seenMonsters': c.seenMonsters = COMMON_SPECIES_IDS.slice(0, target); break;
    case 'goldSpent': c.goldSpent = target; break;
    case 'pvpWins': c.pvpWins = target; break;
    case 'equippedType': if (target) c.equippedType = requirement.element; break;
    case 'phase': c.playTimeMs = ((FIELD_PHASES.indexOf(requirement.phase) + (target ? 0 : 1)) % 4) * FIELD_PHASE_MS; break;
  }
  return c;
}

describe('v0.5 discoverable content and the shared condition evaluator', () => {
  it('adds exactly twenty rare heroes and thirty monsters with five balanced elements', () => {
    expect(RARE_HERO_FORMS.map(h => h.id)).toEqual(Array.from({ length: 20 }, (_, i) => `h${i + 51}`));
    expect(RARE_MONSTERS).toHaveLength(30);
    expect(new Set(RARE_MONSTERS.map(m => m.id)).size).toBe(30);
    for (const type of ['fire', 'water', 'wind', 'earth', 'dark']) {
      const heroes = RARE_HERO_FORMS.filter(h => h.type === type);
      expect(heroes.map(h => h.rank)).toEqual([2, 3, 4, 5]);
      expect(heroes.map(h => h.buff)).toEqual(['element', 'party', 'element', 'party']);
      expect(RARE_MONSTERS.filter(m => m.type === type)).toHaveLength(6);
    }
    for (const entry of [...RARE_HERO_FORMS, ...RARE_MONSTERS]) {
      expect(entry.description.length).toBeGreaterThan(10);
      expect(entry.requirements.length).toBeGreaterThan(0);
      expect(requirementsMet(entry.requirements)).toBe(false);
    }
  });

  it('has an exact satisfying and immediately failing witness for every requirement of all fifty entries', () => {
    for (const entry of [...RARE_HERO_FORMS, ...RARE_MONSTERS]) {
      for (const rule of entry.requirements) {
        const target = 'count' in rule ? rule.count : 1;
        const yes = conditionStatus(rule, witness(rule));
        expect(yes.met, `${entry.id}:${rule.kind}`).toBe(true);
        expect(yes.current, entry.id).toBe(target);
        expect(yes.target, entry.id).toBe(target);
        expect(yes.label.length).toBeGreaterThan(0);
        expect(conditionStatus(rule, witness(rule, target - 1)).met, `${entry.id}:${rule.kind} threshold`).toBe(false);
      }
    }
  });

  it('every complete catalog condition has a reachable witness and no required rare-content cycles', () => {
    for (const entry of [...RARE_HERO_FORMS, ...RARE_MONSTERS]) {
      const c = context();
      c.killCount = 30_000; c.playTimeMs = 4_800_000; c.reincarnations = 100; c.uniqueHeroes = 50;
      c.heroCounts = Object.fromEntries(Array.from({ length: 50 }, (_, i) => [`h${String(i + 1).padStart(2, '0')}`, 10]));
      c.heroFamilyHistory = Array<number>(10).fill(50); c.goldSpent = 10_000; c.seenMonsters = COMMON_SPECIES_IDS;
      c.speciesKills = Object.fromEntries(COMMON_SPECIES_IDS.map(id => [id, 100]));
      c.elementKills = { fire: 1_000, water: 1_000, wind: 1_000, earth: 1_000, dark: 1_000 };
      for (const rule of entry.requirements) {
        if (rule.kind === 'phase') c.playTimeMs += FIELD_PHASES.indexOf(rule.phase) * FIELD_PHASE_MS;
        if (rule.kind === 'equippedType') c.equippedType = rule.element;
        if (rule.kind === 'speciesKills') expect(COMMON_SPECIES_IDS as readonly string[]).toContain(rule.id);
        if (rule.kind === 'heroHistory') expect(Number(rule.id.slice(1))).toBeLessThanOrEqual(50);
      }
      expect(requirementsMet(entry.requirements, c), entry.id).toBe(true);
    }
  });

  it('exact hero history does not accept another form in the same family', () => {
    const requirements = RARE_HERO_FORMS.find(h => h.id === 'h52')!.requirements;
    const c = context(); c.heroCounts = { h11: 2 }; c.heroFamilyHistory = [2];
    expect(requirementsMet(requirements, c)).toBe(false);
    c.heroCounts = { h01: 2 };
    expect(requirementsMet(requirements, c)).toBe(true);
  });

  it('PvP conditions have practical offline alternatives, each checked at its exact threshold', () => {
    for (const entry of [...RARE_HERO_FORMS, ...RARE_MONSTERS]) {
      for (const rule of entry.requirements) {
        if (rule.kind !== 'pvpWins') continue;
        const c = context(); c.killCount = rule.fallbackKills - 1;
        expect(conditionStatus(rule, c).met, entry.id).toBe(false);
        c.killCount++;
        expect(conditionStatus(rule, c).met, entry.id).toBe(true);
        expect(c.pvpWins).toBe(0);
      }
    }
  });

  it('uses only saved active time for the four five-minute phases, including wrapping', () => {
    for (let i = 0; i < 8; i++) {
      expect(fieldPhase(i * FIELD_PHASE_MS)).toBe(FIELD_PHASES[i % 4]);
      expect(fieldPhase((i + 1) * FIELD_PHASE_MS - 1)).toBe(FIELD_PHASES[i % 4]);
    }
    expect(fieldPhase(-1)).toBe('dawn');
  });

  it('never mistakes object prototype properties or duplicate sightings for progress', () => {
    expect(conditionStatus({ kind: 'speciesKills', id: 'toString', count: 1 }, context()).met).toBe(false);
    const c = context(); c.seenMonsters = ['slime', 'slime'];
    expect(conditionStatus({ kind: 'seenMonsters', count: 2 }, c).met).toBe(false);
  });

  it('retains the original 105-species save/tier cycle and registers all thirty explicit rares', () => {
    expect(COMMON_SPECIES_IDS).toHaveLength(105);
    expect(SPECIES_IDS.slice(0, 105)).toEqual(COMMON_SPECIES_IDS);
    expect(SPECIES_IDS).toHaveLength(135);
    for (let i = 0; i < 315; i++) {
      const m = monsterForIndex(i);
      expect(m.speciesId).toBe(COMMON_SPECIES_IDS[i % 105]);
      expect(m.tier).toBe(Math.floor(i / 105));
    }
    for (const m of RARE_MONSTERS) {
      expect(typeOf(m.id)).toBe(m.type); expect(sizeOf(m.id)).toBe(m.size); expect(attackDelayOf(m.id)).toBe(m.attackDelayMs);
      const rare = monsterForIndex(111, m.id), normal = monsterForIndex(111, 'slime');
      expect(rare.maxHp).toBe(normal.maxHp); expect(rare.boss).toBe(true); expect(rare.tier).toBe(1);
      expect(rare.name).toContain(m.name);
    }
  });
});
