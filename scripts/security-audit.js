#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

const secretPatterns = [
  { name: 'OpenAI key', regex: /\bsk-[A-Za-z0-9_-]{20,}\b/g },
  { name: 'Perplexity key', regex: /\bpplx-[A-Za-z0-9_-]{20,}\b/g },
  { name: 'Google API key', regex: /\bAIza[0-9A-Za-z_-]{20,}\b/g },
  { name: 'Twilio SID', regex: /\bAC[a-fA-F0-9]{32}\b/g },
  { name: 'Generic API token assignment', regex: /(API[_-]?KEY|TOKEN|SECRET)\s*[:=]\s*["'][A-Za-z0-9_\-]{16,}["']/gi }
];

const excludedFiles = new Set([
  '.env.example',
  'backend/.env.example',
  'frontend/.env.example'
]);

const excludedDirs = ['node_modules/', 'coverage/', '.git/', 'dist/', 'build/'];

function isLikelyTextFile(filePath) {
  const binaryExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.pdf', '.zip', '.gz', '.tar', '.woff', '.woff2'];
  return !binaryExts.includes(path.extname(filePath).toLowerCase());
}

function shouldSkip(filePath) {
  if (excludedFiles.has(filePath)) return true;
  return excludedDirs.some((dir) => filePath.startsWith(dir));
}

function getTrackedFiles() {
  const output = execSync('git ls-files', { cwd: repoRoot, encoding: 'utf8' });
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((filePath) => !shouldSkip(filePath) && isLikelyTextFile(filePath));
}

function audit() {
  const findings = [];
  const files = getTrackedFiles();

  for (const relPath of files) {
    const absPath = path.join(repoRoot, relPath);
    let content = '';
    try {
      content = fs.readFileSync(absPath, 'utf8');
    } catch (_) {
      continue;
    }

    for (const pattern of secretPatterns) {
      const matches = content.match(pattern.regex);
      if (matches && matches.length > 0) {
        findings.push({
          file: relPath,
          type: pattern.name,
          count: matches.length
        });
      }
    }
  }

  if (findings.length === 0) {
    console.log('Security audit passed: no hardcoded secret patterns found.');
    process.exit(0);
  }

  console.error('Security audit failed: potential secrets detected.');
  for (const finding of findings) {
    console.error(`- ${finding.file}: ${finding.type} (${finding.count})`);
  }
  process.exit(1);
}

audit();
