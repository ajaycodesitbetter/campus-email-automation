import { build } from "esbuild";
import { spawnSync } from "node:child_process";
await build({
  entryPoints: ["tests/routes.test.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  outfile: "tests/.routes-run.mjs",
  plugins: [
    {
      name: "mock-services",
      setup(b) {
        b.onResolve(
          { filter: /\/(storage|db|services\/emailService)$/ },
          (args) => ({
            path: args.path.endsWith("/storage")
              ? "storage"
              : args.path.endsWith("/db")
                ? "db"
                : "email",
            namespace: "mock",
          }),
        );
        b.onLoad({ filter: /.*/, namespace: "mock" }, (args) => ({
          contents:
            args.path === "storage"
              ? "export const storage = {};"
              : args.path === "db"
                ? "export const pool = {query:async()=>({rows:[]})};"
                : "export const emailService = {replacePlaceholders:(s)=>s};",
          loader: "js",
        }));
      },
    },
  ],
});
const r = spawnSync(process.execPath, ["tests/.routes-run.mjs"], {
  stdio: "inherit",
});
process.exitCode = r.status ?? 1;
