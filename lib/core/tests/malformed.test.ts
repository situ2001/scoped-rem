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

  // 空的 rootval 应该抛出错误或使用默认值
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

//   // 缺少 rootval 应该抛出错误
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

//   // 无效的 rootval 格式应该抛出错误或警告
//   const result = transformCss(input, 'test.css', {
//     rootval: 'invalid-value',
//   });


//   // 应该能够处理或给出合理的输出
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


  // 应该正确处理负数
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


  // 字符串中的 rem 不应该被转换
  expect(result).toContain('content: "width: 1.2rem"');
  // 实际 CSS 值应该被转换
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


  // URL 中的 rem 不应该被转换
  expect(result).toContain('url("image-1.2rem.png")');
  // 实际 CSS 值应该被转换
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


  // 应该只转换 rem，保留其他单位
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


  // 应该能处理 calc 中的 rem
  expect(result).toContain('var(--rem-relative-base)');
});

// test('malformed - invalid precision value', () => {
//   const input = `
// .foo {
//   width: 1.23456rem;
// }
//   `.trim();

//   const result = transformCss(input, 'test.css', {
//     rootval: '16px',
//     precision: -1, // 无效的精度值
//   });


//   // 应该使用默认精度或忽略无效值
//   expect(result).toBeDefined();
// });

test('malformed - empty CSS', () => {
  const input = '';

  const result = transformCss(input, 'test.css', {
    rootval: '26.6667vw',
  });


  // 空 CSS 应该只返回变量声明
  expect(result).toContain(':root { --rem-relative-base: 26.6667vw; }');
});

test('malformed - only whitespace CSS', () => {
  const input = '   \n\n  \t  ';

  const result = transformCss(input, 'test.css', {
    rootval: '26.6667vw',
  });


  // 只有空白的 CSS 应该只返回变量声明
  expect(result).toContain(':root { --rem-relative-base: 26.6667vw; }');
});
