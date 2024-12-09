import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import checker from 'vite-plugin-checker'
import runtimeErrorModal from '@replit/vite-plugin-runtime-error-modal'

export default defineConfig({
  plugins: [
    react(),
    checker({ typescript: true }),
    runtimeErrorModal()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
