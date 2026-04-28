#!/usr/bin/env node
require('dotenv').config();
const mongoose = require('mongoose');

const User = require('../models/User');
const ChatSession = require('../models/ChatSession');
const ChatMessage = require('../models/ChatMessage');
const SchemeApplication = require('../models/SchemeApplication');
const Crop = require('../models/Crop');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Translation = require('../models/Translation');

function parseArgs(argv) {
  const args = {
    from: '',
    to: '',
    apply: false,
    archiveDuplicate: false,
    verbose: false
  };

  for (const token of argv) {
    if (token === '--apply') args.apply = true;
    else if (token === '--archive-duplicate') args.archiveDuplicate = true;
    else if (token === '--verbose') args.verbose = true;
    else if (token.startsWith('--from=')) args.from = token.slice('--from='.length);
    else if (token.startsWith('--to=')) args.to = token.slice('--to='.length);
  }

  return args;
}

function asObjectId(id) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new Error(`Invalid ObjectId: ${id || '<empty>'}`);
  }
  return new mongoose.Types.ObjectId(id);
}

async function summarizeImpact(fromId, toId) {
  const [chatSessions, chatMessages, schemeApplications, cropsCreatedBy, cropsUpdatedBy, directMessagesSender, directMessagesRecipient, translations] = await Promise.all([
    ChatSession.countDocuments({ userId: fromId }),
    ChatMessage.countDocuments({ userId: fromId }),
    SchemeApplication.countDocuments({ userId: fromId }),
    Crop.countDocuments({ createdBy: fromId }),
    Crop.countDocuments({ updatedBy: fromId }),
    Message.countDocuments({ sender: fromId }),
    Message.countDocuments({ recipient: fromId }),
    Translation.countDocuments({ translator: fromId })
  ]);

  const conversationCount = await Conversation.countDocuments({ participants: fromId });
  const sameRefCount = await Promise.all([
    ChatSession.countDocuments({ userId: toId }),
    ChatMessage.countDocuments({ userId: toId }),
    SchemeApplication.countDocuments({ userId: toId })
  ]);

  return {
    fromRefs: {
      chatSessions,
      chatMessages,
      schemeApplications,
      cropsCreatedBy,
      cropsUpdatedBy,
      directMessagesSender,
      directMessagesRecipient,
      translations,
      conversations: conversationCount
    },
    toRefs: {
      chatSessions: sameRefCount[0],
      chatMessages: sameRefCount[1],
      schemeApplications: sameRefCount[2]
    }
  };
}

async function migrateConversations(fromId, toId, apply, verbose) {
  const docs = await Conversation.find({ participants: fromId }).select('_id participants unreadCount lastMessage').lean();
  if (!docs.length) return { touched: 0, mergedParticipantConflicts: 0 };

  let touched = 0;
  let mergedParticipantConflicts = 0;

  for (const doc of docs) {
    const participants = Array.isArray(doc.participants) ? doc.participants.map((p) => String(p)) : [];
    const deduped = [...new Set(participants.map((p) => (p === String(fromId) ? String(toId) : p)))];

    if (participants.length !== deduped.length) {
      mergedParticipantConflicts += 1;
    }

    const unreadObj = doc.unreadCount && typeof doc.unreadCount === 'object' ? doc.unreadCount : {};
    const nextUnread = { ...unreadObj };
    const fromKey = String(fromId);
    const toKey = String(toId);
    if (Object.prototype.hasOwnProperty.call(nextUnread, fromKey)) {
      nextUnread[toKey] = (Number(nextUnread[toKey]) || 0) + (Number(nextUnread[fromKey]) || 0);
      delete nextUnread[fromKey];
    }

    const shouldReplaceSender = String(doc?.lastMessage?.sender || '') === String(fromId);
    const update = {
      participants: deduped,
      unreadCount: nextUnread
    };

    if (shouldReplaceSender) {
      update['lastMessage.sender'] = toId;
    }

    if (apply) {
      await Conversation.updateOne({ _id: doc._id }, { $set: update });
    }
    touched += 1;

    if (verbose) {
      console.log(`Conversation ${doc._id}: participants/unread migrated`);
    }
  }

  return { touched, mergedParticipantConflicts };
}

async function archiveDuplicateUser(duplicateUser, canonicalUser, apply) {
  const duplicateIdShort = String(duplicateUser._id).slice(-6);
  const archivedEmail = `${duplicateUser.email}.archived.${duplicateIdShort}`;
  const phoneSeed = String(duplicateUser._id)
    .split('')
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
    .toString()
    .padStart(9, '0')
    .slice(0, 9);
  const archivedPhone = `9${phoneSeed}`;
  const archivedUsername = `${duplicateUser.username}_archived_${duplicateIdShort}`;

  const update = {
    email: archivedEmail.toLowerCase(),
    phone: archivedPhone,
    username: archivedUsername.toLowerCase(),
    name: duplicateUser.name ? `${duplicateUser.name} (archived duplicate)` : 'Archived Duplicate User',
    verificationToken: undefined,
    verificationExpires: undefined,
    passwordResetToken: undefined,
    passwordResetExpires: undefined
  };

  if (apply) {
    await User.updateOne({ _id: duplicateUser._id }, { $set: update, $unset: { devices: '' } });
  }

  return {
    fromUser: duplicateUser.email,
    toUser: canonicalUser.email,
    archivedEmail: update.email,
    archivedPhone: update.phone,
    archivedUsername: update.username
  };
}

