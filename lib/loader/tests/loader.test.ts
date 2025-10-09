import { describe, it, expect } from 'vitest';
import { webpack, type Stats } from 'webpack';
import { build as tsdownBuild } from 'tsdown';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runWebpack(
  entry: string,
  loaderPath: string
): Promise<{ output: string; stats: Stats }> {
  await tsdownBuild({
    logLevel: 'error',
  });
  // replace /src with /dist in loaderPath
  loaderPath = loaderPath.replace('/src/', '/dist/');
  // replace .ts with .js in loaderPath
  loaderPath = loaderPath.replace('.ts', '.js');

  return new Promise((resolve, reject) => {
    const compiler = webpack({
      mode: 'development',
      entry,
      output: {
        path: join(tmpdir(), 'webpack-test-output'),
        filename: 'bundle.js',
      },
      module: {
        rules: [
          {
            test: /\.css$/,
            use: [
              'style-loader',
              'css-loader',
              {
                loader: loaderPath,
              },
            ],
          },
        ],
      },
      optimization: {
        minimize: false,
      },
      plugins: [
        {
          apply(compiler) {
            compiler.hooks.emit.tap('CaptureOutputPlugin', (compilation) => {
              const asset = compilation.assets['bundle.js'];
              if (asset) {
                if (typeof asset.source === 'function') {
                  capturedOutput = asset.source().toString();
                  return;
                }

                if (typeof asset.buffer === 'function') {
                  capturedOutput = asset.buffer().toString('utf-8');
                  return;
                }

                throw new Error('Unknown asset source type');
              }
            });
          },
        },
      ],
    });

    let capturedOutput = '';

    if (!compiler) {
      reject(new Error('Failed to create webpack compiler'));
      return;
    }

    compiler.run((err, stats) => {
      if (err) {
        reject(err);
        return;
      }

      if (!stats) {
        reject(new Error('No stats returned'));
        return;
      }

      const info = stats.toJson();

      if (stats.hasErrors()) {
        reject(new Error(info.errors?.[0]?.message || 'Unknown error'));
        return;
      }

      if (!capturedOutput) {
        reject(new Error('Failed to capture bundle output'));
        return;
      }

      compiler.close(() => {
        resolve({ output: capturedOutput, stats });
      });
    });
  });
}

function createTempFiles(cssContent: string, query: string): { jsFile: string; tempDir: string } {
  const tempDir = mkdtempSync(join(tmpdir(), 'scoped-rem-test-'));
  const cssFile = join(tempDir, `test.css`);
  const jsFile = join(tempDir, `entry.js`);

  writeFileSync(cssFile, cssContent);
  const importStatement = `import './test.css${query}';`;
  writeFileSync(jsFile, importStatement);

  return { jsFile, tempDir };
}

describe('scoped-rem-loader', () => {
  it('should export a webpack loader function', async () => {
    const loader = await import('../src/index.js');
    expect(loader.default).toBeDefined();
    expect(typeof loader.default).toBe('function');
  });

  it('should have proper loader signature', async () => {
    const loader = await import('../src/index.js');
    expect(typeof loader.default).toBe('function');
    expect(loader.default.length).toBeGreaterThan(0);
  });
});

describe('webpack integration tests', () => {
  const loaderPath = join(__dirname, '../src/index.ts');

  it('should transform rem units with rem-scoped query', async () => {
    const inputCss = `.component { font-size: 1.2rem; margin: 0.5rem; }`;
    const { jsFile, tempDir } = createTempFiles(inputCss, '?rem-scoped&rootval=26.6667vw');

    try {
      const { output } = await runWebpack(jsFile, loaderPath);

      expect(output).toContain('--rem-relative-base');
      expect(output).toContain('26.6667vw');
      expect(output).toContain('calc(1.2 * var(--rem-relative-base))');
      expect(output).toContain('calc(0.5 * var(--rem-relative-base))');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should not transform without rem-scoped query', async () => {
    const inputCss = `.component { font-size: 1.2rem; }`;
    const { jsFile, tempDir } = createTempFiles(inputCss, '');

    try {
      const { output } = await runWebpack(jsFile, loaderPath);

      expect(output).toContain('1.2rem');
      expect(output).not.toContain('calc(');
      expect(output).not.toContain('--rem-relative-base');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should support custom variable names and selectors', async () => {
    const inputCss = `.component { font-size: 1.5rem; }`;
    const { jsFile, tempDir } = createTempFiles(
      inputCss,
      '?rem-scoped&rootval=10vw&varname=custom-base&varselector=.my-component'
    );

    try {
      const { output } = await runWebpack(jsFile, loaderPath);

      expect(output).toContain('--custom-base: 10vw');
      expect(output).toContain('calc(1.5 * var(--custom-base))');
      expect(output).not.toContain('--rem-relative-base');

      expect(output).toContain('.my-component { --custom-base: 10vw');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should not generate variable declaration if rootval is missing', async () => {
    const inputCss = `.component { font-size: 2rem; }`;
    const { jsFile, tempDir } = createTempFiles(inputCss, '?rem-scoped&varname=base-no-rootval');

    try {
      const { output } = await runWebpack(jsFile, loaderPath);

      expect(output).toContain('calc(2 * var(--base-no-rootval))');
      expect(output).not.toContain('--base-no-rootval:');
      expect(output).not.toContain('{ --base-no-rootval:');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
