// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      'df551ec3e9a4.ngrok-free.app', // your ngrok domain
    ],
    port: 8080, // if you want to force 8080
  },
})
