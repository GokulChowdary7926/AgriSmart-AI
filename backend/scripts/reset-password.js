const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');

async function resetPassword() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/agri-smart-ai');
    console.log('Connected to MongoDB');

    // Get email and new password from command line
    const email = process.argv[2];
    const newPassword = process.argv[3];

    if (!email || !newPassword) {
      console.log('Usage: node reset-password.js <email> <new-password>');
      console.log('Example: node reset-password.js user@example.com mynewpassword');
      process.exit(1);
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.log(`User with email ${email} not found`);
      process.exit(1);
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update directly to bypass pre-save hook (which would double-hash)
    await User.updateOne(
      { _id: user._id },
      { $set: { password: hashedPassword } }
    );

    console.log(`✅ Password reset successfully for ${email}`);
    console.log(`New password: ${newPassword}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

resetPassword();

