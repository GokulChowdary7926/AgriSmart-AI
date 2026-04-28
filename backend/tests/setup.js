process.env.NODE_ENV = 'test';
process.env.TF_ENABLED = 'false';
process.env.FEATURE_EXTERNAL_APIS = 'false';
process.env.REDIS_URL = '';
process.env.MQTT_BROKER = '';

jest.setTimeout(15000);

afterAll(async () => {
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection && mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  } catch (_) {
    // no-op
  }
});
