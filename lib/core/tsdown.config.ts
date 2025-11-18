import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/index.ts'],
  outDir: './dist',
  platform: 'node',
  format: ['cjs', 'esm'],
  dts: {
    oxc: true
  },
})
