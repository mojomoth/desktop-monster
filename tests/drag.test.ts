// T21 — whole-window threshold drag (SPEC Assumption 10 / F15).
// setupWindowDrag is DOM-free by injection: a fake event target records the
// listeners and the test drives them directly; moveBy records the deltas
// that production would stream to main over desmon:move-window.

import { describe, expect, it } from 'vitest';
import { DRAG_THRESHOLD_PX, setupWindowDrag } from '../src/renderer/drag.js';
import type { DragEventName, DragListener, DragPointerEvent } from '../src/renderer/drag.js';

function harness(): {
  fire(type: DragEventName, event: DragPointerEvent): void;
  listenerCount(): number;
  moves: [number, number][];
  handle: ReturnType<typeof setupWindowDrag>;
} {
  const listeners = new Map<DragEventName, Set<DragListener>>();
  const target = {
    addEventListener(type: DragEventName, listener: DragListener): void {
      const set = listeners.get(type) ?? new Set<DragListener>();
      set.add(listener);
      listeners.set(type, set);
    },
    removeEventListener(type: DragEventName, listener: DragListener): void {
      listeners.get(type)?.delete(listener);
    },
  };
  const moves: [number, number][] = [];
  const handle = setupWindowDrag({
    target,
    moveBy: (dx, dy) => {
      moves.push([dx, dy]);
    },
  });
  return {
    fire(type: DragEventName, event: DragPointerEvent): void {
      for (const listener of listeners.get(type) ?? []) {
        listener(event);
      }
    },
    listenerCount: () =>
      [...listeners.values()].reduce((total, set) => total + set.size, 0),
    moves,
    handle,
  };
}

const down = (x: number, y: number): DragPointerEvent => ({ screenX: x, screenY: y, buttons: 1 });
const move = (x: number, y: number, buttons = 1): DragPointerEvent => ({
  screenX: x,
  screenY: y,
  buttons,
});

describe('setupWindowDrag (whole-window threshold drag)', () => {
  it('a plain click never moves the window', () => {
    const h = harness();
    h.fire('mousedown', down(100, 100));
    h.fire('mouseup', move(100, 100, 0));
    expect(h.moves).toEqual([]);
    expect(h.handle.isDragging()).toBe(false);
  });

  it('cursor jitter under the threshold never moves the window', () => {
    const h = harness();
    h.fire('mousedown', down(100, 100));
    h.fire('mousemove', move(101, 100));
    h.fire('mousemove', move(101, 101));
    h.fire('mouseup', move(101, 101, 0));
    expect(h.moves).toEqual([]);
  });

  it('crossing the threshold starts streaming deltas (pre-threshold travel is swallowed)', () => {
    const h = harness();
    h.fire('mousedown', down(100, 100));
    h.fire('mousemove', move(100 + DRAG_THRESHOLD_PX, 100)); // crosses; swallowed
    expect(h.moves).toEqual([]);
    expect(h.handle.isDragging()).toBe(true);
    h.fire('mousemove', move(100 + DRAG_THRESHOLD_PX + 5, 103));
    expect(h.moves).toEqual([[5, 3]]);
  });

  it('movement without a prior mousedown never moves the window', () => {
    const h = harness();
    h.fire('mousemove', move(500, 500));
    expect(h.moves).toEqual([]);
  });

  it('mouseup ends the drag; later movement does nothing', () => {
    const h = harness();
    h.fire('mousedown', down(0, 0));
    h.fire('mousemove', move(10, 0)); // crosses threshold
    h.fire('mousemove', move(12, 0));
    expect(h.moves).toEqual([[2, 0]]);
    h.fire('mouseup', move(12, 0, 0));
    expect(h.handle.isDragging()).toBe(false);
    h.fire('mousemove', move(50, 50));
    expect(h.moves).toEqual([[2, 0]]);
  });

  it('a buttons=0 mousemove (release outside the window) cancels the press', () => {
    const h = harness();
    h.fire('mousedown', down(0, 0));
    h.fire('mousemove', move(10, 0)); // dragging
    h.fire('mousemove', move(20, 0, 0)); // release happened off-window
    expect(h.handle.isDragging()).toBe(false);
    h.fire('mousemove', move(30, 0));
    expect(h.moves).toEqual([]);
  });

  it('dispose() detaches every listener and stops the drag', () => {
    const h = harness();
    expect(h.listenerCount()).toBe(3);
    h.fire('mousedown', down(0, 0));
    h.fire('mousemove', move(10, 0));
    h.handle.dispose();
    expect(h.listenerCount()).toBe(0);
    expect(h.handle.isDragging()).toBe(false);
  });
});
