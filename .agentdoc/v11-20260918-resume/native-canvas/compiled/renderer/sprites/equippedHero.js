"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EQUIPPED_HERO_PADDING = exports.heroBodyLayers = exports.HERO_HANDS = void 0;
exports.heroEquipmentPose = heroEquipmentPose;
exports.heldWeaponGeometry = heldWeaponGeometry;
exports.drawEquippedHero = drawEquippedHero;
exports.equippedHeroSprite = equippedHeroSprite;
exports.drawBareHero = drawBareHero;
// The published, weapon-bearing form art remains available for old replays.
// New equipment drawing has separate costume, hands and replaceable prop layers.
const equipment_js_1 = require("../../core/equipment.js");
const equipment_js_2 = require("./equipment.js");
const heroForms_js_1 = require("./heroForms.js");
const sprite_js_1 = require("./sprite.js");
exports.HERO_HANDS = [
    [[9, 7], [8, 8]], [[9, 8], [8, 9]], [[5, 6], [5, 7]], [[7, 6], [7, 7]], [[8, 7], [7, 8]],
];
const bodies = new Map();
const blank = () => Array.from({ length: 14 }, () => Array(14).fill('.'));
/** Costume panels have explicit authored boundaries, independent of colour.
 * The old sword, staff, book and gun pixels outside them are never copied.
 * Head and torso are rebuilt before hands, so removing a blade cannot erase skin.
 */
function bodyLayers(formId) {
    const idle = (0, heroForms_js_1.heroFormSprite)(formId), attack = (0, heroForms_js_1.heroFormSprite)(formId, true);
    const original = idle.frames[0];
    const frames = [], hands = [];
    for (let pose = 0; pose < 5; pose++) {
        const cells = blank(), hand = blank();
        const source = pose < 2 ? idle.frames[pose] : attack.frames[pose - 2];
        const bob = pose === 1 ? 1 : 0;
        // The face is never sampled from a raised-weapon composite. Keep the full
        // original head trajectory and all its brim/eye/skin colours.
        for (let y = 0; y < 6; y++) {
            const dx = pose === 2 ? (y < 2 ? 1 : 2) : pose === 3 && y >= 2 ? 1 : 0;
            // Polearm costumes have a separate idle tip at x11..13, y3..6.
            // Other families' wide hat/hair edges in those columns are real costume.
            const headWidth = (0, equipment_js_1.equipmentJob)(formId) === 1 && y >= 3 ? 11 : 14;
            for (let x = 0; x < headWidth; x++)
                if (x + dx < 14)
                    cells[y + bob][x + dx] = original[y][x];
        }
        // Costume/leg envelopes preserve the authored back, sleeves and footwear.
        // Grip-side prop pixels are excluded even when they share a costume colour.
        for (let y = 6 + bob; y < 14; y++) {
            const limit = y >= 10 + bob ? (pose === 2 || pose === 3 ? 12 : 11)
                : pose === 2 ? 10 : pose === 3 ? (y < 8 ? 6 : 8) : pose === 4 ? 8 : 9;
            for (let x = 0; x <= limit; x++)
                cells[y][x] = source[y][x];
        }
        // The abyss knight's diving tank was previously distinguished mostly by
        // its fixed sword. Give the weapon-free costume its own connected tank.
        if (formId === 'h58')
            for (let y = 7; y <= 11; y++) {
                const dx = pose === 2 ? 1 : 0;
                for (let x = 0; x < 3; x++)
                    cells[y][x + dx] = y === 7 || y === 11 || x === 0 ? 'e' : 't';
            }
        for (const [x, y] of exports.HERO_HANDS[pose]) {
            hand[y][x] = 's';
            cells[y][x] = '.';
        }
        frames.push(cells.map(row => row.join('')));
        hands.push(hand.map(row => row.join('')));
    }
    const palette = { ...idle.palette };
    return { body: { w: 14, h: 14, palette, frames }, hands: { w: 14, h: 14, palette, frames: hands } };
}
for (const id of ['h00', ...heroForms_js_1.HERO_FORM_IDS])
    bodies.set(id, bodyLayers(id));
