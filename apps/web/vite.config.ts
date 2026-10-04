/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";

// Same-origin BFF: the .NET backend (dev: http://localhost:5182) owns /api and the /auth routes. The
// browser only talks to the Vite origin (:5175), which proxies these through — so the session cookie
// stays first-party and there is no CORS.
const backend = process.env.BACKEND_ORIGIN ?? "http://localhost:5182";
const proxied = ["/api", "/geo-api", "/contact-api", "/location-api", "/photo-api", "/auth", "/signin-oidc", "/signout-callback-oidc", "/livez", "/readyz"];

export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset({ panicThreshold: "all_errors" })] }), tailwindcss()],
  server: {
    port: 5175,
    proxy: Object.fromEntries(
      proxied.map((path) => [path, { target: backend, changeOrigin: true, secure: false }]),
    ),
  },
  build: {
    // Single-container deploy: emit straight into the BFF's wwwroot.
    outDir: "../../src/LupiraMapsBff/wwwroot",
    emptyOutDir: true,
    rolldownOptions: {
      output: {
        advancedChunks: {
          // Stable vendor chunk so app-code deploys don't re-download MUI/Emotion.
          groups: [{ name: "vendor-mui", test: /node_modules[\\/](@mui|@emotion)[\\/]/ }],
        },
      },
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    passWithNoTests: true,
  },
});
