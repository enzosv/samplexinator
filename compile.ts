import { build } from "https://deno.land/x/esbuild@v0.25.1/mod.js";

// Define source and destination folders
const SRC_DIR = "./src";

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
    outdir: SRC_DIR,
    bundle: false, // Keeps files separate
    minify: false,
    format: "esm",
    platform: "browser",
    target: ["es2020"], // Ensure modern JS output
  });
  console.log("✅ TS files compiled to JS");
}

// Run the tasks
await compileTs();
console.log("🚀 Build completed successfully!");
Deno.exit(0);
