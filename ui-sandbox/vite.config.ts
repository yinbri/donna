import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The sandbox imports ../contracts and ../fixtures from the repo root.
export default defineConfig({
  plugins: [react()],
  server: { fs: { allow: ['..'] } },
})
