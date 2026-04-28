#!/usr/bin/env node
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

function normalizeIndianPhone(phone) {
  if (!phone) return '';
  const cleaned = String(phone).replace(/[\s+\-]/g, '');
  if (/^91[6-9]\d{9}$/.test(cleaned)) return cleaned.slice(2);
  return cleaned;
}

function parseArgs(argv) {
  return {
    apply: argv.includes('--apply'),
    verbose: argv.includes('--verbose')
  };
}

async function run() {
  const { apply, verbose } = parseArgs(process.argv.slice(2));
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/agrismart';

  await mongoose.connect(mongoUri);
  const users = await User.find({}).select('_id email username phone createdAt').lean();

  const byCanonical = new Map();
  const toUpdate = [];
  const invalid = [];

  for (const user of users) {
    const originalPhone = String(user.phone || '');
    const canonicalPhone = normalizeIndianPhone(originalPhone);

    if (!/^[6-9]\d{9}$/.test(canonicalPhone)) {
      invalid.push({
        id: String(user._id),
        username: user.username,
        email: user.email,
        phone: originalPhone
      });
      continue;
    }

    if (!byCanonical.has(canonicalPhone)) {
      byCanonical.set(canonicalPhone, []);
    }
    byCanonical.get(canonicalPhone).push({
      id: String(user._id),
      username: user.username,
      email: user.email,
      phone: originalPhone,
      createdAt: user.createdAt
    });

    if (canonicalPhone !== originalPhone) {
      toUpdate.push({
        id: String(user._id),
        username: user.username,
        email: user.email,
        from: originalPhone,
        to: canonicalPhone
      });
    }
  }

  const collisions = [];
  for (const [canonicalPhone, group] of byCanonical.entries()) {
    if (group.length > 1) {
      collisions.push({ canonicalPhone, users: group });
    }
  }

  console.log('--- Phone normalization report ---');
  console.log(`Total users: ${users.length}`);
  console.log(`Needs normalization: ${toUpdate.length}`);
  console.log(`Canonical collisions: ${collisions.length}`);
  console.log(`Invalid phone format: ${invalid.length}`);
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY-RUN'}`);

  if (verbose) {
    if (toUpdate.length) {
      console.log('\nUsers to normalize:');
      toUpdate.forEach((item) => {
        console.log(`- ${item.id} (${item.username}): ${item.from} -> ${item.to}`);
      });
    }

    if (collisions.length) {
      console.log('\nCanonical collisions:');
      collisions.forEach((collision) => {
        console.log(`- ${collision.canonicalPhone}`);
        collision.users.forEach((u) => {
          console.log(`  - ${u.id} (${u.username}, ${u.email}) phone=${u.phone}`);
        });
      });
    }

    if (invalid.length) {
      console.log('\nInvalid phone format records:');
      invalid.forEach((u) => {
        console.log(`- ${u.id} (${u.username}, ${u.email}) phone=${u.phone}`);
      });
    }
  }

  if (apply) {
    let normalizedCount = 0;
    let skippedDueCollision = 0;

    for (const update of toUpdate) {
      const group = byCanonical.get(update.to) || [];
      if (group.length > 1) {
        skippedDueCollision += 1;
        continue;
      }

      // Use document save to reliably apply schema setters/validators.
      const doc = await User.findById(update.id);
      if (!doc) {
        continue;
      }
      if (String(doc.phone || '') === update.to) {
        continue;
      }

      doc.phone = update.to;
      await doc.save();
      normalizedCount += 1;
    }

    console.log('\n--- Apply summary ---');
    console.log(`Normalized users: ${normalizedCount}`);
    console.log(`Skipped due to collisions: ${skippedDueCollision}`);
    console.log('Collision groups require manual merge/de-duplication.');
  } else {
    console.log('\nDry-run complete. Re-run with --apply to normalize non-colliding records.');
  }

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error('Normalization script failed:', error.message);
  try {
    await mongoose.disconnect();
  } catch (_) {
    // ignore
  }
  process.exit(1);
});
