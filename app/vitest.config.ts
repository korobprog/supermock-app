import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig(async () => {
  const { default: react } = await import('@vitejs/plugin-react');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['src/test/setup.ts'],
      css: true
    }
  };
});
