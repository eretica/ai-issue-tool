import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'
import type { Plugin } from 'vite'

/**
 * Remove Electron-specific CSP meta tag so Vite dev server
 * can inject inline scripts for HMR.
 */
function removeCSP(): Plugin {
  return {
    name: 'remove-csp-for-e2e',
    transformIndexHtml(html) {
      return html.replace(
        /<meta\s+http-equiv="Content-Security-Policy"[^>]*>/i,
        ''
      )
    },
  }
}

export default defineConfig({
  root: 'src/renderer',
  plugins: [react(), tailwindcss(), removeCSP()],
  resolve: {
    alias: {
      '@renderer': resolve(__dirname, 'src/renderer/src'),
      '@shared': resolve(__dirname, 'src/shared'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
})
