import postcss from 'postcss';
import valueParser from 'postcss-value-parser';

/**
 * 解析选项参数
 */
export interface ScopedRemOptions {
  /** 
   * Relative root value of rem, e.g., '26.6667vw'
   *
   * If not provided, the loader will skip rem value transformation, leaving rem units as-is.
   */
  rootval?: string;
  /** CSS 变量名，默认 '--rem-relative-base' */
  varname?: string;
  /** CSS 变量的作用域选择器，默认 ':root' */
  scope?: string;
  /** 小数精度，默认保持原值 */
  precision?: number;
}

export const VARNAME_DEFAULT = '--rem-relative-base';
export const SCOPE_DEFAULT = ':root';

/**
 * 生成 CSS 变量声明
 * @param options 配置选项
 * @returns CSS 变量声明字符串
 * @example
 * generateCssVarDeclaration({ rootval: '26.6667vw' })
 * // => ':root { --rem-relative-base: 26.6667vw; }'
 */
function generateCssVarDeclaration(options: ScopedRemOptions): string {
  const { rootval } = options;

  if (!rootval) {
    return '';
  }

  const varname = options.varname || VARNAME_DEFAULT;
  const scope = options.scope || SCOPE_DEFAULT;

  return `${scope} { ${varname}: ${rootval}; }`;
}

// https://github.com/cuth/postcss-pxtorem/blob/239fc3a1ab3ecbc63d1b9f98dd380abd49c03309/lib/pixel-unit-regex.js#L9-L13
const remRegex = /"[^"]+"|'[^']+'|url\([^)]+\)|--[\w-]+|(-?\d*\.?\d+)rem/gi;

/**
 * 使用 PostCSS 转换 CSS 中的 rem 单位
 * @param css 原始 CSS 代码
 * @param filename 文件名（用于 source map）
 * @param options 配置选项
 * @returns 转换后的 CSS 代码
 */
function transformRemWithPostCSS(
  css: string,
  filename: string,
  options: ScopedRemOptions
): string {
  const varname = options.varname || VARNAME_DEFAULT;

  const result = postcss([
    {
      postcssPlugin: 'scoped-rem-transform',
      Declaration(decl) {
        const parsed = valueParser(decl.value);

        let modified = false;
        parsed.walk((node) => {
          if (node.type === 'word' && node.value.endsWith('rem')) {
            // TODO feel not so robust, need more tests...
            const numStr = node.value.match(remRegex)?.[0];
            if (!numStr) {
              return;
            }
            let numValue = parseFloat(numStr);

            // 应用精度处理
            if (options.precision !== undefined) {
              numValue = parseFloat(numValue.toFixed(options.precision));
            }

            if (numValue === 0) {
              node.value = '0';
              modified = true;
              return;
            }

            node.value = `calc(${numValue} * var(${varname}))`;
            modified = true;
          }
        });

        if (modified) {
          decl.value = parsed.toString();
        }
      },
    },
  ]).process(css, { from: filename }).css;

  return result;
}

export function transformCss(
  css: string,
  filename: string,
  options: ScopedRemOptions
): string {
  const varDeclaration = generateCssVarDeclaration(options);
  const transformedCss = transformRemWithPostCSS(css, filename, options);

  if (!varDeclaration) return transformedCss;
  return `${varDeclaration}\n${transformedCss}`;
}

export function parseQueryOptions(query: string): ScopedRemOptions | null {
  const params = new URLSearchParams(query);
  if (!params.has('rem-scoped')) {
    return null;
  }

  const options: ScopedRemOptions = {};

  const rootvalValue = params.get('rootval');
  if (rootvalValue) {
    options.rootval = rootvalValue;
  }

  const varname = params.get('varname');
  if (varname) {
    options.varname = varname;
  }

  const scope = params.get('scope');
  if (scope) {
    options.scope = scope;
  }

  const precisionStr = params.get('precision');
  if (precisionStr) {
    options.precision = parseInt(precisionStr, 10);
  }

  return options;
}
