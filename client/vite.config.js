// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 8080,
    strictPort: true,
    // allow your ngrok host
    allowedHosts: ['c1f97552bcc0.ngrok-free.app'],
  },
})
