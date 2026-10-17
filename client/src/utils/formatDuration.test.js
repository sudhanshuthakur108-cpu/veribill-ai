import { describe, expect, it } from 'vitest';
import { formatDuration } from './formatDuration.js';

describe('formatDuration', () => {
  it.each([
    [0, '0s'],
    [45, '45s'],
    [60, '1m 0s'],
    [725, '12m 5s'],
    [3725, '1h 2m'],
    [90061, '1d 1h'],
    [-5, '0s'],
    [59.9, '59s'],
  ])('formats %s seconds as "%s"', (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });
});