(0, sprite_js_1.registerSprites)(Object.fromEntries([...bodies].flatMap(([id, layers]) => [
    [`hero.${id}.body`, layers.body], [`hero.${id}.hands`, layers.hands],
])));
const heroBodyLayers = (formId) => bodies.get(formId) ?? bodies.get('h00');
exports.heroBodyLayers = heroBodyLayers;
exports.EQUIPPED_HERO_PADDING = { x: 10, y: 2 };
const pixelCache = new WeakMap();
const heldCache = new Map();
const layerCache = new Map();
const compositeCache = new Map();
// Keep only recent combinations: owned IDs, enhancement and elapsed time do
// not create geometry. Even cycling every form/item cannot grow these caches.
function remember(cache, key, value, limit) {
    if (cache.size >= limit)
        cache.delete(cache.keys().next().value);
    cache.set(key, value);
    return value;
}
function heroEquipmentPose(type, attacking, frame) {
    if (!attacking)
        return frame % 2;
    const step = Math.max(0, Math.min(2, frame));
    if (type === 'gun' || type === 'spear' || type === 'dagger')
        return [0, 3, 4][step];
    if (type === 'staff')
        return [0, 2, 4][step];
    return step + 2;
}
function pixels(sprite, frame) {
    const frames = pixelCache.get(sprite) ?? new Map();
    const cached = frames.get(frame);
    if (cached)
        return cached;
    const result = (sprite.frames[frame] ?? []).flatMap((row, y) => [...row].flatMap((key, x) => key !== '.' && sprite.palette[key] ? [{ x, y, color: sprite.palette[key] }] : []));
    frames.set(frame, result);
    pixelCache.set(sprite, frames);
    return result;
}
/** Inverse nearest-neighbor rasterization fills every destination grid cell.
 * Forward stamping rounded source points leaves checkerboard holes on diagonals.
 * The complete source pixel areas are fitted above ground BEFORE rasterization;
 * no output pixels are silently discarded to meet the body-height budget.
 */
