import { test, expect } from 'vitest';
import { transformCss } from '../src/index.js';

test('malformed - invalid CSS syntax', () => {
  const input = `
.foo {
  width: 1.2rem
  height: 2rem;
}
  `.trim();

  expect(() => {
    transformCss(input, 'test.css', {
      rootval: '26.6667vw',
    });
  }).toThrow();
});

test('malformed - unclosed bracket', () => {
  const input = `
.foo {
  width: 1.2rem;
  height: 2rem;
  `.trim();

  expect(() => {
    transformCss(input, 'test.css', {
      rootval: '26.6667vw',
    });
  }).toThrow();
});

test('malformed - only transform valid rem values', () => {
  const input = `
.foo {
  width: abcrem;
  height: 2rem;
}
  `.trim();

  const result = transformCss(input, 'test.css', {
    rootval: '26.6667vw',
  });

  expect(result).toContain('abcrem');
  expect(result).toContain('calc(2 * var(--rem-relative-base))');
});

test('malformed - empty rootval', () => {
  const input = `
.foo {
  width: 1.2rem;
}
  `.trim();

  expect(
    transformCss(input, 'test.css', {
      rootval: '',
    })
  )
    .not
    .toContain('{ --rem-relative-base');
});

// test('malformed - missing rootval', () => {
//   const input = `
// .foo {
//   width: 1.2rem;
// }
//   `.trim();

//   expect(() => {
//     transformCss(input, 'test.css', {} as any);
//   }).toThrow();
// });

// test('malformed - invalid rootval format', () => {
//   const input = `
// .foo {
//   width: 1.2rem;
// }
//   `.trim();

//   const result = transformCss(input, 'test.css', {
//     rootval: 'invalid-value',
//   });


//   expect(result).toBeDefined();
// });

test('malformed - negative rem values', () => {
  const input = `
.foo {
  margin-top: -1.5rem;
  transform: translateY(-2rem);
}
  `.trim();

  const result = transformCss(input, 'test.css', {
    rootval: '26.6667vw',
  });


  expect(result).toContain('calc(-1.5 * var(--rem-relative-base))');
  expect(result).toContain('calc(-2 * var(--rem-relative-base))');
});

test('malformed - rem in comments should not be transformed', () => {
  const input = `
/* width: 1.2rem; */
.foo {
  width: 2rem; /* this is 2rem */
  /* height: 3rem; */
}
  `.trim();

  const result = transformCss(input, 'test.css', {
    rootval: '26.6667vw',
  });

  expect(result).toContain('calc(2 * var(--rem-relative-base))');
  expect(result).toMatch(/\/\*.*1\.2rem.*\*\//);
});

test('malformed - rem in string values should not be transformed', () => {
  const input = `
.foo {
  content: "width: 1.2rem";
  width: 2rem;
}
  `.trim();

  const result = transformCss(input, 'test.css', {
    rootval: '26.6667vw',
  });


  expect(result).toContain('content: "width: 1.2rem"');
  expect(result).toContain('calc(2 * var(--rem-relative-base))');
});

test('malformed - rem in url should not be transformed', () => {
  const input = `
.foo {
  background: url("image-1.2rem.png");
  width: 2rem;
}
  `.trim();

  const result = transformCss(input, 'test.css', {
    rootval: '26.6667vw',
  });


  expect(result).toContain('url("image-1.2rem.png")');
  expect(result).toContain('calc(2 * var(--rem-relative-base))');
});

test('malformed - mixed units in shorthand', () => {
  const input = `
.foo {
  margin: 1rem 10px 2rem 5%;
}
  `.trim();

  const result = transformCss(input, 'test.css', {
    rootval: '26.6667vw',
  });


  expect(result).toContain('calc(1 * var(--rem-relative-base))');
  expect(result).toContain('10px');
  expect(result).toContain('calc(2 * var(--rem-relative-base))');
  expect(result).toContain('5%');
});

test('malformed - rem in calc expression', () => {
  const input = `
.foo {
  width: calc(100% - 2rem);
  height: calc(1rem + 10px);
}
  `.trim();

  const result = transformCss(input, 'test.css', {
    rootval: '26.6667vw',
  });


  expect(result).toContain('var(--rem-relative-base)');
});

test('malformed - invalid precision value', () => {
  const input = `
.foo {
  width: 1.23456rem;
}
  `.trim();

  expect(() => {
    const result = transformCss(input, 'test.css', {
      rootval: '16px',
      precision: -1, // 无效的精度值
    });
  }).toThrowError();
});

test('malformed - empty CSS', () => {
  const input = '';

  const result = transformCss(input, 'test.css', {
    rootval: '26.6667vw',
  });

  expect(result).toContain(':root { --rem-relative-base: 26.6667vw; }');
});

test('malformed - only whitespace CSS', () => {
  const input = '   \n\n  \t  ';

  const result = transformCss(input, 'test.css', {
    rootval: '26.6667vw',
  });

  expect(result).toContain(':root { --rem-relative-base: 26.6667vw; }');
});
