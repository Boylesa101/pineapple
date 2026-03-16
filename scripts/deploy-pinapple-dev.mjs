import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const PROJECT_NAME = 'pinapple-dev';
const BUCKET_NAME = 'pinapple-dev-downloads';
const R2_PUBLIC_BASE = 'https://pub-e921959b6412492f9b7d39739cf8f48c.r2.dev';
const CLOUDLFARE_PAGE_DIR = path.join(repoRoot, 'cloudflare', 'pinapple-dev');
const INDEX_PATH = path.join(CLOUDLFARE_PAGE_DIR, 'index.html');
const ASSETS_VERSION_PATH = path.join(CLOUDLFARE_PAGE_DIR, '.assets-version');
const PACKAGE_JSON_PATH = path.join(repoRoot, 'package.json');

function parseArgs(argv) {
  const result = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith('--')) {
      continue;
    }

    const [key, inlineValue] = token.split('=', 2);
    const value = inlineValue ?? argv[index + 1];
    const normalizedKey = key.replace(/^--/, '');

    if (inlineValue === undefined) {
      index += 1;
    }

    result[normalizedKey] = value;
  }

  return result;
}

async function getNewestApk(candidateDirectory) {
  if (!existsSync(candidateDirectory)) {
    return null;
  }

  const entries = await fs.readdir(candidateDirectory, { withFileTypes: true });
  const apkEntries = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.apk'))
      .map(async (entry) => {
        const absolutePath = path.join(candidateDirectory, entry.name);
        const stats = await fs.stat(absolutePath);

        return {
          absolutePath,
          mtimeMs: stats.mtimeMs,
        };
      }),
  );

  apkEntries.sort((left, right) => right.mtimeMs - left.mtimeMs);

  return apkEntries[0]?.absolutePath ?? null;
}

async function resolveApkPath(argApkPath) {
  if (argApkPath) {
    const resolved = path.resolve(repoRoot, argApkPath);

    if (!existsSync(resolved)) {
      throw new Error(`APK not found at ${resolved}`);
    }

    return resolved;
  }

  const preferredPaths = [
    path.join(repoRoot, 'new apk'),
    path.join(repoRoot, 'build', 'apk'),
  ];

  for (const preferredPath of preferredPaths) {
    const newestApk = await getNewestApk(preferredPath);

    if (newestApk) {
      return newestApk;
    }
  }

  throw new Error(
    'No APK found. Pass --apk <path> or place a build in "new apk/" or "build/apk/".',
  );
}

async function readPackageVersion() {
  const raw = await fs.readFile(PACKAGE_JSON_PATH, 'utf8');
  const parsed = JSON.parse(raw);

  return parsed.version;
}

async function computeSha256(filePath) {
  const buffer = await fs.readFile(filePath);
  return createHash('sha256').update(buffer).digest('hex');
}

function formatSize(bytes) {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

function updateIndexHtml(html, metadata) {
  return html
    .replace(
      /(<span class="label">Version<\/span>\s*<span class="value">)(.*?)(<\/span>)/,
      `$1${metadata.version}$3`,
    )
    .replace(
      /(<span class="label">Build<\/span>\s*<span class="value">)(.*?)(<\/span>)/,
      `$1${metadata.buildLabel}$3`,
    )
    .replace(
      /(<span class="label">APK<\/span>\s*<span class="value">)(.*?)(<\/span>)/,
      `$1${metadata.fileName}$3`,
    )
    .replace(
      /(<span class="label">Size<\/span>\s*<span class="value">)(.*?)(<\/span>)/,
      `$1${metadata.sizeLabel}$3`,
    )
    .replace(
      /(<span class="label">SHA-256<\/span>\s*<span class="value"><code>)(.*?)(<\/code><\/span>)/,
      `$1${metadata.sha256}$3`,
    )
    .replace(
      /(<a class="download" href=")(.*?)(">Download latest APK<\/a>)/,
      `$1${metadata.latestUrl}$3`,
    );
}

function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: false,
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(' ')} failed with exit code ${code}`));
    });

    child.on('error', reject);
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apkPath = await resolveApkPath(args.apk);
  const stats = await fs.stat(apkPath);
  const version = args.version ?? (await readPackageVersion());
  const buildLabel = args['build-label'] ?? 'Test build';
  const fileName = path.basename(apkPath);
  const sha256 = await computeSha256(apkPath);
  const sizeLabel = formatSize(stats.size);
  const versionedObjectKey = `downloads/${fileName}`;
  const latestObjectKey = 'downloads/pineapple-latest.apk';
  const versionedUrl = `${R2_PUBLIC_BASE}/${versionedObjectKey}`;
  const latestUrl = `${R2_PUBLIC_BASE}/${latestObjectKey}`;

  console.log(`Using APK: ${apkPath}`);
  console.log(`Version: ${version}`);
  console.log(`Build label: ${buildLabel}`);

  await runCommand(
    'npx',
    [
      '--yes',
      'wrangler@4',
      'r2',
      'object',
      'put',
      `${BUCKET_NAME}/${versionedObjectKey}`,
      '--file',
      apkPath,
      '--remote',
      '--content-type',
      'application/vnd.android.package-archive',
      '--content-disposition',
      `attachment; filename="${fileName}"`,
    ],
    repoRoot,
  );

  await runCommand(
    'npx',
    [
      '--yes',
      'wrangler@4',
      'r2',
      'object',
      'put',
      `${BUCKET_NAME}/${latestObjectKey}`,
      '--file',
      apkPath,
      '--remote',
      '--content-type',
      'application/vnd.android.package-archive',
      '--content-disposition',
      `attachment; filename="${fileName}"`,
    ],
    repoRoot,
  );

  const currentHtml = await fs.readFile(INDEX_PATH, 'utf8');
  const nextHtml = updateIndexHtml(currentHtml, {
    version,
    buildLabel,
    fileName,
    sizeLabel,
    sha256,
    latestUrl,
  });

  await fs.writeFile(INDEX_PATH, nextHtml);
  await fs.writeFile(ASSETS_VERSION_PATH, new Date().toISOString().slice(0, 10), 'utf8');

  await runCommand(
    'npx',
    ['--yes', 'wrangler@4', 'pages', 'deploy', CLOUDLFARE_PAGE_DIR, '--project-name', PROJECT_NAME],
    repoRoot,
  );

  console.log('');
  console.log(`Page URL: https://${PROJECT_NAME}.pages.dev`);
  console.log(`Direct APK URL: ${latestUrl}`);
  console.log(`Versioned APK URL: ${versionedUrl}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
