const {Redis} = require('@upstash/redis')
const dotenv = require('dotenv')
dotenv.config()

exports.redis = Redis.fromEnv({automaticDeserialization: false})