import { copy, ensureDir } from "https://deno.land/std@0.221.0/fs/mod.ts";
import { build } from "https://deno.land/x/esbuild@v0.25.1/mod.js";

// Define source and destination folders
const SRC_DIR = "./src";
const DIST_DIR = "./dist";

// Ensure the dist folder exists
await ensureDir(DIST_DIR);

// Function to compile each TypeScript file separately
async function compileTs() {
  const entryPoints: string[] = [];
  for await (const file of Deno.readDir(SRC_DIR)) {
    if (!file.isFile || !file.name.endsWith(".ts")) {
      continue;
    }
    entryPoints.push(`${SRC_DIR}/${file.name}`);
  }
  await build({
    entryPoints: entryPoints,
    outdir: DIST_DIR,
    bundle: false, // Keeps files separate
    minify: true,
    format: "esm",
    platform: "browser",
    target: ["es2020"], // Ensure modern JS output
  });
  console.log("✅ TS files compiled to dist/");
}

// Function to copy HTML files
async function copyHtml() {
  for await (const file of Deno.readDir(SRC_DIR)) {
    if (file.isFile && file.name.endsWith(".html")) {
      await copy(`${SRC_DIR}/${file.name}`, `${DIST_DIR}/${file.name}`, {
        overwrite: true,
      });
    }
  }
  console.log("✅ HTML files copied to dist/");
}

// Run the tasks
await compileTs();
await copyHtml();
console.log("🚀 Build completed successfully!");
Deno.exit(0);
