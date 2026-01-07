import path from 'path';

import { svelte } from '@sveltejs/vite-plugin-svelte';
import { visualizer } from 'rollup-plugin-visualizer';
import { sveltePreprocess } from 'svelte-preprocess';
import type { UserConfig } from 'vite';
import checker from 'vite-plugin-checker';

const SERVER_PORT = 30001;
const FOUNDRY_PORT = 30000;

const config: UserConfig = {
  root: path.resolve(__dirname, 'src'),
  base: '/systems/zombicide-chronicles/',
  publicDir: path.resolve(__dirname, 'public'),
  server: {
    port: SERVER_PORT,
    open: true,
    proxy: {
      '^(?!/systems/zombicide-chronicles)': `http://localhost:${FOUNDRY_PORT}/`,
      '/socket.io': {
        target: `ws://localhost:${FOUNDRY_PORT}`,
        ws: true,
      },
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: false,
    sourcemap: true,
    lib: {
      name: 'zombicide-chronicles',
      entry: path.resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'zombicide-chronicles',
    },
  },
  esbuild: {
    minifyIdentifiers: false,
    keepNames: true,
  },
  plugins: [
    svelte({
      preprocess: sveltePreprocess(),
    }),
    checker({
      typescript: true,
    }),
    visualizer({
      gzipSize: true,
      template: 'treemap',
    }),
  ],
  define: {
    'process.env': process.env,
  },
};

export default config;
