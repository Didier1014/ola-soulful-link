// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import path from 'node:path';
import { loadEnv } from 'vite';

export default defineConfig({
  vite: {
    plugins: [{
      name: 'email-server-env',
      config(_config, { mode }) {
        Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
      },
    }],
    resolve: {
      alias: [
        { find: 'entities/lib/decode.js', replacement: path.resolve('node_modules/entities/lib/decode.js') },
        { find: 'entities/lib/encode.js', replacement: path.resolve('node_modules/entities/lib/encode.js') },
        { find: 'entities/decode', replacement: path.resolve('node_modules/entities/lib/esm/decode.js') },
        { find: 'entities/encode', replacement: path.resolve('node_modules/entities/lib/esm/encode.js') },
        { find: 'entities/escape', replacement: path.resolve('node_modules/entities/lib/esm/escape.js') },
        { find: /^entities$/, replacement: path.resolve('node_modules/entities/lib/esm/index.js') },
      ],
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
