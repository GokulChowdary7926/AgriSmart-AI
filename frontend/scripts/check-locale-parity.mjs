import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const enPath = path.join(root, 'public', 'locales', 'en', 'common.json');
const taPath = path.join(root, 'public', 'locales', 'ta', 'common.json');

const flatten = (obj, prefix = '', out = {}) => {
  Object.entries(obj || {}).forEach(([key, value]) => {
    const full = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flatten(value, full, out);
    } else {
      out[full] = value;
    }
  });
  return out;
};

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

const en = flatten(readJson(enPath));
const ta = flatten(readJson(taPath));

const enKeys = new Set(Object.keys(en));
const taKeys = new Set(Object.keys(ta));

const missingInTa = [...enKeys].filter((k) => !taKeys.has(k));
const extraInTa = [...taKeys].filter((k) => !enKeys.has(k));
const emptyInTa = [...taKeys].filter((k) => {
  const v = ta[k];
  return typeof v === 'string' && v.trim() === '';
});

if (missingInTa.length || extraInTa.length || emptyInTa.length) {
  console.error('Locale parity check failed.');
  if (missingInTa.length) {
    console.error(`Missing in ta (${missingInTa.length}):`);
    missingInTa.slice(0, 50).forEach((k) => console.error(`  - ${k}`));
  }
  if (extraInTa.length) {
    console.error(`Extra in ta (${extraInTa.length}):`);
    extraInTa.slice(0, 50).forEach((k) => console.error(`  - ${k}`));
  }
  if (emptyInTa.length) {
    console.error(`Empty translations in ta (${emptyInTa.length}):`);
    emptyInTa.slice(0, 50).forEach((k) => console.error(`  - ${k}`));
  }
  process.exit(1);
}

console.log(`Locale parity passed: ${enKeys.size} keys matched between en and ta.`);
