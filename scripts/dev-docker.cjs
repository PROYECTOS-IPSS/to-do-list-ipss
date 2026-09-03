#!/usr/bin/env node
/* global require, __dirname, console, process, URL */
/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn, execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const envPath = path.join(root, ".env");
const compose = ["compose", "-p", "task-manager-dev", "-f", "docker-compose.yml"];
const run = (args, options = {}) => execFileSync("docker", [...compose, ...args], { cwd: root, stdio: options.stdio ?? "inherit", timeout: options.timeout ?? 120_000 });
const readEnv = () => new Map(fs.readFileSync(envPath, "utf8").split(/\r?\n/).filter((line) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(line)).map((line) => { const index = line.indexOf("="); return [line.slice(0, index), line.slice(index + 1)]; }));
const fileEnv = readEnv();
const backendPort = process.env.BACKEND_PORT || fileEnv.get("BACKEND_PORT");
const apiUrl = process.env.EXPO_PUBLIC_API_URL || fileEnv.get("EXPO_PUBLIC_API_URL");
if (!backendPort || !apiUrl) { console.error("dev:docker: configuración incompleta; ejecuta yarn setup."); process.exit(1); }
const port = Number(backendPort);
if (!Number.isInteger(port) || port < 1 || port > 65535) { console.error("dev:docker: BACKEND_PORT inválido."); process.exit(1); }
try { const parsed = new URL(apiUrl); if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error(); } catch { console.error("dev:docker: EXPO_PUBLIC_API_URL inválida."); process.exit(1); }
let stopping = false;
let metro;
const stop = (code = 0) => {
  if (stopping) return;
  stopping = true;
  if (metro && !metro.killed) metro.kill("SIGINT");
  try { run(["down"]); } catch (error) { console.error(`dev:docker: falló compose down (${error.status ?? error.code ?? "sin código"}).`); code ||= 1; }
  process.exit(code);
};
try { run(["up", "-d", "--build"], { timeout: 20 * 60_000 }); }
catch (error) {
  const reason = error.killed ? "timeout de build/arranque" : "fallo de Compose";
  console.error(`dev:docker: ${reason}. código=${error.code ?? "sin código"}, estado=${error.status ?? "sin estado"}, señal=${error.signal ?? "ninguna"}. Consulta: yarn logs:docker`);
  process.exit(1);
}
const deadline = Date.now() + 120_000;
let ready = false;
while (Date.now() < deadline) {
  try { execFileSync("curl", ["--fail", "--silent", "--show-error", `http://127.0.0.1:${port}/ready`], { stdio: "ignore", timeout: 3000 }); ready = true; break; }
  catch { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2000); }
}
if (!ready) { console.error(`dev:docker: readiness agotada en 120s para 127.0.0.1:${port}.`); try { run(["ps"]); } finally { stop(1); } }
console.log(`Docker listo en 127.0.0.1:${port}. Metro usa ${apiUrl}. Ctrl+C detiene Metro y Compose sin borrar volúmenes.`);
metro = spawn("yarn", ["workspace", "task-manager-mobile", "start:dev-client"], { cwd: root, stdio: "inherit", env: { ...process.env, EXPO_PUBLIC_API_URL: apiUrl } });
metro.on("error", (error) => { console.error(`dev:docker: no pudo iniciar Metro (${error.code ?? "sin código"}).`); stop(1); });
metro.on("exit", (code, signal) => { if (!stopping) stop(code ?? (signal ? 1 : 0)); });
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
