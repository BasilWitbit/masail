// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import type { Plugin } from "vite";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

/** Production-only: strip debug consoles. Leaves console.error / console.warn. */
function stripDebugConsole(): Plugin {
  return {
    name: "strip-debug-console",
    apply: "build",
    transform(code, id) {
      if (id.includes("node_modules")) return null;
      const file = id.split("?")[0] ?? id;
      if (!/\.[cm]?[jt]sx?$/.test(file)) return null;
      if (!code.includes("console.")) return null;
      return {
        code: code.replace(/\bconsole\.(log|debug|info)\s*\(/g, "void("),
        map: null,
      };
    },
  };
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [stripDebugConsole()],
    esbuild: {
      pure: ["console.log", "console.debug", "console.info"],
    },
  },
});
