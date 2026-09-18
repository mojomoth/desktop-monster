import { describe, expect, it } from 'vitest';
import { canEquip, EQUIPMENT_CATALOG, RARITY_COLORS, WEAPON_TYPES } from '../src/core/equipment.js';
import type { EquipmentItem } from '../src/core/equipment.js';
import { equipmentIcon } from '../src/renderer/sprites/equipment.js';
import { drawEquippedHero, EQUIPPED_HERO_PADDING, equippedHeroSprite, HERO_HANDS, heroBodyLayers, heroEquipmentPose, heldWeaponGeometry } from '../src/renderer/sprites/equippedHero.js';
import { HERO_FORM_IDS, heroFormSprite } from '../src/renderer/sprites/heroForms.js';
import { heroInput, tickHero } from '../src/core/fsm.js';

const item = (templateId: string): EquipmentItem => ({ id: 'e1', templateId, enhancement: '0', roll: 100, seed: 1, attempts: '0' });
const mask = (rows: string[]): string => rows.map(row => row.replace(/[^.]/g, '#')).join('/');
function components(points: readonly { x: number; y: number }[]): number {
  const remaining = new Set(points.map(p => `${p.x},${p.y}`)); let count = 0;
  while (remaining.size) {
    count++; const queue = [remaining.values().next().value!]; remaining.delete(queue[0]!);
    while (queue.length) {
      const [x, y] = queue.pop()!.split(',').map(Number);
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const key = `${x! + dx!},${y! + dy!}`;
        if (remaining.delete(key)) queue.push(key);
      }
    }
  }
  return count;
}
function drawing(id: string, weapon: EquipmentItem | null, attacking = false, frame = 0, flipX = false): Map<string, string> {
  const result = new Map<string, string>();
  const ctx = { fillStyle: '', fillRect(x: number, y: number, w: number, h: number) {
    if (w !== 2 || h !== 2 || !Number.isInteger(x / 2) || !Number.isInteger(y / 2)) throw Error('Noninteger art pixel');
    result.set(`${x},${y}`, ctx.fillStyle);
  } };
  drawEquippedHero(ctx, id, weapon, 0, 0, { scale: 2, attacking, frame, flipX }); return result;
}

