import { build } from "esbuild";
import { spawnSync } from "node:child_process";
await build({
  entryPoints: ["tests/engine.test.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  outfile: "tests/.engine-run.mjs",
  plugins: [
    {
      name: "mock-storage",
      setup(b) {
        b.onResolve({ filter: /\/storage$/ }, (args) => ({
          path: "mock-storage",
          namespace: "mock",
        }));
        b.onLoad({ filter: /.*/, namespace: "mock" }, () => ({
          contents: "export const storage = {};",
          loader: "js",
        }));
      },
    },
  ],
});
const r = spawnSync(process.execPath, ["tests/.engine-run.mjs"], {
  stdio: "inherit",
});
process.exitCode = r.status ?? 1;
