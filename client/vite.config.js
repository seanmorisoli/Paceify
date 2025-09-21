// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      'c1f97552bcc0.ngrok-free.app', // Shin
      'fourthly-nymphaeaceous-therese.ngrok-free.app', // Ansel static front end
    ],
    port: 5050, // if you want to force 8080
  },
})
