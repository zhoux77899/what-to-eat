import { spawn, spawnSync } from "node:child_process";

const readyUrl = "http://127.0.0.1:3000/zh";
const startupTimeoutMs = 120_000;

function spawnCommand(command, args, options = {}) {
  if (process.platform === "win32") {
    const quotedCommand = [command, ...args]
      .map((part) => (part.includes(" ") ? `"${part.replaceAll('"', '\\"')}"` : part))
      .join(" ");

    return spawn(quotedCommand, {
      shell: true,
      ...options
    });
  }

  return spawn(command, args, options);
}

async function isServerReady() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3_000);

  try {
    const response = await fetch(readyUrl, {
      redirect: "manual",
      signal: controller.signal
    });
    return response.status >= 200 && response.status < 400;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForServer(server, output) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < startupTimeoutMs) {
    if (await isServerReady()) {
      return;
    }

    if (server.exitCode !== null) {
      throw new Error(`Next dev exited before becoming ready.\n${output.join("")}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  throw new Error(`Timed out waiting for ${readyUrl}.\n${output.join("")}`);
}

function stopServer(server) {
  if (server.exitCode !== null || !server.pid) {
    return;
  }

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], {
      stdio: "ignore"
    });
    spawnSync(
      "pwsh",
      [
        "-NoProfile",
        "-Command",
        "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*pnpm exec next dev*--webpack*127.0.0.1*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"
      ],
      {
        stdio: "ignore"
      }
    );
    return;
  }

  server.kill("SIGTERM");
}

async function main() {
  const serverOutput = [];
  let server;
  let startedServer = false;
  let exitCode = 1;

  try {
    if (!(await isServerReady())) {
      startedServer = true;
      server = spawnCommand(
        "corepack",
        ["pnpm", "exec", "next", "dev", "--webpack", "--hostname", "127.0.0.1"],
        {
          env: {
            ...process.env,
            NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
              process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "pk_test_dummy",
            CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY ?? "sk_test_dummy"
          },
          stdio: ["ignore", "pipe", "pipe"]
        }
      );

      server.stdout.on("data", (chunk) => serverOutput.push(chunk.toString()));
      server.stderr.on("data", (chunk) => serverOutput.push(chunk.toString()));

      await waitForServer(server, serverOutput);
    }

    const tests = spawnCommand(
      "corepack",
      ["pnpm", "exec", "playwright", "test", "--config", "playwright.config.ts"],
      {
        stdio: "inherit"
      }
    );

    exitCode = await new Promise((resolve) => {
      tests.on("error", () => resolve(1));
      tests.on("exit", (code) => resolve(code ?? 1));
    });
  } finally {
    if (startedServer && server) {
      stopServer(server);
    }
  }

  process.exit(exitCode);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
