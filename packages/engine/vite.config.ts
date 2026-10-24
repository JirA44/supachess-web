import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'SupaChessEngine',
      fileName: (format) => `index.${format}.js`,
      formats: ['es', 'umd']
    },
    rollupOptions: {
      external: ['chess.js'],
      output: {
        globals: {
          'chess.js': 'Chess'
        }
      }
    },
    target: 'ES2022',
    minify: 'terser'
  }
});