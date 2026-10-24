const mongoose = require('mongoose');
const env = require('./env');
mongoose.set('strictQuery', true);
module.exports = async () => { await mongoose.connect(env.mongoUri); console.log('MongoDB connected'); };
