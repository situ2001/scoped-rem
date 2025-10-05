import postcss from 'postcss';
import valueParser from 'postcss-value-parser';

export interface ScopedRemOptions {
  /** 
   * Relative root value of rem, e.g., '26.6667vw'
   *
   * If not provided, the loader will skip rem value transformation, leaving rem units as-is.
   */
  rootval?: string;

  /** 
   * CSS variable name used for rem conversion, default '--rem-relative-base' 
   * 
   * e.g., '--my-base', then rem will be converted to 'calc(x * var(--my-base))'
   */
  varname?: string;

  /**
   * Scope selector for the CSS variable, default ':root'
   * 
   * e.g., '.my-component' will generate:
   * ```
   * .my-component { --rem-relative-base: 26.6667vw; }
   * ```
   * instead of
   * ```
   * :root { --rem-relative-base: 26.6667vw; }
   * ```
   * which limits the variable to the specified scope.
   */
  varselector?: string;

  /**
   * Number of decimal places to round the converted rem values, default is no rounding.
   * 
   * Default is 4.
   */
  precision?: number;
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

  const varselector = params.get('varselector');
  if (varselector) {
    options.varselector = varselector;
  }

  const precisionStr = params.get('precision') || PRECISION_DEFAULT.toString();
  if (precisionStr) {
    options.precision = parseInt(precisionStr, 10);
  }

  return options;
}

export const VARNAME_DEFAULT = '--rem-relative-base';
export const VARSELECTOR_DEFAULT = ':root';
export const PRECISION_DEFAULT = 4;

function generateCssVarDeclaration(options: ScopedRemOptions): string {
  const { rootval } = options;

  if (!rootval) {
    return '';
  }

  // TODO detect var conflicts?
  const varname = options.varname || VARNAME_DEFAULT;
  const scope = options.varselector || VARSELECTOR_DEFAULT;

  return `${scope} { ${varname}: ${rootval}; }`;
}

// https://github.com/cuth/postcss-pxtorem/blob/239fc3a1ab3ecbc63d1b9f98dd380abd49c03309/lib/pixel-unit-regex.js#L9-L13
const remRegex = /"[^"]+"|'[^']+'|url\([^)]+\)|--[\w-]+|(-?\d*\.?\d+)rem/gi;

/**
 * @param css CSS source code
 * @param filename will be passed to PostCSS
 * @returns The transformed CSS
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
            const numStr = node.value.match(remRegex)?.[0];
            if (!numStr) {
              return;
            }

            const numValue: number = (() => {
              if (options.precision !== undefined) {
                if (options.precision < 0 || options.precision > 100) {
                  throw new Error(
                    `[scoped-rem-core] Invalid precision value: ${options.precision}. It should be between 0 and 100.`
                  );
                }

                return parseFloat(parseFloat(numStr).toFixed(options.precision));
              } else {
                return parseFloat(parseFloat(numStr).toFixed(PRECISION_DEFAULT));
              }
            })();

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
