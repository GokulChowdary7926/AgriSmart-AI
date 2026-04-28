
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

const EXCLUDE_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.git',
  '.idea',
  '.vscode'
]);

const ALLOWED_EXTENSIONS = new Set([
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.json'
]);

function shouldProcessFile(filePath) {
  const ext = path.extname(filePath);
  if (!ALLOWED_EXTENSIONS.has(ext)) return false;
  return true;
}

function walk(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (EXCLUDE_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (entry.isFile()) {
      if (shouldProcessFile(fullPath)) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

function cleanFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');
  const lines = original.split(/\r?\n/);

  const cleanedLines = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) return true;
    if (trimmed.startsWith('//')) return false;
    if (trimmed.startsWith('#')) return false;
    return true;
  });

  const cleaned = cleanedLines.join('\n');
  if (cleaned !== original) {
    fs.writeFileSync(filePath, cleaned, 'utf8');
  }
}

function main() {
  const targets = [
    path.join(ROOT, 'backend'),
    path.join(ROOT, 'frontend')
  ];

  targets.forEach((targetDir) => {
    if (!fs.existsSync(targetDir)) return;
    const files = walk(targetDir);
    files.forEach(cleanFile);
  });
}

main();

