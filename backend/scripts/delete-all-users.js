

require('dotenv').config();
const mongoose = require('mongoose');
const redis = require('redis');

const User = require('../models/User');
const ChatSession = require('../models/ChatSession');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const ChatMessage = require('../models/ChatMessage');
const SchemeApplication = require('../models/SchemeApplication');

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agrismart';

let redisClient = null;

async function connectDatabases() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected');

    if (process.env.REDIS_URL) {
      try {
        redisClient = redis.createClient({
          url: process.env.REDIS_URL,
          socket: {
            connectTimeout: 2000,
            reconnectStrategy: false
          }
        });
        await redisClient.connect();
        console.log('✅ Redis connected');
      } catch (err) {
        console.log('⚠️  Redis not available, continuing without it');
      }
    }
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    process.exit(1);
  }
}

async function clearRedisSessions() {
  if (!redisClient) {
    console.log('⏭️  Skipping Redis cleanup (not connected)');
    return;
  }

  try {
    console.log('🧹 Clearing Redis sessions and tokens...');
    
    const keys = await redisClient.keys('*');
    const userRelatedKeys = keys.filter(key => 
      key.includes('refresh_token') || 
      key.includes('otp:') || 
      key.includes('session:') ||
      key.includes('user:')
    );

    if (userRelatedKeys.length > 0) {
      await redisClient.del(userRelatedKeys);
      console.log(`✅ Deleted ${userRelatedKeys.length} Redis keys`);
    } else {
      console.log('ℹ️  No Redis keys to delete');
    }
  } catch (error) {
    console.error('⚠️  Error clearing Redis:', error.message);
  }
}

async function deleteAllUsers() {
  try {
    console.log('\n🗑️  Starting user data deletion...\n');

    const userCount = await User.countDocuments();
    console.log(`📊 Found ${userCount} users in database`);

    if (userCount === 0) {
      console.log('ℹ️  No users to delete');
      return;
    }

    console.log('\n1️⃣  Deleting related data...');

    const chatSessionCount = await ChatSession.countDocuments();
    if (chatSessionCount > 0) {
      await ChatSession.deleteMany({});
      console.log(`   ✅ Deleted ${chatSessionCount} chat sessions`);
    }

    try {
      const conversationCount = await Conversation.countDocuments();
      if (conversationCount > 0) {
        await Conversation.deleteMany({});
        console.log(`   ✅ Deleted ${conversationCount} conversations`);
      }
    } catch (err) {
      console.log('   ⏭️  Conversations model not available');
    }

    try {
      const messageCount = await Message.countDocuments();
      if (messageCount > 0) {
        await Message.deleteMany({});
        console.log(`   ✅ Deleted ${messageCount} messages`);
      }
    } catch (err) {
      console.log('   ⏭️  Messages model not available');
    }

    try {
      const chatMessageCount = await ChatMessage.countDocuments();
      if (chatMessageCount > 0) {
        await ChatMessage.deleteMany({});
        console.log(`   ✅ Deleted ${chatMessageCount} chat messages`);
      }
    } catch (err) {
      console.log('   ⏭️  ChatMessages model not available');
    }

    try {
      const schemeAppCount = await SchemeApplication.countDocuments();
      if (schemeAppCount > 0) {
        await SchemeApplication.deleteMany({});
        console.log(`   ✅ Deleted ${schemeAppCount} scheme applications`);
      }
    } catch (err) {
      console.log('   ⏭️  SchemeApplication model not available');
    }

    console.log('\n2️⃣  Deleting all users...');
    const deleteResult = await User.deleteMany({});
    console.log(`   ✅ Deleted ${deleteResult.deletedCount} users`);

    console.log('\n3️⃣  Clearing Redis sessions...');
    await clearRedisSessions();

    console.log('\n✅ All user data and login details deleted successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   - Users deleted: ${deleteResult.deletedCount}`);
    console.log(`   - Chat sessions deleted: ${chatSessionCount}`);
    console.log(`   - Redis keys cleared: Yes`);

  } catch (error) {
    console.error('❌ Error deleting users:', error);
    throw error;
  }
}

async function main() {
  try {
    await connectDatabases();
    await deleteAllUsers();
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('\n🔌 MongoDB connection closed');
    }
    if (redisClient && redisClient.isOpen) {
      await redisClient.quit();
      console.log('🔌 Redis connection closed');
    }
    process.exit(0);
  }
}

if (require.main === module) {
  console.log('⚠️  WARNING: This will delete ALL users and login data!');
  console.log('⚠️  This action cannot be undone!\n');
  
  main();
}

module.exports = { deleteAllUsers, clearRedisSessions };













