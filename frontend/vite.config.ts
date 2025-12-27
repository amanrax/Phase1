import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Resolve backend URL - prefer env var, fallback to localhost
const BACKEND_URL = process.env.VITE_API_BASE_URL || 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  base: './', // Crucial for Capacitor builds
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  server: {
    port: 5173,
    host: true,
    strictPort: false,
    proxy: {
      '/api': {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err) => console.log('Proxy error:', err.message))
          proxy.on('proxyReq', (_proxyReq, req) =>
            console.log('Proxying:', req.method, req.url)
          )
        },
      },
      '/health': {
        target: BACKEND_URL,
        changeOrigin: true,
      },
    },
  },
  define: {
    'process.env.VITE_API_BASE_URL': JSON.stringify(BACKEND_URL),
  },
})
