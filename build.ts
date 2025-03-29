import { copy, ensureDir } from "https://deno.land/std@0.221.0/fs/mod.ts";

// Define source and destination folders
const SRC_DIR = "./src";
const DIST_DIR = "./dist";

// Ensure the dist folder exists
await ensureDir(DIST_DIR);

// Function to compile each TypeScript file separately
async function compileTs() {
  for await (const file of Deno.readDir(SRC_DIR)) {
    if (!file.isFile || !file.name.endsWith(".ts")) {
      continue;
    }
    const inputPath = `${SRC_DIR}/${file.name}`;
    const outputPath = `${DIST_DIR}/${file.name.replace(".ts", ".js")}`;

    // Run Deno bundle command
    const process = new Deno.Command("deno", {
      args: ["bundle", inputPath],
      stdout: "piped",
    });

    const { stdout } = await process.output();
    const jsCode = new TextDecoder().decode(stdout);

    // Write the bundled JavaScript to the dist folder
    await Deno.writeTextFile(outputPath, jsCode);
    console.log(`✅ Compiled ${file.name} → ${outputPath}`);
  }
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
