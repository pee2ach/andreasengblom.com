#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = process.cwd();
const RAW_ROOT = path.join(ROOT, '_raw');

const PRESETS = [
  {
    test: rel => rel === 'assets/logo.png',
    widths: [112, 224, 336],
    quality: 88,
  },
  {
    test: rel => rel.startsWith('assets/om-mig/'),
    widths: [480, 768, 1100],
    quality: 82,
  },
  {
    test: rel => rel.startsWith('assets/'),
    widths: [640, 960, 1280, 1920],
    quality: 84,
  },
  {
    test: rel => rel.startsWith('tattoo-images/'),
    widths: [480, 768, 1200],
    quality: 82,
  },
];

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.DS_Store') continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(abs));
    else out.push(abs);
  }
  return out;
}

function run(cmd, args) {
  const result = spawnSync(cmd, args, { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `Command failed: ${cmd}`);
  }
  return result.stdout;
}

function getPreset(relPath) {
  const preset = PRESETS.find(item => item.test(relPath));
  if (!preset) throw new Error(`No preset found for ${relPath}`);
  return preset;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function encodeWebp(inputPath, outputPath, width, quality) {
  const args = ['-quiet', '-q', String(quality)];
  if (width) args.push('-resize', String(width), '0');
  args.push(inputPath, '-o', outputPath);
  run('cwebp', args);
}

function main() {
  const files = walk(RAW_ROOT).filter(file => /\.(jpe?g|png)$/i.test(file));
  let generated = 0;

  for (const rawFile of files) {
    const relFromRaw = path.relative(RAW_ROOT, rawFile).replace(/\\/g, '/');
    const preset = getPreset(relFromRaw);
    const publicDir = path.join(ROOT, path.dirname(relFromRaw));
    const stem = path.basename(relFromRaw, path.extname(relFromRaw));
    ensureDir(publicDir);

    for (const width of preset.widths) {
      const outFile = path.join(publicDir, `${stem}-${width}.webp`);
      encodeWebp(rawFile, outFile, width, preset.quality);
      generated += 1;
    }
  }

  console.log(`Generated ${generated} webp files from ${files.length} raw sources.`);
}

main();
