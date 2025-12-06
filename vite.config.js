import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build', // Keep same output directory for Netlify compatibility
    sourcemap: true, // Useful for debugging
  },
  server: {
    port: 3000,
    open: true
  },
  // Ensure compatibility with your existing asset structure
  publicDir: 'public'
})