function heldWeaponGeometry(item, attacking, frame) {
    const template = (0, equipment_js_1.equipmentTemplate)(item.templateId), icon = (0, equipment_js_2.equipmentIcon)(item.templateId);
    const pose = heroEquipmentPose(template?.weaponType, attacking, frame);
    const key = `${item.templateId}/${pose}/${attacking ? frame : 'idle'}`;
    const cached = heldCache.get(key);
    if (cached)
        return cached;
    if (!template?.weaponType || !icon)
        return { pixels: [], bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } };
    const [hx, hy] = exports.HERO_HANDS[pose][0];
    const type = template.weaponType;
    // Affine columns transform side=(sourceX-7), reach=(12-sourceY).
    let a = .5, b = .5, c = -.5, d = .5, tx = hx, ty = hy;
    if (type === 'gauntlet') {
        a = .75;
        b = 0;
        c = 0;
        d = -.5;
        tx += attacking && frame === 1 ? 1 : 0;
        ty += 2;
    }
    else if (attacking && frame === 1 && type !== 'staff') {
        a = 0;
        b = 1;
        c = 1;
        d = 0;
    }
    else if (pose === 2) {
        a = .5;
        b = -.5;
        c = -.5;
        d = -.5;
    }
    else if (type === 'staff' || type === 'spear') {
        // The shaft pivots on the actual hand. Lean only its upper reach outward
        // so the orb/crook clears the face instead of hiding behind the head.
        a = 1;
        b = .75;
        c = 0;
        d = -1;
    }
    const source = pixels(icon, 0);
    const transformedBounds = () => {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const pixel of source)
            for (const ox of [-.5, .5])
                for (const oy of [-.5, .5]) {
                    const side = pixel.x - 7 + ox, reach = 12 - pixel.y + oy;
                    const x = tx + a * side + b * reach, y = ty + c * side + d * reach;
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                }
        return { minX, minY, maxX, maxY };
    };
    const raw = transformedBounds();
    const fit = Math.min(1, raw.minY < hy ? (hy + .49) / (hy - raw.minY) : 1, raw.maxY > hy ? (13.49 - hy) / (raw.maxY - hy) : 1);
    c *= fit;
    d *= fit;
    ty = hy + (ty - hy) * fit;
    const bounds = transformedBounds(), result = [], determinant = a * d - b * c;
    for (let y = Math.floor(bounds.minY); y <= Math.ceil(bounds.maxY); y++) {
        for (let x = Math.floor(bounds.minX); x <= Math.ceil(bounds.maxX); x++) {
            const dx = x - tx, dy = y - ty;
            const sx = Math.floor(7 + (d * dx - b * dy) / determinant + .5);
            const sy = Math.floor(12 - (-c * dx + a * dy) / determinant + .5);
            const color = icon.palette[icon.frames[0]?.[sy]?.[sx] ?? '.'];
            if (color)
                result.push({ x, y, color });
        }
    }
    return remember(heldCache, key, { pixels: result, bounds }, 640);
}
function layersFor(formId, weapon, opts) {
    const frame = opts.frame ?? 0, attacking = opts.attacking ?? false;
    const template = weapon ? (0, equipment_js_1.equipmentTemplate)(weapon.templateId) : undefined;
    const pose = heroEquipmentPose(template?.weaponType, attacking, frame);
    const key = `${bodies.has(formId) ? formId : 'h00'}/${template?.id ?? (weapon ? 'unknown' : 'bare')}/${attacking ? 'attack/' + frame : 'idle/' + pose}`;
    const cached = layerCache.get(key);
    if (cached)
        return cached;
    const layers = (0, exports.heroBodyLayers)(formId), body = pixels(layers.body, pose);
    let hand = pixels(layers.hands, pose);
    if (!weapon && attacking && frame === 1) {
        // Closed bare fist, not a handle-shaped hand holding an invisible sword.
        const color = layers.hands.palette.s;
        hand = [...hand, { x: 8, y: 6, color }, { x: 8, y: 7, color }, { x: 9, y: 6, color }];
    }
    const prop = weapon ? heldWeaponGeometry(weapon, attacking, frame).pixels : [];
    // The second idle pose moves the entire head down by one pixel.
    const face = new Set(body.filter(p => p.y < 6 + Number(pose === 1)).map(p => `${p.x},${p.y}`));
    const front = prop.filter(p => !face.has(`${p.x},${p.y}`));
    const rarity = template?.rarity, edge = new Map();
    if (rarity === 'rare' || rarity === 'epic') {
        const occupied = new Set(prop.map(p => `${p.x},${p.y}`));
        for (const p of prop)
            for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
                const px = p.x + dx, py = p.y + dy, edgeKey = `${px},${py}`;
                if (!occupied.has(edgeKey))
                    edge.set(edgeKey, { x: px, y: py, color: equipment_js_2.ITEM_RARITY_COLORS[rarity] });
            }
    }
    return remember(layerCache, key, { key, body, hand, prop, front, edge: [...edge.values()], rarity }, 128);
}
/** Body origin remains 14×14; the weapon mirrors around THAT origin as well. */
function drawEquippedHero(ctx, formId, weapon, x, y, opts = {}) {
    const { body, hand, prop, front, edge, rarity } = layersFor(formId, weapon, opts);
    const scale = opts.scale ?? 1;
    const paint = (pixel, color = pixel.color) => {
        ctx.fillStyle = opts.tint ?? color;
        ctx.fillRect(x + (opts.flipX ? 13 - pixel.x : pixel.x) * scale, y + pixel.y * scale, scale, scale);
    };
    if (!opts.tint && (rarity === 'rare' || rarity === 'epic')) {
        const stage = Math.floor((opts.timeMs ?? 0) / 120);
        for (const p of edge)
            paint(p, rarity === 'epic' && (p.x + p.y + stage) % 5 === 0 ? '#fff0cc' : p.color);
    }
    // Put the entire prop behind the body first. Only its unobscured front part
    // and grip reappear on top, so a large headpiece never disappears under a blade.
    for (const p of prop)
        paint(p);
    for (const p of body)
        paint(p);
    for (const p of front)
        paint(p);
    for (const p of hand)
        paint(p);
}
/** Exact composited pixels, including the equipment contour, for fever and KO. */
function equippedHeroSprite(formId, weapon, opts = {}) {
    const layers = layersFor(formId, weapon, opts);
    const stage = !opts.tint && layers.rarity === 'epic' ? ((Math.floor((opts.timeMs ?? 0) / 120) % 5) + 5) % 5 : 0;
    const key = `${layers.key}/${opts.flipX ? 1 : 0}/${opts.tint?.length ?? -1}:${opts.tint ?? ''}/${stage}`;
    const cached = compositeCache.get(key);
    if (cached)
        return cached;
    const points = new Map();
    const ctx = { fillStyle: '', fillRect(x, y) { points.set(`${x},${y}`, { x, y, color: String(ctx.fillStyle) }); } };
    drawEquippedHero(ctx, formId, weapon, exports.EQUIPPED_HERO_PADDING.x, exports.EQUIPPED_HERO_PADDING.y, { ...opts, scale: 1 });
    const palette = {}, keys = new Map();
    const rows = Array.from({ length: 18 }, () => Array(36).fill('.'));
    for (const p of points.values()) {
        if (p.x < 0 || p.x >= 36 || p.y < 0 || p.y >= 18)
            continue;
        if (!keys.has(p.color)) {
            const key = String.fromCharCode(65 + keys.size);
            keys.set(p.color, key);
            palette[key] = p.color;
        }
        rows[p.y][p.x] = keys.get(p.color);
    }
    return remember(compositeCache, key, { w: 36, h: 18, palette, frames: [rows.map(row => row.join(''))] }, 64);
}
/** Draw the weapon-free costume and hands without allocating a composite sprite. */
function drawBareHero(ctx, formId, pose, x, y, opts) {
    const layers = (0, exports.heroBodyLayers)(formId);
    (0, sprite_js_1.drawSprite)(ctx, layers.body, pose, x, y, opts);
    (0, sprite_js_1.drawSprite)(ctx, layers.hands, pose, x, y, opts);
}
