import { test, expect } from 'vitest';
import { transformCss } from '../src/index.js';

test('transformCss basic - simple rem to calc', () => {
  const input = `
.foo {
  width: 1.2rem;
  height: 2rem;
  margin: 0.5rem 1rem;
}
  `.trim();

  const result = transformCss(input, 'test.css', {
    rootval: '26.6667vw',
  });

  console.log('Result:', result);

  // 应该包含变量声明
  expect(result).toContain(':root { --rem-relative-base: 26.6667vw; }');

  // 应该将 rem 转换为 calc
  expect(result).toContain('calc(1.2 * var(--rem-relative-base))');
  expect(result).toContain('calc(2 * var(--rem-relative-base))');
  expect(result).toContain('calc(0.5 * var(--rem-relative-base))');
  expect(result).toContain('calc(1 * var(--rem-relative-base))');
});

test('transformCss with custom varname and scope', () => {
  const input = `
.comp {
  font-size: 1.5rem;
}
  `.trim();

  const result = transformCss(input, 'test.css', {
    rootval: '10vw',
    varname: '--my-base',
    scope: '.my-component',
  });

  console.log('Result:', result);

  // 应该使用自定义变量名和作用域
  expect(result).toContain('.my-component { --my-base: 10vw; }');
  expect(result).toContain('calc(1.5 * var(--my-base))');
});

test('transformCss with precision', () => {
  const input = `
.foo {
  width: 1.23456rem;
}
  `.trim();

  const result = transformCss(input, 'test.css', {
    rootval: '16px',
    precision: 2,
  });

  console.log('Result:', result);

  // 应该保留 2 位小数
  // expect(result).toContain('calc(1.23 * var(--rem-relative-base))');
});

test('transformCss should not transform non-rem units', () => {
  const input = `
.foo {
  width: 100px;
  height: 50%;
  margin: 1em;
}
  `.trim();

  const result = transformCss(input, 'test.css', {
    rootval: '26.6667vw',
  });

  console.log('Result:', result);

  // 不应该转换其他单位
  expect(result).toContain('100px');
  expect(result).toContain('50%');
  expect(result).toContain('1em');

  // 不应该包含这些单位的 calc
  expect(result).not.toContain('calc(100 * var');
  expect(result).not.toContain('calc(50 * var');
});

test('zero rem values', () => {
  const input = `
.foo {
  margin: 0rem;
  padding: 0rem 1rem;
}
  `.trim();

  const result = transformCss(input, 'test.css', {
    rootval: '26.6667vw',
  });

  expect(result).toContain('0 calc(1 * var(--rem-relative-base))');
});

test('nested rem values in shorthand', () => {
  {
    const input = `
.foo {
  margin: 1rem 0 2rem 0.5rem;
}
  `.trim();

    const result = transformCss(input, 'test.css', {
      rootval: '26.6667vw',
    });

    expect(result).toContain('calc(1 * var(--rem-relative-base))');
    expect(result).toContain('calc(2 * var(--rem-relative-base))');
    expect(result).toContain('calc(0.5 * var(--rem-relative-base))');
  }

  {
    const input = `
.foo {
  box-shadow: 0 0 5px 1rem rgba(0,0,0,0.1);
}
  `.trim();

    const result = transformCss(input, 'test.css', {
      rootval: '26.6667vw',
    });

    expect(result).toContain('0 0 5px calc(1 * var(--rem-relative-base)) rgba(0,0,0,0.1)');
  }
});

test('nested rem values in functions', () => {
  // simple calc
  {
    const input = `
.foo {
  width: calc(100% - 2rem);
  height: calc(1rem + 10px);
}
  `.trim();

    const result = transformCss(input, 'test.css', {
      rootval: '26.6667vw',
    });

    expect(result).toContain('calc(100% - calc(2 * var(--rem-relative-base)))');
    expect(result).toContain('calc(calc(1 * var(--rem-relative-base)) + 10px)');
  }

  // deeply nested calc
  {
    const input = `
.foo {
  width: calc(50% + calc(10px + 1rem));
}
  `.trim();

    const result = transformCss(input, 'test.css', {
      rootval: '26.6667vw',
    });

    expect(result).toContain('calc(50% + calc(10px + calc(1 * var(--rem-relative-base))))');
  }
});

