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
    minify: false,
    // keepNames: true, // Prevent renaming functions/classes that might be needed by HTML
    format: "esm",
    platform: "browser",
    target: ["es2020"], // Ensure modern JS output
  });
  console.log("✅ TS files compiled to dist/");
}

// Function to copy HTML and CSS files
async function copyHtmlCss() {
  for await (const file of Deno.readDir(SRC_DIR)) {
    if (file.isFile && (file.name.endsWith(".html") || file.name.endsWith(".css"))) {
      await copy(`${SRC_DIR}/${file.name}`, `${DIST_DIR}/${file.name}`, {
        overwrite: true,
      });
    }
  }
  console.log("✅ HTML and CSS files copied to dist/");
}

async function copyJson() {
  for await (const file of Deno.readDir(SRC_DIR)) {
    if (!file.isFile || !file.name.endsWith(".json")) {
      continue;
    }
    const sourcePath = `${SRC_DIR}/${file.name}`;
    const destPath = `${DIST_DIR}/${file.name}`;
    try {
      // Read the JSON file content
      const content = await Deno.readTextFile(sourcePath);
      // Parse the JSON content
      const jsonObj = JSON.parse(content);
      // Stringify without indentation (minifies)
      const minifiedJson = JSON.stringify(jsonObj);
      // Write the minified content to the destination
      await Deno.writeTextFile(destPath, minifiedJson);
    } catch (error) {
      console.error(`❌ Error processing JSON file ${file.name}:`, error);
    }
  }
  console.log("✅ JSON files minified and copied to dist/");
}
// Run the tasks
await Promise.all([compileTs(), copyHtmlCss(), copyJson()]);
console.log("🚀 Build completed successfully!");
Deno.exit(0);
