import { test, expect } from 'vitest';
import { parseQueryOptions, VARNAME_DEFAULT, VARSELECTOR_DEFAULT } from '../src/index.js';

test('parseQueryOptions', () => {
  expect(parseQueryOptions('')).toBeNull();

  // with rem-scoped
  expect(parseQueryOptions('?rem-scoped')).toEqual({
    varname: VARNAME_DEFAULT,
    varselector: VARSELECTOR_DEFAULT,
  });
  // without rem-scoped
  expect(parseQueryOptions('?varname=my-var&rootval=10vw&varselector=.comp&precision=3')).toBeNull();

  // basic options
  expect(parseQueryOptions('?rem-scoped&varname=my-var')).toEqual({
    varname: 'my-var',
    varselector: VARSELECTOR_DEFAULT,
  });
  expect(parseQueryOptions('?rem-scoped&rootval=16px')).toEqual({
    rootval: '16px',
    varname: VARNAME_DEFAULT,
    varselector: VARSELECTOR_DEFAULT,
  });
  expect(parseQueryOptions('?rem-scoped&varselector=.my-class')).toEqual({
    varselector: '.my-class',
    varname: VARNAME_DEFAULT,
  });
  expect(parseQueryOptions('?rem-scoped&precision=2')).toEqual({
    precision: 2,
    varname: VARNAME_DEFAULT,
    varselector: VARSELECTOR_DEFAULT,
  });

  expect(parseQueryOptions('?rem-scoped&varname=my-var&rootval=10vw&varselector=.comp&precision=3')).toEqual({
    varname: 'my-var',
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
