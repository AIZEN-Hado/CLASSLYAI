import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig(({ command, mode }) => ({
  plugins: command === 'serve' || mode === 'legacy' ? [react(), nodePolyfills()] : [react()],
  server: {
    proxy: { '/api': 'http://127.0.0.1:5001' },
  },
  base: mode === 'legacy' ? './' : '/',
  build: mode === 'legacy' ? {
    outDir: 'dist/legacy',
    rollupOptions: {
      input: fileURLToPath(new URL('./legacy.html', import.meta.url)),
    },
  } : { copyPublicDir: false },
}))
