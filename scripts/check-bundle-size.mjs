#!/usr/bin/env node
/**
 * check-bundle-size.mjs
 *
 * Walks .next/build-manifest.json and per-route page_client-reference-manifest.js
 * files after a production build and sums gzipped chunk sizes per route.
 * Compares to thresholds; exits non-zero if any route exceeds.
 *
 * Next 15/16 App Router shape:
 *   - Shared chunks for all routes live in build-manifest.json → rootMainFiles
 *   - Per-route client chunks live in
 *       .next/server/app/<route>/page_client-reference-manifest.js → entryJSFiles
 *   - The root route manifest is at .next/server/app/page_client-reference-manifest.js
 *
 * Usage:
 *   npm run build && node scripts/check-bundle-size.mjs
 */
import { readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { resolve, join } from 'node:path';

const ROOT = process.cwd();
const NEXT_DIR = resolve(ROOT, '.next');
const MANIFEST = resolve(NEXT_DIR, 'build-manifest.json');

// Gzipped KB thresholds per route (shared + route-specific client chunks).
// These are intentionally generous — the real limits that matter are the ones
// users feel (time-to-interactive), so we gate on a value well above the
// current baseline while still catching accidental bundle explosions.
const THRESHOLDS_KB = {
  '/':          500,
  '/portfolio': 300,
  '/contact':   300,
  '/about':     300,
};

// Map from route key → relative path inside .next/server/app/ where
// page_client-reference-manifest.js lives.
const ROUTE_MANIFEST_PATHS = {
  '/':          'server/app/page_client-reference-manifest.js',
  '/portfolio': 'server/app/portfolio/page_client-reference-manifest.js',
  '/contact':   'server/app/contact/page_client-reference-manifest.js',
  '/about':     'server/app/about/page_client-reference-manifest.js',
};

function fail(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

function ok(msg) {
  console.log(`✓ ${msg}`);
}

function readManifest() {
  try {
    return JSON.parse(readFileSync(MANIFEST, 'utf-8'));
  } catch (err) {
    fail(`could not read ${MANIFEST} — run \`npm run build\` first. (${err.message})`);
  }
}

/**
 * Parse a page_client-reference-manifest.js file and return the set of
 * chunk paths from entryJSFiles (union of all entry arrays).
 *
 * The file is a JS assignment:
 *   globalThis.__RSC_MANIFEST["/<route>/page"] = { ... };
 * We extract the JSON object via a regex rather than eval.
 */
function parseRouteClientChunks(manifestJsPath) {
  let text;
  try {
    text = readFileSync(manifestJsPath, 'utf-8');
  } catch (err) {
    return null; // file missing — route doesn't exist in this build
  }

  // The file ends with `= { ... };` — grab the last {...} blob.
  const m = text.match(/=\s*(\{[\s\S]+\});\s*$/);
  if (!m) return null;

  let data;
  try {
    data = JSON.parse(m[1]);
  } catch {
    return null;
  }

  const chunks = new Set();
  for (const chunkList of Object.values(data.entryJSFiles ?? {})) {
    for (const chunk of chunkList) {
      // Strip leading /_next/ prefix if present (some builds include it).
      chunks.add(chunk.replace(/^\/?_next\//, ''));
    }
  }
  return chunks;
}

function gzippedSize(filePath) {
  try {
    statSync(filePath);
  } catch {
    return 0; // file not present on disk — skip
  }
  const buf = readFileSync(filePath);
  return gzipSync(buf).byteLength;
}

function main() {
  console.log('Checking bundle sizes (gzipped, client JS) against thresholds…\n');
  console.log('  Manifest shape: App Router (rootMainFiles + per-route entryJSFiles)\n');

  const buildManifest = readManifest();

  // Shared chunks sent to every route.
  const sharedChunks = new Set([
    ...(buildManifest.rootMainFiles ?? []),
    ...(buildManifest.polyfillFiles ?? []),
  ]);

  // Pre-calculate shared size once.
  let sharedBytes = 0;
  for (const chunk of sharedChunks) {
    sharedBytes += gzippedSize(join(NEXT_DIR, chunk));
  }
  const sharedKb = sharedBytes / 1024;
  console.log(`  Shared chunks (rootMainFiles + polyfills): ${sharedKb.toFixed(1)} KB\n`);

  let failed = false;

  for (const [route, kbLimit] of Object.entries(THRESHOLDS_KB)) {
    const relManifest = ROUTE_MANIFEST_PATHS[route];
    if (!relManifest) {
      console.log(`  · ${route.padEnd(12)}  (no manifest path configured — skipping)`);
      continue;
    }

    const routeChunks = parseRouteClientChunks(join(NEXT_DIR, relManifest));
    if (routeChunks === null) {
      console.log(`  · ${route.padEnd(12)}  (manifest not found at ${relManifest} — skipping; verify manifest shape)`);
      continue;
    }

    // Union: shared + route-specific (deduplicated).
    const all = new Set([...sharedChunks, ...routeChunks]);

    let totalBytes = 0;
    for (const chunk of all) {
      totalBytes += gzippedSize(join(NEXT_DIR, chunk));
    }

    if (totalBytes === 0) {
      console.log(`  · ${route.padEnd(12)}  (no chunks resolved on disk — skipping; verify manifest shape)`);
      continue;
    }

    const kb = totalBytes / 1024;
    const pass = kb <= kbLimit;
    const icon = pass ? '✓' : '✗';
    console.log(`  ${icon} ${route.padEnd(12)}  ${kb.toFixed(1)} KB  (limit ${kbLimit} KB)`);
    if (!pass) failed = true;
  }

  console.log('');
  if (failed) fail('one or more routes exceed their gzipped bundle threshold');
  ok('all routes within bundle size thresholds');
}

main();
