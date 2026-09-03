#!/usr/bin/env node
/* global require, __dirname, console, process, URL */
/* eslint-disable @typescript-eslint/no-require-imports */
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const envPath = process.env.TASK_MANAGER_ENV_FILE || path.join(root, ".env");
const examplePath = path.join(root, ".env.example");
const args = new Map(
  process.argv
    .slice(2)
    .map((arg, index, values) =>
      arg.startsWith("--")
        ? [
            arg.slice(2),
            values[index + 1]?.startsWith("--")
              ? ""
              : (values[index + 1] ?? ""),
          ]
        : [],
    ),
);
const nonInteractive = process.argv.includes("--non-interactive");
const requestedUrl = args.get("api-url");
if (args.has("api-url")) {
  try {
    const parsed = new URL(requestedUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
  } catch {
    return fail("--api-url requiere una URL HTTP o HTTPS válida.");
  }
}

function fail(message) {
  console.error(`setup: ${message}`);
  process.exitCode = 1;
}
function commandAvailable(command, args) {
  try {
    execFileSync(command, args, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
function readEnv() {
  if (!fs.existsSync(envPath)) return new Map();
  return new Map(
    fs
      .readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .filter((line) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(line))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );
}
function candidates() {
  return [
    ...new Set(
      Object.values(os.networkInterfaces()).flatMap((items) =>
        (items ?? [])
          .filter((item) => item.family === "IPv4" && !item.internal)
          .map((item) => item.address),
      ),
    ),
  ];
}

if (!commandAvailable("node", ["--version"]))
  fail("Node.js no está disponible.");
if (!commandAvailable("yarn", ["--version"]))
  fail("Yarn 1.22.22 no está disponible.");
if (!commandAvailable("docker", ["compose", "version"]))
  fail(
    "Docker Compose no está disponible. Instala Docker Desktop o Docker Engine con Compose.",
  );
if (process.exitCode) process.exit();

if (!fs.existsSync(envPath))
  fs.copyFileSync(examplePath, envPath, fs.constants.COPYFILE_EXCL);
const env = readEnv();
const updates = new Map();
const defaults = new Map([
  ["POSTGRES_DB", "task_manager_dev"],
  ["POSTGRES_USER", "task_manager_dev"],
  ["BACKEND_PORT", "3000"],
]);
for (const [key, value] of defaults) if (!env.get(key)) updates.set(key, value);
if (
  !env.get("POSTGRES_PASSWORD") ||
  env.get("POSTGRES_PASSWORD") === "change-this-local-password"
)
  updates.set("POSTGRES_PASSWORD", crypto.randomBytes(24).toString("hex"));
if (
  !env.get("JWT_SECRET") ||
  env.get("JWT_SECRET") === "replace-with-a-long-random-local-secret"
)
  updates.set("JWT_SECRET", crypto.randomBytes(32).toString("hex"));
if (args.has("api-url")) updates.set("EXPO_PUBLIC_API_URL", requestedUrl);
const apiUrl = requestedUrl || env.get("EXPO_PUBLIC_API_URL");
if (!apiUrl) {
  const ips = candidates();
  if (nonInteractive)
    return fail(
      `Falta EXPO_PUBLIC_API_URL. Usa --api-url http://IP_LAN:3000. Candidatas: ${ips.join(", ") || "ninguna"}.`,
    );
  if (ips.length !== 1)
    return fail(
      `Define EXPO_PUBLIC_API_URL manualmente${ips.length ? ` entre: ${ips.join(", ")}` : ""}.`,
    );
  updates.set(
    "EXPO_PUBLIC_API_URL",
    `http://${ips[0]}:${env.get("BACKEND_PORT") || "3000"}`,
  );
}
if (updates.size) {
  const lines = fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .map((line) => {
      const key = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=/)?.[1];
      return key && updates.has(key) ? `${key}=${updates.get(key)}` : line;
    });
  for (const [key, value] of updates)
    if (!lines.some((line) => line.startsWith(`${key}=`)))
      lines.push(`${key}=${value}`);
  fs.writeFileSync(envPath, `${lines.join("\n").replace(/\n+$/, "")}\n`);
}
const finalEnv = readEnv();
const required = [
  "POSTGRES_DB",
  "POSTGRES_USER",
  "POSTGRES_PASSWORD",
  "JWT_SECRET",
  "BACKEND_PORT",
  "EXPO_PUBLIC_API_URL",
];
const missing = required.filter((key) => !finalEnv.get(key));
if (missing.length) return fail(`Variables ausentes: ${missing.join(", ")}.`);
const port = Number(finalEnv.get("BACKEND_PORT"));
if (!Number.isInteger(port) || port < 1 || port > 65535)
  return fail("BACKEND_PORT debe ser un puerto entre 1 y 65535.");
try {
  const parsedUrl = new URL(finalEnv.get("EXPO_PUBLIC_API_URL"));
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:")
    throw new Error();
} catch {
  return fail("EXPO_PUBLIC_API_URL debe ser una URL HTTP válida.");
}
console.log(
  `Configuración lista. API pública: ${finalEnv.get("EXPO_PUBLIC_API_URL")}`,
);
