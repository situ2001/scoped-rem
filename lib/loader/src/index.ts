import { transformCss, parseQueryOptions } from 'scoped-rem';
import type { LoaderContext } from 'webpack';

const scopedRemLoader = function (
  this: LoaderContext<{}>,
  source: string | Buffer
): string | Buffer {
  // Get the resource query (e.g., '?rem-scoped&rootval=26.6667vw')
  const resourceQuery = this.resourceQuery || '';

  // If the query is empty or doesn't start with '?', skip processing
  if (!resourceQuery || !resourceQuery.startsWith('?')) {
    return source;
  }

  // remove heading '?'
  const queryString = resourceQuery.slice(1);

  try {
    const options = parseQueryOptions(queryString);
    if (!options) {
      return source;
    }

    // Get the resource path for better error messages
    const filename = this.resourcePath;

    if (!filename) {
      throw new Error('[scoped-rem-loader] Missing resource path');
    }

    // Transform the CSS
    const result = transformCss(
      typeof source === 'string' ? source : source.toString('utf-8'),
      filename,
      options
    );

    return result;
  } catch (error) {
    // Emit webpack error
    this.emitError(
      new Error(
        `[scoped-rem-loader] Failed to transform ${this.resourcePath}: ${error instanceof Error ? error.message : String(error)
        }`
      )
    );

    // Return original source on error to prevent build failure
    return source;
  }
};

export default scopedRemLoader;
