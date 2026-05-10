import { deepEqual } from '../deepEqual';

describe('deepEqual', () => {
  describe('primitive comparisons', () => {
    it('returns true for strictly equal primitives', () => {
      expect(deepEqual(1, 1)).toBe(true);
      expect(deepEqual('a', 'a')).toBe(true);
      expect(deepEqual(true, true)).toBe(true);
      expect(deepEqual(false, false)).toBe(true);
      expect(deepEqual(null, null)).toBe(true);
      expect(deepEqual(undefined, undefined)).toBe(true);
    });

    it('returns true for the same reference', () => {
      const sym = Symbol('x');
      expect(deepEqual(sym, sym)).toBe(true);

      const obj = { a: 1 };
      expect(deepEqual(obj, obj)).toBe(true);
    });

    it('returns falsy for non-equal primitives', () => {
      expect(deepEqual(1, 2)).toBeFalsy();
      expect(deepEqual('a', 'b')).toBeFalsy();
      expect(deepEqual(true, false)).toBeFalsy();
      expect(deepEqual(null, undefined)).toBeFalsy();
      expect(deepEqual(0, '0')).toBeFalsy();
    });
  });

  describe('object comparisons', () => {
    it('returns true for two empty objects', () => {
      expect(deepEqual({}, {})).toBe(true);
    });

    it('returns true for shallowly equal objects', () => {
      expect(deepEqual({ a: 1, b: 'x' }, { a: 1, b: 'x' })).toBe(true);
    });

    it('returns false for objects with different key counts', () => {
      expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
      expect(deepEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false);
    });

    it('returns false for objects with the same keys but different values', () => {
      expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
    });

    it('returns true for deeply nested equal objects', () => {
      expect(
        deepEqual(
          { a: { b: { c: [1, 2, 3] } } },
          { a: { b: { c: [1, 2, 3] } } },
        ),
      ).toBe(true);
    });

    it('returns false for deeply nested objects that differ', () => {
      expect(
        deepEqual(
          { a: { b: { c: [1, 2, 3] } } },
          { a: { b: { c: [1, 2, 4] } } },
        ),
      ).toBe(false);
    });

    it('compares arrays as objects', () => {
      expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
      expect(deepEqual([1, 2, 3], [3, 2, 1])).toBe(false);
    });
  });

  describe('mixed type comparisons', () => {
    it('returns falsy when comparing an object against null', () => {
      expect(deepEqual({}, null)).toBeFalsy();
      expect(deepEqual(null, {})).toBeFalsy();
    });

    it('returns falsy when comparing an object against a primitive', () => {
      expect(deepEqual({}, 1)).toBeFalsy();
      expect(deepEqual(1, {})).toBeFalsy();
      expect(deepEqual([], 'a')).toBeFalsy();
    });

    it('returns falsy when comparing an object against undefined', () => {
      expect(deepEqual({}, undefined)).toBeFalsy();
      expect(deepEqual(undefined, {})).toBeFalsy();
    });
  });
});
