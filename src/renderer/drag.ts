// Whole-window drag (SPEC Assumption 10 / F15): mouse-dragging anywhere on
// the overlay moves the window. Clicks stay attacks — the fallback input path
// is untouched; a press only becomes a drag once the cursor travels past a
// small threshold, after which screen-coordinate deltas stream to main over
// `desmon:move-window` and the window follows the cursor.
//
// DOM-free by injection (same policy as input.ts): the event target and the
// delta sender are parameters — production passes `window` and
// `window.desmon.moveWindowBy`, tests pass fakes — so everything here runs
// under vitest's node environment. The native 24-px drag strip swallows its
// own mousedown, so these listeners never fire there (no double-move).

/** Cursor travel (Manhattan distance, px) before a press becomes a drag. */
export const DRAG_THRESHOLD_PX = 4;

/** Minimal shape of a delivered mouse event — screen coords + button state. */
export interface DragPointerEvent {
  /** Cursor position in screen coordinates (DIPs — matches window positions). */
  screenX: number;
  screenY: number;
  /** Pressed-buttons bitmask; 0 mid-move means the press ended off-window. */
  buttons?: number;
}

export type DragEventName = 'mousedown' | 'mousemove' | 'mouseup';
export type DragListener = (event: DragPointerEvent) => void;

/** Minimal event-target surface — the real `window` satisfies it. */
export interface DragEventTarget {
  addEventListener(type: DragEventName, listener: DragListener): void;
  removeEventListener(type: DragEventName, listener: DragListener): void;
}

export interface WindowDragOptions {
  target: DragEventTarget;
  /** Streams one cursor delta to main (production: window.desmon.moveWindowBy). */
  moveBy(dx: number, dy: number): void;
}

export interface WindowDragHandle {
  /** True while a press has crossed the threshold and is moving the window. */
  isDragging(): boolean;
  /** Detach all listeners and forget any in-flight press. */
  dispose(): void;
}

/**
 * Wire the threshold drag to a real event target. The pre-threshold travel
 * is swallowed on purpose: a click (or a jittery click) never nudges the
 * window; once the threshold is crossed, every subsequent delta moves it.
 */
export function setupWindowDrag(options: WindowDragOptions): WindowDragHandle {
  const { target, moveBy } = options;
  let pressed = false;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let traveled = 0;

  const onMousedown: DragListener = (event) => {
    pressed = true;
    dragging = false;
    traveled = 0;
    lastX = event.screenX;
    lastY = event.screenY;
  };

  const onMousemove: DragListener = (event) => {
    if (!pressed) {
      return;
    }
    if (event.buttons === 0) {
      // The button was released outside the window — end the press safely.
      pressed = false;
      dragging = false;
      return;
    }
    const dx = event.screenX - lastX;
    const dy = event.screenY - lastY;
    lastX = event.screenX;
    lastY = event.screenY;
    if (!dragging) {
      traveled += Math.abs(dx) + Math.abs(dy);
      if (traveled < DRAG_THRESHOLD_PX) {
        return;
      }
      dragging = true; // threshold crossed; movement streams from here on
      return;
    }
    if (dx !== 0 || dy !== 0) {
      moveBy(dx, dy);
    }
  };

  const onMouseup: DragListener = () => {
    pressed = false;
    dragging = false;
  };

  target.addEventListener('mousedown', onMousedown);
  target.addEventListener('mousemove', onMousemove);
  target.addEventListener('mouseup', onMouseup);

  return {
    isDragging: () => dragging,
    dispose(): void {
      pressed = false;
      dragging = false;
      target.removeEventListener('mousedown', onMousedown);
      target.removeEventListener('mousemove', onMousemove);
      target.removeEventListener('mouseup', onMouseup);
    },
  };
}
