import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  // Node polyfills for GramJS (Telegram client used by the lecture player)
  plugins: [react(), nodePolyfills()],
})
