import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import {
  chmod,
  cp,
  mkdir,
  readFile,
  rm,
  stat,
  writeFile
} from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";

const root = process.cwd();
const packageJsonPath = join(root, "package.json");
const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
const version = packageJson.version;
if (!version) {
  throw new Error("package.json missing version");
}
const releaseRoot = join(root, "dist", "release");
const artifactName = `sayCast-${version}-universal`;
const stagingDir = join(releaseRoot, `.${artifactName}.staging`);
await rm(releaseRoot, { recursive: true, force: true });
await mkdir(stagingDir, { recursive: true });
const coreDir = join(stagingDir, "core");
await mkdir(coreDir, { recursive: true });
await run("pnpm", [
  "dlx",
  "esbuild",
  join(root, "apps", "core", "src", "index.ts"),
  "--bundle",
  "--platform=node",
  "--target=node18",
  "--format=esm",
  `--outfile=${join(coreDir, "index.mjs")}`,
  '--define:process.env.NODE_ENV="production"',
  "--log-level=info"
]);
const hudSource = join(root, "apps", "hud");
const hudTarget = join(stagingDir, "hud");
await cp(hudSource, hudTarget, { recursive: true, dereference: true });
await prune([join(hudTarget, "dist"), join(hudTarget, "tmp")]);
const helperSource = join(root, "dist", "native-helper", "SayCastNativeHelper");
await stat(helperSource);
const binDir = join(stagingDir, "bin");
await mkdir(binDir, { recursive: true });
const helperTarget = join(binDir, "SayCastNativeHelper");
await cp(helperSource, helperTarget);
await chmod(helperTarget, 0o755);
const launcherLines = [
  "#!/bin/bash",
  "set -euo pipefail",
  'SOURCE="${BASH_SOURCE[0]}"',
  'while [ -L "$SOURCE" ]; do',
  'DIR="$(cd -P "$(dirname "$SOURCE")" && pwd)"',
  'SOURCE="$(readlink "$SOURCE")"',
  'if [[ "$SOURCE" != /* ]]; then',
  'SOURCE="$DIR/$SOURCE"',
  "fi",
  "done",
  'ROOT="$(cd -P "$(dirname "$SOURCE")/.." && pwd)"',
  'DEFAULT_HOME="$HOME/Library/Application Support/sayCast"',
  'DEFAULT_LOGS="$HOME/Library/Logs/sayCast"',
  'STATE_DIR="${SAYCAST_HOME:-$DEFAULT_HOME}"',
  'LOG_DIR="${SAYCAST_LOGS:-$DEFAULT_LOGS}"',
  'mkdir -p "$STATE_DIR" "$LOG_DIR"',
  'export SAYCAST_HOME="$STATE_DIR"',
  'export SAYCAST_LOGS="$LOG_DIR"',
  "export START_NATIVE_HELPER=1",
  'export SAYCAST_NATIVE_HELPER_PATH="$ROOT/bin/SayCastNativeHelper"',
  'export NODE_ENV="${NODE_ENV:-production}"',
  'CORE_DIR="$ROOT/core"',
  'HUD_DIR="$ROOT/hud"',
  'CORE_ENTRY="$CORE_DIR/index.mjs"',
  'CORE_LOG="$LOG_DIR/core.log"',
  'HUD_LOG="$LOG_DIR/hud.log"',
  'HELPER_LOG="$LOG_DIR/native-helper.log"',
  'touch "$CORE_LOG" "$HUD_LOG" "$HELPER_LOG"',
  'node "$CORE_ENTRY" >>"$CORE_LOG" 2>&1 &',
  "CORE_PID=$!",
  '"$ROOT/bin/SayCastNativeHelper" >>"$HELPER_LOG" 2>&1 &',
  "HELPER_PID=$!",
  '"$HUD_DIR/node_modules/.bin/electron" "$HUD_DIR" >>"$HUD_LOG" 2>&1 &',
  "HUD_PID=$!",
  'trap \'kill "$CORE_PID" "$HELPER_PID" "$HUD_PID"\' INT TERM',
  'wait "$CORE_PID" "$HELPER_PID" "$HUD_PID"'
];
const launcher = `${launcherLines.join("\n")}\n`;
const launcherPath = join(binDir, "saycast");
await writeFile(launcherPath, launcher);
await chmod(launcherPath, 0o755);
await writeFile(join(stagingDir, "VERSION"), `${version}\n`);
const finalDir = join(releaseRoot, artifactName);
await mkdir(releaseRoot, { recursive: true });
await rm(finalDir, { recursive: true, force: true });
await run("mv", [stagingDir, finalDir]);
const tarballPath = join(releaseRoot, `${artifactName}.tar.gz`);
await run("tar", ["-czf", tarballPath, "-C", releaseRoot, artifactName]);
const zipPath = join(releaseRoot, `${artifactName}.zip`);
await run("ditto", ["-c", "-k", "--sequesterRsrc", "--keepParent", finalDir, zipPath]);
const tarballSha = await sha256(tarballPath);
const zipSha = await sha256(zipPath);
const manifest = {
  version,
  artifactName,
  generatedAt: new Date().toISOString(),
  files: {
    tarball: {
      path: tarballPath,
      sha256: tarballSha
    },
    zip: {
      path: zipPath,
      sha256: zipSha
    }
  }
};
await writeFile(join(releaseRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
const shaSummary = `tar.gz ${tarballSha}\nzip ${zipSha}\n`;
await writeFile(join(releaseRoot, `${artifactName}-sha256.txt`), shaSummary);
console.log(JSON.stringify(manifest, null, 2));

/**
 * @param {string} command
 * @param {string[]} args
 * @param {import("node:child_process").SpawnOptions} options
 */
async function run(command, args, options = {}) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", ...options });
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
      }
    });
    child.on("error", reject);
  });
}

/**
 * @param {string[]} targets
 */
async function prune(targets) {
  for (const target of targets) {
    await rm(target, { recursive: true, force: true });
  }
}

/**
 * @param {string} filePath
 */
async function sha256(filePath) {
  const hash = createHash("sha256");
  await new Promise((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on("data", (data) => hash.update(data));
    stream.on("close", resolve);
    stream.on("error", reject);
  });
  return hash.digest("hex");
}

