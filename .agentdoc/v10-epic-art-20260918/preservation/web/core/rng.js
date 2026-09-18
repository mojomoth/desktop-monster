// Deterministic RNG — SPEC F06 (rng half) / Assumption 15.
// Pure TypeScript, zero imports of electron/DOM/node.
/**
 * mulberry32 — tiny, fast, deterministic 32-bit PRNG.
 * Same seed → identical sequence forever; used by every statistical test.
 */
export function mulberry32(seed) {
    let state = seed >>> 0;
    return {
        next() {
            state = (state + 0x6d2b79f5) >>> 0;
            let t = state;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        },
    };
}
