// Equipment is authored as pixel geometry. Tier changes the working part and
// rarity changes its guard/mount: no numbered pixels or recolour-only variants.
import { EQUIPMENT_CATALOG, equipmentTemplate, RARITY_COLORS } from '../../core/equipment.js';
import { drawSprite, registerSprites } from './sprite.js';
export const ITEM_RARITY_COLORS = RARITY_COLORS;
const RARITIES = ['common', 'uncommon', 'rare', 'epic'];
const metals = ['#a2adb8', '#b8ccba', '#c4c7e4', '#ead39d'];
const accents = ['#8b6247', '#538d7f', '#8557b1', '#c57536'];
const grid = () => Array.from({ length: 16 }, () => Array(16).fill('.'));
const put = (g, x, y, c) => { if (g[y]?.[x] !== undefined)
    g[y][x] = c; };
const box = (g, x, y, w, h, c) => {
    for (let dy = 0; dy < h; dy++)
        for (let dx = 0; dx < w; dx++)
            put(g, x + dx, y + dy, c);
};
const line = (g, x, y, endX, endY, c) => {
    const n = Math.max(Math.abs(endX - x), Math.abs(endY - y));
    for (let i = 0; i <= n; i++)
        put(g, Math.round(x + (endX - x) * i / Math.max(1, n)), Math.round(y + (endY - y) * i / Math.max(1, n)), c);
};
function outline(source) {
    const result = source.map(row => [...row]);
    for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++)
            if (source[y][x] !== '.') {
                for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
                    if (result[y + dy]?.[x + dx] === '.')
                        result[y + dy][x + dx] = 'e';
                }
            }
    return result;
}
/** Eight working silhouettes, each with four structural blade/head profiles. */
function weapon(type, tier, rank) {
    const g = grid(), top = 4 - tier;
    // Every weapon uses the same icon grip, including staff and hammer hafts.
    box(g, 7, 9, 1, 5, 'a');
    put(g, 7, 13, 'w');
    if (type === 'sword' || type === 'greatsword' || type === 'dagger') {
        const width = type === 'greatsword' ? 3 : type === 'dagger' ? 2 : 1;
        const tip = type === 'dagger' ? top + 3 : top;
        for (let y = tip; y <= 9; y++) {
            const half = y === tip ? 0 : width;
            box(g, 7 - half, y, half * 2 + 1, 1, 'm');
            put(g, 7 - half, y, 'w');
            if (tier >= 2 && y > tip + 1 && y % 2 === 0)
                put(g, 7 + half, y, '.');
        }
        box(g, 5 - rank, 10, 5 + rank * 2, 1, 'a');
        if (rank > 0) {
            put(g, 5 - rank, 9, 'a');
            put(g, 9 + rank, 9 - (rank > 1 ? 1 : 0), 'a');
        }
        if (rank === 3) {
            put(g, 6, 11, 'j');
            put(g, 8, 11, 'j');
        }
        if (type === 'dagger') {
            put(g, 8 + tier, 7, 'm');
            put(g, 8 + tier, 8, 'w');
        }
    }
    else if (type === 'spear') {
        box(g, 7, 4, 1, 6, 'a');
        line(g, 7, top, 5 - Math.floor(tier / 2), 6, 'w');
        line(g, 7, top, 9 + Math.floor(tier / 2), 6, 'm');
        box(g, 6, 5, 3, 2, 'm');
        put(g, 7, top, 'w');
        for (let i = 0; i <= rank; i++) {
            put(g, 5 - i, 7 - i, 'a');
            put(g, 9 + i, 7 - i, 'a');
        }
        if (rank > 0) {
            line(g, 7, 8, 8 + rank, 8, 'a');
            box(g, 8 + rank, 8, 1, 2 + rank, 'j');
        }
    }
    else if (type === 'gun') {
        box(g, 5, top + 1, 3 + Math.floor(tier / 2), 8 - top, 'm');
        box(g, 5, top, 3, 1, 'w');
        box(g, 8, 7, 2 + tier, 3, 'm');
        box(g, 6, 9, 2, 4, 'a');
        put(g, 8, 11, 'a');
        box(g, 3 - Math.floor(rank / 2), 5, 2 + Math.floor(rank / 2), rank + 1, 'a');
        if (rank > 0)
            put(g, 10 + tier, 7, 'w');
        if (rank === 3)
            box(g, 10, 10, 3, 2, 'j');
    }
    else if (type === 'staff') {
        line(g, 7, 6, 7, 12, 'a');
        const radius = 2 + Math.floor(tier / 2), cy = 5;
        line(g, 7, cy - radius, 7 - radius, cy, 'm');
        line(g, 7 - radius, cy, 7, cy + radius, 'm');
        line(g, 7, cy + radius, 7 + radius, cy, 'm');
        line(g, 7 + radius, cy, 7, cy - radius, 'm');
        box(g, 7 - tier % 2, cy - tier % 2, 1 + tier % 2, 2, 'j');
        if (tier % 2) {
            line(g, 9, 3, 12, 3, 'm');
            line(g, 12, 3, 12, 6, 'm');
        }
        for (let i = 0; i <= rank; i++)
            put(g, 4 - i, 7 + i, 'a');
        line(g, 3 - rank, 7 + rank, 6, 8, 'a');
    }
    else if (type === 'hammer') {
        box(g, 3 - Math.floor(tier / 2), 3, 8 + tier, 3 + tier % 2, 'm');
        box(g, 3 - Math.floor(tier / 2), 3, 1, 3 + tier % 2, 'w');
        box(g, 7, 6, 1, 4, 'a');
        for (let i = 0; i <= rank; i++)
            put(g, 4 + i * 2, 2 - i % 2, 'a');
        if (rank > 0)
            box(g, 9, 7, rank, 1, 'j');
    }
    else {
        // A wrist cuff and four visible knuckles; never a blade on a fist.
        box(g, 5, 10, 5, 3, 'a');
        box(g, 4, 5 - tier % 2, 7, 5 + tier % 2, 'm');
        for (let finger = 0; finger < 4; finger++)
            box(g, 4 + finger * 2, 4 - (finger <= tier ? 1 : 0), 1, 2, 'w');
        box(g, 11, 7, 1 + Math.floor(tier / 2), 3, 'm');
        for (let i = 0; i < rank; i++)
            put(g, 3 - i % 2, 6 + i, 'j');
        if (rank > 0)
            box(g, 4 - rank % 2, 11, 1 + rank, 1, 'j');
    }
    return outline(g);
}
function accessory(template, index, rank) {
    const g = grid(), variant = index % 4, effect = Math.floor(index / 4) % 2;
    const radius = 3 + variant, center = 7;
    if (template.accessoryType === 'ring') {
        const r = 3 + variant;
        line(g, center, 13, center - r, 10, 'm');
        line(g, center - r, 10, center - r, 6, 'm');
        line(g, center - r, 6, center, 4, 'w');
        line(g, center, 4, center + r, 6, 'w');
        line(g, center + r, 6, center + r, 10, 'm');
        line(g, center + r, 10, center, 13, 'm');
        box(g, 6 - rank, 3, 3 + rank * 2, 2 + effect, 'a');
    }
    else if (template.accessoryType === 'necklace') {
        line(g, 3 - variant % 2, 2, 2, 6 + variant, 'a');
        line(g, 2, 6 + variant, 7, 11, 'm');
        line(g, 11 + variant % 2, 2, 12, 6 + variant, 'a');
        line(g, 12, 6 + variant, 7, 11, 'm');
        box(g, 6 - rank % 2, 10, 3 + rank % 2 * 2, 2 + Math.floor(rank / 2), 'j');
        if (effect)
            line(g, 4, 3, 10, 3, 'm');
    }
    else {
        line(g, 7, 1, 6, 4, 'a');
        line(g, 7, 1, 8, 4, 'a');
        for (let y = 5; y <= 11; y++)
            box(g, 7 - Math.min(radius - 1, y - 4, 12 - y), y, 2 * Math.min(radius - 1, y - 4, 12 - y) + 1, 1, 'm');
        if (variant === 3)
            box(g, 2, 7, 11, 3, 'm');
        for (let i = 0; i <= rank; i++)
            line(g, 4 + i * 2, 11, 3 + i * 2, 13, 'a');
        if (effect) {
            line(g, 4, 7, 1, 4, 'j');
            line(g, 10, 7, 13, 4, 'j');
        }
    }
    // The mounted stone's cut differs by rarity; an open setting differs by effect.
    for (let i = 0; i <= rank; i++)
        put(g, 6 + i % 2, 5 + i, 'j');
    put(g, 7, 7, effect ? '.' : 'w');
    return outline(g);
}
const icons = new Map();
const accessoryIndices = new Map();
for (const template of EQUIPMENT_CATALOG) {
    const rank = RARITIES.indexOf(template.rarity);
    const key = `${template.accessoryType}:${template.rarity}`;
    const index = accessoryIndices.get(key) ?? 0;
    if (template.kind === 'accessory')
        accessoryIndices.set(key, index + 1);
    const cells = template.kind === 'weapon' && template.weaponType
        ? weapon(template.weaponType, template.tier, rank) : accessory(template, index, rank);
    icons.set(template.id, { w: 16, h: 16,
        palette: { e: '#140c1c', m: metals[rank], w: '#f0eee5', a: accents[rank], j: ITEM_RARITY_COLORS[template.rarity] },
        frames: [cells.map(row => row.join(''))] });
}
registerSprites(Object.fromEntries([...icons].map(([id, sprite]) => [`equipment.${id}.icon`, sprite])));
export const equipmentIcon = (templateId) => icons.get(templateId);
export function drawEquipmentIcon(ctx, item, x, y, options) {
    const icon = equipmentIcon(typeof item === 'string' ? item : item.templateId);
    if (icon)
        drawSprite(ctx, icon, 0, x, y, options);
}
/** Shared UI token also covers a malformed/removed historical template. */
export const equipmentColor = (item) => ITEM_RARITY_COLORS[equipmentTemplate(typeof item === 'string' ? item : item.templateId)?.rarity ?? 'common'];