describe('v0.10 equipment production art', () => {
  it('registers 224 structurally distinct icons, not palette swaps', () => {
    expect(EQUIPMENT_CATALOG.filter(t => t.kind === 'weapon')).toHaveLength(128);
    expect(EQUIPMENT_CATALOG.filter(t => t.kind === 'accessory')).toHaveLength(96);
    const seen = new Map<string, string>(), duplicates: string[] = [];
    for (const template of EQUIPMENT_CATALOG) {
      const sprite = equipmentIcon(template.id)!;
      expect(sprite, template.id).toBeDefined(); expect([sprite.w, sprite.h]).toEqual([16, 16]);
      for (const row of sprite.frames[0]!) {
        expect(row).toHaveLength(16);
        for (const char of row.replaceAll('.', '')) expect(sprite.palette[char]).toMatch(/^#[a-f0-9]{6}$/);
      }
      const shape = mask(sprite.frames[0]!);
      if (seen.has(shape)) duplicates.push(`${template.id} = ${seen.get(shape)}`);
      seen.set(shape, template.id);
    }
    expect(duplicates).toEqual([]);
  });

  it('preserves all 71 complete costumes and separate skin-coloured hands', () => {
    const seen = new Map<string, string>(), duplicates: string[] = [];
    for (const id of ['h00', ...HERO_FORM_IDS]) {
      const { body, hands } = heroBodyLayers(id);
      expect(body.frames).toHaveLength(5); expect(hands.frames).toHaveLength(5);
      const original = heroFormSprite(id).frames[0]!;
      const polearmCostumes = ['h02', 'h12', 'h22', 'h32', 'h42', 'h56', 'h59'];
      for (let y = 0; y < 6; y++) {
        const expected = polearmCostumes.includes(id) && y >= 3 ? original[y]!.slice(0, 11) + '...' : original[y];
        expect(body.frames[0]![y], `${id}: keep complete head, remove authored polearm tip`).toBe(expected);
      }
      for (let frame = 0; frame < 5; frame++) {
        expect(body.frames[frame]).toHaveLength(14);
        for (const row of body.frames[frame]!) expect(row).toHaveLength(14);
        for (const [x, y] of HERO_HANDS[frame]!) {
          expect(body.frames[frame]![y]![x]).toBe('.'); expect(hands.frames[frame]![y]![x]).toBe('s');
        }
        expect(body.frames[frame]![13]!.replaceAll('.', '')).not.toBe('');
      }
      const shape = mask(body.frames[0]!);
      if (seen.has(shape)) duplicates.push(`${id} = ${seen.get(shape)}`); seen.set(shape, id);
      // No old held prop survives to the right of the idle grip or feet.
      expect(body.frames[0]!.slice(6, 10).every(row => row.slice(10) === '....')).toBe(true);
      expect(body.frames[0]!.slice(10).every(row => row.slice(12) === '..')).toBe(true);
    }
    expect(duplicates).toEqual([]);
  });

  it('proves all eight representative motions and every h00 weapon at all five poses in both directions', () => {
    expect(new Set(EQUIPMENT_CATALOG.filter(t => t.kind === 'weapon').map(t => t.weaponType))).toEqual(new Set(WEAPON_TYPES));
    for (const template of EQUIPMENT_CATALOG.filter(t => t.kind === 'weapon')) {
      const weapon = item(template.id);
      for (let pose = 0; pose < 5; pose++) {
        const attacking = pose >= 2, frame = attacking ? pose - 2 : pose;
        const normal = drawing('h00', weapon, attacking, frame);
        const flipped = drawing('h00', weapon, attacking, frame, true);
        expect(normal.size, `${template.id}/${pose}`).toBeGreaterThan(50);
        expect([...normal].every(([key, color]) => {
          const [x, y] = key.split(',').map(Number);
          return flipped.get(`${26 - x!},${y}`) === color;
        }), `${template.id}/${pose}: mirror pivots around the body`).toBe(true);
        const handPose = heroEquipmentPose(template.weaponType, attacking, frame);
        for (const [x, y] of HERO_HANDS[handPose]!) expect(normal.get(`${x * 2},${y * 2}`)).toBe(heroBodyLayers('h00').hands.palette.s);
      }
    }
  });

  it('finishes each swing under rapid input with only one queued swing', () => {
    let anim = heroInput();
    const frames = new Set<number>();
    for (let time = 0; time < 180; time += 10) {
      anim = heroInput(anim); frames.add(Math.floor(anim.t / 60)); anim = tickHero(anim, 10);
    }
    expect(frames).toEqual(new Set([0, 1, 2])); expect(anim).toEqual({ state: 'attack', t: 0 });
    anim = tickHero(anim, 180); expect(anim).toEqual({ state: 'idle', t: 0 });
  });

  it('keeps both hands attached to every costume throughout the five body poses', () => {
    const detached: string[] = [];
    for (const id of ['h00', ...HERO_FORM_IDS]) for (let pose = 0; pose < 5; pose++) {
      const rows = heroBodyLayers(id).body.frames[pose]!;
      for (const [x, y] of HERO_HANDS[pose]!) {
        if (![-1, 0, 1].some(dy => [-1, 0, 1].some(dx => {
          const pixel = rows[y + dy]?.[x + dx]; return pixel !== undefined && pixel !== '.';
        }))) detached.push(`${id}/${pose}/${x},${y}`);
      }
    }
    expect(detached).toEqual([]);
  });

  it('renders every compatible hero/weapon pairing with visible grips, integer pixels and grounded feet', () => {
    let pairings = 0;
    for (const id of ['h00', ...HERO_FORM_IDS]) for (const template of EQUIPMENT_CATALOG) {
      if (template.kind !== 'weapon' || !canEquip(item(template.id), id, 1000)) continue;
      pairings++;
      for (let pose = 0; pose < 5; pose++) {
        const attacking = pose >= 2, frame = attacking ? pose - 2 : pose;
        const drawn = drawing(id, item(template.id), attacking, frame);
        const handPose = heroEquipmentPose(template.weaponType, attacking, frame);
        const rows = heroBodyLayers(id).body.frames[handPose]!;
        for (const [x, y] of HERO_HANDS[handPose]!) {
          if (drawn.get(`${x * 2},${y * 2}`) !== heroBodyLayers(id).hands.palette.s) throw Error(`Hidden grip ${id}/${template.id}/${pose}`);
        }
        if (![...drawn].some(([key]) => key.endsWith(',26')) || !rows[13]!.replaceAll('.', '')) throw Error(`Ungrounded ${id}/${template.id}/${pose}`);
        if ([...drawn.keys()].some(key => Number(key.split(',')[1]) > 28)) throw Error(`Clipped ${id}/${template.id}/${pose}`);
      }
    }
    expect(pairings).toBeGreaterThan(2000);
  });

  it('gives every rare/epic weapon a contour in all five poses while keeping skin visible', () => {
    for (const template of EQUIPMENT_CATALOG.filter(t => t.kind === 'weapon' && (t.rarity === 'rare' || t.rarity === 'epic'))) {
      for (let pose = 0; pose < 5; pose++) {
        const drawn = drawing('h00', item(template.id), pose >= 2, pose >= 2 ? pose - 2 : pose);
        expect([...drawn.values()].includes(RARITY_COLORS[template.rarity]), `${template.id}/${pose}`).toBe(true);
      }
    }
  });

  it('fits every complete source pixel area above ground without cropping the rasterized weapon', () => {
    for (const template of EQUIPMENT_CATALOG.filter(t => t.kind === 'weapon')) for (let pose = 0; pose < 5; pose++) {
      const geometry = heldWeaponGeometry(item(template.id), pose >= 2, pose >= 2 ? pose - 2 : pose);
      expect(geometry.bounds.minY, `${template.id}/${pose} top`).toBeGreaterThanOrEqual(-.4900001);
      expect(geometry.bounds.maxY, `${template.id}/${pose} bottom`).toBeLessThanOrEqual(13.4900001);
      expect(geometry.pixels.every(p => Number.isInteger(p.x) && Number.isInteger(p.y) && p.y >= 0 && p.y <= 13)).toBe(true);
    }
  });

  it('rasterizes solid greatsword and gun silhouettes without checkerboard fragmentation', () => {
    const broken: string[] = [];
    for (const template of EQUIPMENT_CATALOG.filter(t => t.weaponType === 'greatsword' || t.weaponType === 'gun')) {
      const source = equipmentIcon(template.id)!.frames[0]!.flatMap((row, y) => [...row].flatMap((key, x) => key === '.' ? [] : [{ x, y }]));
      for (let pose = 0; pose < 5; pose++) {
        const held = heldWeaponGeometry(item(template.id), pose >= 2, pose >= 2 ? pose - 2 : pose);
        if (components(held.pixels) > components(source)) broken.push(`${template.id}/${pose}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it('keeps all 128 held weapons structurally distinct across their five poses without rarity contours or colors', () => {
    const seen = new Map<string, string>(), duplicates: string[] = [];
    for (const template of EQUIPMENT_CATALOG.filter(t => t.kind === 'weapon')) {
      const signature = Array.from({ length: 5 }, (_, pose) => heldWeaponGeometry(item(template.id), pose >= 2, pose >= 2 ? pose - 2 : pose)
        .pixels.map(p => `${p.x},${p.y}`).sort().join('/')).join('|');
      if (seen.has(signature)) duplicates.push(`${template.id} = ${seen.get(signature)}`);
      seen.set(signature, template.id);
    }
    expect(duplicates).toEqual([]);
  });

  it('preserves every visible weapon and contour pixel in fever/KO composites in both directions', () => {
    for (const template of EQUIPMENT_CATALOG.filter(t => t.kind === 'weapon')) for (let pose = 0; pose < 5; pose++) for (const flipX of [false, true]) {
      const attacking = pose >= 2, frame = attacking ? pose - 2 : pose, weapon = item(template.id);
      const direct = drawing('h00', weapon, attacking, frame, flipX);
      const sprite = equippedHeroSprite('h00', weapon, { attacking, frame, flipX });
      expect([...direct].every(([key, color]) => {
        const [x, y] = key.split(',').map(Number);
        const pixel = sprite.frames[0]?.[y! / 2 + EQUIPPED_HERO_PADDING.y]?.[x! / 2 + EQUIPPED_HERO_PADDING.x];
        return pixel !== undefined && sprite.palette[pixel] === color;
      }), `${template.id}/${pose}/${flipX}: no composite clipping`).toBe(true);
    }
  });

  it('joins an actually visible prop pixel to both hands in every weapon family and pose', () => {
    const detached: string[] = [];
    for (const template of EQUIPMENT_CATALOG.filter(t => t.kind === 'weapon')) for (let pose = 0; pose < 5; pose++) {
      const attacking = pose >= 2, frame = attacking ? pose - 2 : pose, weapon = item(template.id);
      const rendered = drawing('h00', weapon, attacking, frame), geometry = heldWeaponGeometry(weapon, attacking, frame);
      for (const [hx, hy] of HERO_HANDS[heroEquipmentPose(template.weaponType, attacking, frame)]!) {
        if (!geometry.pixels.some(p => Math.max(Math.abs(p.x - hx), Math.abs(p.y - hy)) === 1 &&
          rendered.get(`${p.x * 2},${p.y * 2}`) === p.color)) detached.push(`${template.id}/${pose}/${hx},${hy}`);
      }
    }
    expect(detached).toEqual([]);
  });

  it('shows the staff jewel beyond the face in both idle frames and recovery', () => {
    for (const template of EQUIPMENT_CATALOG.filter(t => t.weaponType === 'staff')) for (const pose of [0, 1, 4]) {
      const rendered = drawing('h00', item(template.id), pose >= 2, pose >= 2 ? pose - 2 : pose);
      expect([...rendered.values()].includes(equipmentIcon(template.id)!.palette.j!), `${template.id}/${pose}: visible staff head`).toBe(true);
    }
  });
});
