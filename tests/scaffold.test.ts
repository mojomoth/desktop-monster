import { describe, expect, it } from 'vitest';
import * as core from '../src/core/index.js';

describe('scaffold', () => {
  it('exposes the core barrel as an object', () => {
    expect(typeof core).toBe('object');
    expect(core).not.toBeNull();
  });
});
