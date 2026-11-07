import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react(), {
    name: 'private-3d-preview-path',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.split('?')[0] === '/3d-preview') {
          response.writeHead(302, { Location: '/3d-preview/' });
          response.end();
          return;
        }
        next();
      });
    },
  }],
  server: {
    port: 5173,
    fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/data/**', '**/server/**'] },
    proxy: {
      '/api': 'http://127.0.0.1:3001',
      '/uploads': 'http://127.0.0.1:3001',
      '^/3d-preview(?:/|$)': {
        target: 'http://192.168.100.110:8766',
        // The private asset server accepts only its explicit file whitelist.
        // Ignore cache-busting queries; never proxy another site's root routes.
        rewrite: path => path.split('?')[0].replace(/^\/3d-preview(?=\/|$)/, '') || '/',
      },
    },
  },
});
