import { test, expect } from 'vitest';
import { parseQueryOptions } from '../src/index.js';

test('parseQueryOptions', () => {
  expect(parseQueryOptions('')).toBeNull();

  // with rem-scoped
  expect(parseQueryOptions('?rem-scoped')).toEqual({});
  // without rem-scoped
  expect(parseQueryOptions('?varname=--my-var&rootval=10vw&varselector=.comp&precision=3')).toBeNull();

  // basic options
  expect(parseQueryOptions('?rem-scoped&varname=--my-var')).toEqual({
    varname: '--my-var',
  });
  expect(parseQueryOptions('?rem-scoped&rootval=16px')).toEqual({
    rootval: '16px',
  });
  expect(parseQueryOptions('?rem-scoped&varselector=.my-class')).toEqual({
    varselector: '.my-class',
  });
  expect(parseQueryOptions('?rem-scoped&precision=2')).toEqual({
    precision: 2,
  });

  expect(parseQueryOptions('?rem-scoped&varname=--my-var&rootval=10vw&varselector=.comp&precision=3')).toEqual({
    varname: '--my-var',
    rootval: '10vw',
    varselector: '.comp',
    precision: 3,
  });

  // invalid precision
  expect(() => parseQueryOptions('?rem-scoped&precision=-1')).toThrow();
  expect(() => parseQueryOptions('?rem-scoped&precision=101')).toThrow();
  expect(() => parseQueryOptions('?rem-scoped&precision=2.5')).toThrow();
  expect(() => parseQueryOptions('?rem-scoped&precision=abc')).toThrow();
});
