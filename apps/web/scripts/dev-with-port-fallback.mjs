import net from "node:net";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const host = process.env.HOST ?? "0.0.0.0";
const preferredPort = Number(process.env.PORT ?? process.env.WEB_PORT ?? 3000);
const fallbackPort = Number(process.env.FALLBACK_PORT ?? 3001);
const probeHosts = ["127.0.0.1", "::1"];
const require = createRequire(import.meta.url);

function canConnect(port, probeHost) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: probeHost, port });

    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

async function isPortAvailable(port) {
  const connections = await Promise.all(
    probeHosts.map((probeHost) => canConnect(port, probeHost)),
  );

  return connections.every((connected) => !connected);
}

async function choosePort() {
  if (await isPortAvailable(preferredPort)) {
    return preferredPort;
  }

  if (preferredPort === fallbackPort || !(await isPortAvailable(fallbackPort))) {
    throw new Error(
      `Ports ${preferredPort} and ${fallbackPort} are not available.`,
    );
  }

  console.log(
    `Port ${preferredPort} is busy. Starting web on ${fallbackPort} instead.`,
  );

  return fallbackPort;
}

const port = await choosePort();
const nextBin = require.resolve("next/dist/bin/next");
const child = spawn(
  process.execPath,
  [nextBin, "dev", "-H", host, "-p", String(port), ...process.argv.slice(2)],
  {
    stdio: "inherit",
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
