import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    'global': 'globalThis',
  },
  optimizeDeps: {
    include: ['matrix-js-sdk'],
    exclude: ['@matrix-org/olm']
  },
  build: {
    commonjsOptions: {
      include: [/matrix-js-sdk/, /node_modules/]
    }
  },
  server: {
    fs: {
      allow: ['..']
    }
  }
})

