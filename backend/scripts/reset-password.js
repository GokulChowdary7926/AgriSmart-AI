const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');

async function resetPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/agri-smart-ai');
    console.log('Connected to MongoDB');

    const email = process.argv[2];
    const newPassword = process.argv[3];

    if (!email || !newPassword) {
      console.log('Usage: node reset-password.js <email> <new-password>');
      console.log('Example: node reset-password.js user@example.com mynewpassword');
      process.exit(1);
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.log(`User with email ${email} not found`);
      process.exit(1);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
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

