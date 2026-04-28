const fs = require('fs');
const path = require('path');

const servicesDir = path.resolve(__dirname, '../services');

function main() {
  const files = fs.readdirSync(servicesDir).filter((file) => file.endsWith('.js'));
  const violations = [];

  for (const file of files) {
    const fullPath = path.join(servicesDir, file);
    const content = fs.readFileSync(fullPath, 'utf8');
    const firstLine = content.split('\n')[0].trim();
    const expected = `module.exports = require('./${path.basename(file, '.js')}');`;

    if (firstLine === expected) {
      violations.push({
        file,
        issue: 'self-require detected on first line'
      });
    }
  }

  if (violations.length > 0) {
    console.error('Service self-require check failed.\n');
    for (const violation of violations) {
      console.error(`- ${violation.file}: ${violation.issue}`);
    }
    process.exit(1);
  }

  console.log(`Service self-require check passed (${files.length} files scanned).`);
}

main();
