import postcss from 'postcss';
import valueParser from 'postcss-value-parser';
import { z } from 'zod';

/**
 * Core idea of scoped-rem:
 * 1. Transform rem values `x rem` to `calc(x * var(--varname))`
 *    1. `x` is the original rem value
 *    2. `varname` is a CSS variable name
 *    3. `x` will be rounded to a specified `precision` if provided
 * 2. (Optional if `rootval` is not provided) Declare the CSS variable `varname` in a specified scope `varselector` with a relative root value `rootval`
 */
export interface ScopedRemOptions {
  /** 
   * CSS variable name used for rem conversion, default '--rem-relative-base' 
   * 
   * e.g., '--my-base', then rem value will be converted to 'calc(x * var(--my-base))'
   */
  varname?: string;

  /** 
   * Relative root value of rem, e.g., '26.6667vw'
   *
   * If not provided, the loader will skip variable declaration generation,
   * but rem values will still be transformed to calc() with CSS variables.
   * This is useful when developers want to declare the CSS variable manually elsewhere (e.g., in a global stylesheet).
   */
  rootval?: string;

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
   */
  precision?: number;
}

const ScopedRemOptionsSchema: z.ZodType<ScopedRemOptions> = z.object({
  varname: z.string().optional(),
  rootval: z.string().optional(),
  varselector: z.string().optional(),
  precision: z.coerce.number().int().min(0).max(100).optional(),
});

export function parseQueryOptions(query: string): ScopedRemOptions | null {
  const params = new URLSearchParams(query);
  if (!params.has('rem-scoped')) {
    return null;
  }

  const rawOptions: Record<string, string | undefined> = {
    varname: params.get('varname') || undefined,
    rootval: params.get('rootval') || undefined,
    varselector: params.get('varselector') || undefined,
    precision: params.get('precision') || undefined,
  };

  try {
    const options = ScopedRemOptionsSchema.parse(rawOptions);
    return options as ScopedRemOptions;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        `[scoped-rem] Invalid query options: ${error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`
      );
    }
    throw error;
  }
}

export const VARNAME_DEFAULT = '--rem-relative-base';
export const VARSELECTOR_DEFAULT = ':root';

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
                    `[scoped-rem] Invalid precision value: ${options.precision}. It should be between 0 and 100.`
                  );
                }

                return parseFloat(
                  (parseFloat(numStr) || 0).toFixed(options.precision)
                );
              } else {
                return parseFloat(numStr) || 0;
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
