import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    // Plugin to serve WASM files with correct MIME type
    {
      name: 'configure-response-headers',
      configureServer: (server) => {
        server.middlewares.use((_req, res, next) => {
          res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp')
          res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
          next()
        })
      },
    },
  ],
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
  },
  // Configure asset handling for WASM files
  assetsInclude: ['**/*.wasm'],
})

