import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

export default defineConfig({
  plugins: [preact(), TanStackRouterVite()],
  base: '/factorio-blueprint-playground/',
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
