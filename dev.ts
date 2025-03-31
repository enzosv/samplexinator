import {
    serve,
    type ConnInfo,
} from "https://deno.land/std@0.224.0/http/server.ts";
import { serveDir } from "https://deno.land/std@0.224.0/http/file_server.ts";
import { join } from "https://deno.land/std@0.224.0/path/mod.ts";
import { debounce } from "https://deno.land/std@0.224.0/async/debounce.ts";
import { green, red, yellow } from "https://deno.land/std@0.224.0/fmt/colors.ts";

const SRC_DIR = "src";
const DIST_DIR = "dist";
const PORT = 8000;
const LIVE_RELOAD_SCRIPT = `
  <script>
    const socket = new WebSocket(\`ws://\${location.host}/ws\`);
    socket.addEventListener('message', (event) => {
      if (event.data === 'reload') {
        console.log('Reloading page...');
        location.reload();
      }
    });
    socket.addEventListener('open', () => console.log('Live reload connected.'));
    socket.addEventListener('close', () => console.log('Live reload disconnected.'));
    socket.addEventListener('error', (err) => console.error('Live reload error:', err));
  </script>
`;

// Store active WebSocket connections
const sockets = new Set<WebSocket>();

// --- Build Function ---
async function runBuild(): Promise<boolean> {
    console.log(yellow("🔄 Running build..."));
    const command = new Deno.Command("deno", {
        args: ["run", "-A", "build.ts"], // Ensure build.ts is executable and permissions are allowed
        stdout: "piped",
        stderr: "piped",
    });

    const { code, stdout, stderr } = await command.output();
    const outputText = new TextDecoder().decode(stdout);
    const errorText = new TextDecoder().decode(stderr);

    if (code === 0) {
        console.log(green("✅ Build successful!"));
        console.log(outputText);
        return true;
    } else {
        console.error(red("❌ Build failed!"));
        console.error(errorText);
        return false;
    }
}

// --- WebSocket Notification ---
function notifyClients() {
    console.log(yellow(`🚀 Notifying ${sockets.size} client(s) to reload...`));
    sockets.forEach((socket) => {
        if (socket.readyState === WebSocket.OPEN) {
            socket.send("reload");
        }
    });
}

// Debounce build and notify to avoid rapid triggers
const debouncedBuildAndNotify = debounce(async () => {
    const success = await runBuild();
    if (success) {
        notifyClients();
    }
}, 500); // Adjust debounce time (ms) as needed

// --- File Watcher ---
async function watchFiles() {
    console.log(yellow(`👀 Watching for changes in './${SRC_DIR}'...`));
    const watcher = Deno.watchFs(SRC_DIR);
    for await (const event of watcher) {
        // Trigger build on create, modify, or remove events
        if (["create", "modify", "remove"].includes(event.kind)) {
            console.log(yellow(`Detected ${event.kind} in: ${event.paths.join(", ")}`));
            debouncedBuildAndNotify(); // Use the debounced function
        }
    }
}

// --- HTTP Server ---
async function startServer() {
    console.log(green(` Mapped server listening on http://localhost:${PORT}`));

    await serve(
        async (req: Request, connInfo: ConnInfo): Promise<Response> => {
            const url = new URL(req.url);

            // Handle WebSocket upgrade requests
            if (req.headers.get("upgrade") === "websocket" && url.pathname === "/ws") {
                const { socket, response } = Deno.upgradeWebSocket(req);

                socket.onopen = () => {
                    console.log(green("➕ WebSocket connected"));
                    sockets.add(socket);
                };
                socket.onclose = () => {
                    console.log(yellow("➖ WebSocket disconnected"));
                    sockets.delete(socket);
                };
                socket.onerror = (err) => {
                    console.error(red("WebSocket error:"), err);
                    sockets.delete(socket); // Clean up on error
                };
                // No specific message handling needed from client for this setup

                return response;
            }

            // Serve static files from DIST_DIR
            try {
                const response = await serveDir(req, {
                    fsRoot: DIST_DIR,
                    urlRoot: "",
                    showDirListing: false,
                    quiet: true, // Suppress default file serving logs
                });

                // Inject live reload script into HTML responses
                if (
                    response.ok &&
                    response.headers.get("content-type")?.includes("text/html")
                ) {
                    let html = await response.text();
                    html = html.replace("</body>", `${LIVE_RELOAD_SCRIPT}</body>`);
                    // Update Content-Length if necessary (usually handled automatically)
                    const headers = new Headers(response.headers);
                    headers.delete("content-length"); // Let the server recalculate
                    return new Response(html, {
                        status: response.status,
                        statusText: response.statusText,
                        headers: headers,
                    });
                }
                return response;

            } catch (error) {
                if (error instanceof Deno.errors.NotFound) {
                    console.warn(yellow(`File not found: ${url.pathname}`));
                    return new Response("Not Found", { status: 404 });
                }
                console.error(red("File server error:"), error);
                return new Response("Internal Server Error", { status: 500 });
            }
        },
        { port: PORT }
    );
}

// --- Main Execution ---
// Initial build
const initialBuildSuccess = await runBuild();
if (!initialBuildSuccess) {
    console.error(red("Initial build failed. Please fix errors before starting dev server."));
    Deno.exit(1);
}

// Start file watcher and server concurrently
await Promise.all([watchFiles(), startServer()]); 