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

async function copyAssets(
  srcDir: string = SRC_DIR,
  destDir: string = DIST_DIR
) {
  for await (const entry of Deno.readDir(srcDir)) {
    const sourcePath = `${srcDir}/${entry.name}`;
    const destPath = `${destDir}/${entry.name}`;

    if (entry.isDirectory) {
      // Create destination directory if it doesn't exist
      try {
        await Deno.mkdir(destPath, { recursive: true });
      } catch (err) {
        if (!(err instanceof Deno.errors.AlreadyExists)) {
          throw err;
        }
      }
      // Recursively copy directory contents
      await copyAssets(sourcePath, destPath);
      continue;
    }

    if (!entry.isFile) {
      continue;
    }

    if (entry.name.endsWith(".ts")) {
      // skip ts files
      continue;
    }

    if (!entry.name.endsWith(".json")) {
      // Direct copy for non-JSON files
      await Deno.copyFile(sourcePath, destPath);
      continue;
    }

    // Minify JSON files
    try {
      const content = await Deno.readTextFile(sourcePath);
      const jsonObj = JSON.parse(content);
      const minifiedJson = JSON.stringify(jsonObj);
      await Deno.writeTextFile(destPath, minifiedJson);
    } catch (error) {
      console.error(`❌ Error processing JSON file ${entry.name}:`, error);
    }
  }

  if (srcDir === SRC_DIR) {
    console.log("✅ All assets copied to dist/");
  }
}

// Run the tasks
await Promise.all([compileTs(), copyAssets()]);
console.log("🚀 Build completed successfully!");
Deno.exit(0);
