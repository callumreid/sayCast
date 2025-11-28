#!/usr/bin/env node
import { build } from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const hudDir = path.resolve(__dirname, '..');
const coreDir = path.resolve(hudDir, '../core');
const nativeHelperDir = path.resolve(hudDir, '../native-helper');
const resourcesDir = path.resolve(hudDir, 'resources');

async function bundleCore() {
  console.log('📦 Bundling main process...');
  
  await build({
    entryPoints: [path.join(hudDir, 'main.js')],
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'cjs',
    outfile: path.join(hudDir, 'main-bundle.js'),
    external: ['electron'],
    sourcemap: false,
    minify: false
  });
  
  console.log('✅ Main process bundled to main-bundle.js');
}

function buildNativeHelper() {
  console.log('🔨 Building native helper...');
  
  if (!fs.existsSync(resourcesDir)) {
    fs.mkdirSync(resourcesDir, { recursive: true });
  }
  
  const targetPath = path.join(resourcesDir, 'SayCastNativeHelper');
  
  const tryBuild = (buildCmd, description) => {
    try {
      console.log(`   Trying: ${description}`);
      execSync(buildCmd, { cwd: nativeHelperDir, stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  };
  
  const buildAttempts = [
    { cmd: 'swift build -c release --arch arm64 --arch x86_64', desc: 'universal binary (arm64 + x86_64)' },
    { cmd: 'swift build -c release', desc: 'release build (native arch)' },
    { cmd: 'swift build', desc: 'debug build' }
  ];
  
  let buildSuccess = false;
  for (const attempt of buildAttempts) {
    if (tryBuild(attempt.cmd, attempt.desc)) {
      buildSuccess = true;
      console.log(`   ✓ ${attempt.desc} succeeded`);
      break;
    }
  }
  
  if (!buildSuccess) {
    console.error('❌ All build attempts failed');
    console.log('   Make sure you have Xcode or Xcode Command Line Tools installed.');
    process.exit(1);
  }
  
  const binaryPaths = [
    path.join(nativeHelperDir, '.build/apple/Products/Release/SayCastNativeHelper'),
    path.join(nativeHelperDir, '.build/release/SayCastNativeHelper'),
    path.join(nativeHelperDir, '.build/debug/SayCastNativeHelper')
  ];
  
  let sourceBinary = null;
  for (const p of binaryPaths) {
    if (fs.existsSync(p)) {
      sourceBinary = p;
      break;
    }
  }
  
  if (sourceBinary) {
    fs.copyFileSync(sourceBinary, targetPath);
    fs.chmodSync(targetPath, 0o755);
    console.log('✅ Native helper copied to resources/');
  } else {
    console.error('❌ Could not find built binary');
    process.exit(1);
  }
}

async function main() {
  console.log('\n🚀 sayCast Build Script\n');
  
  await bundleCore();
  buildNativeHelper();
  
  console.log('\n✨ Build complete!\n');
}

main().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});