async function run() {
  const { from, to, apply, archiveDuplicate, verbose } = parseArgs(process.argv.slice(2));
  if (!from || !to) {
    throw new Error('Usage: node scripts/merge-duplicate-users.js --from=<duplicateUserId> --to=<primaryUserId> [--apply] [--archive-duplicate] [--verbose]');
  }
  if (from === to) {
    throw new Error('--from and --to must be different users');
  }

  const fromId = asObjectId(from);
  const toId = asObjectId(to);
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/agrismart';
  await mongoose.connect(mongoUri);

  const [duplicateUser, primaryUser] = await Promise.all([
    User.findById(fromId).select('_id name username email phone createdAt').lean(),
    User.findById(toId).select('_id name username email phone createdAt').lean()
  ]);

  if (!duplicateUser) throw new Error(`Duplicate user not found: ${from}`);
  if (!primaryUser) throw new Error(`Primary user not found: ${to}`);

  const impact = await summarizeImpact(fromId, toId);
  console.log('--- Duplicate user merge plan ---');
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY-RUN'}`);
  console.log(`From (duplicate): ${duplicateUser._id} | ${duplicateUser.email} | ${duplicateUser.phone}`);
  console.log(`To (primary):     ${primaryUser._id} | ${primaryUser.email} | ${primaryUser.phone}`);
  console.log('Impacted references:', JSON.stringify(impact.fromRefs, null, 2));

  const writes = [
    {
      label: 'ChatSession.userId',
      model: ChatSession,
      query: { userId: fromId },
      update: { $set: { userId: toId } }
    },
    {
      label: 'ChatMessage.userId',
      model: ChatMessage,
      query: { userId: fromId },
      update: { $set: { userId: toId } }
    },
    {
      label: 'SchemeApplication.userId',
      model: SchemeApplication,
      query: { userId: fromId },
      update: { $set: { userId: toId } }
    },
    {
      label: 'Crop.createdBy',
      model: Crop,
      query: { createdBy: fromId },
      update: { $set: { createdBy: toId } }
    },
    {
      label: 'Crop.updatedBy',
      model: Crop,
      query: { updatedBy: fromId },
      update: { $set: { updatedBy: toId } }
    },
    {
      label: 'Message.sender',
      model: Message,
      query: { sender: fromId },
      update: { $set: { sender: toId } }
    },
    {
      label: 'Message.recipient',
      model: Message,
      query: { recipient: fromId },
      update: { $set: { recipient: toId } }
    },
    {
      label: 'Translation.translator',
      model: Translation,
      query: { translator: fromId },
      update: { $set: { translator: toId } }
    }
  ];

  const results = [];
  for (const write of writes) {
    if (!apply) {
      const potentialMatches = await write.model.countDocuments(write.query);
      results.push({ label: write.label, potentialMatches });
      continue;
    }

    const result = await write.model.updateMany(write.query, write.update);
    results.push({ label: write.label, modifiedCount: result.modifiedCount || 0 });
  }

  const conversationResult = await migrateConversations(fromId, toId, apply, verbose);

  let archiveSummary = null;
  if (archiveDuplicate) {
    archiveSummary = await archiveDuplicateUser(duplicateUser, primaryUser, apply);
  }

  if (apply) {
    console.log('\n--- Apply summary ---');
    results.forEach((r) => {
      console.log(`${r.label}: modified=${r.modifiedCount}`);
    });
    console.log(`Conversation docs touched: ${conversationResult.touched}`);
    console.log(`Conversation participant conflicts merged: ${conversationResult.mergedParticipantConflicts}`);
    if (archiveSummary) {
      console.log('Archived duplicate account metadata:', archiveSummary);
    } else {
      console.log('Duplicate user account left unchanged (no archive requested).');
    }
  } else {
    console.log('\n--- Dry-run impact by collection ---');
    results.forEach((r) => {
      console.log(`${r.label}: potentialMatches=${r.potentialMatches}`);
    });
    console.log(`Conversation docs touched: ${conversationResult.touched}`);
    console.log(`Conversation participant conflicts to merge: ${conversationResult.mergedParticipantConflicts}`);
    console.log('\nDry-run complete. Re-run with --apply to execute migration.');
    console.log('Tip: add --archive-duplicate to archive duplicate account after reference migration.');
  }

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error('Merge script failed:', error.message);
  try {
    await mongoose.disconnect();
  } catch (_) {
    // ignore
  }
  process.exit(1);
});
