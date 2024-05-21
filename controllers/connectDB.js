const mongoose = require('mongoose')
const {MONGODBURI, MONGODBNAME} = process.env
const {logStd, logSys, logErr} = require('./logger')

const connect = async (debug = false) => {
  try {
    mongoose.set('strictQuery', false)
    const conn = await mongoose.connect(MONGODBURI + MONGODBNAME);
    if (debug) logSys(`MongoDB Connected: ${conn.connection.name}@${conn.connection.host} on port ${conn.connection.port}`)
  } catch (err) {
    logErr(err)
    process.exit(1)
  }
}

const disconnect = async (debug = false) => {
  try {
    mongoose.disconnect()
    if (debug) logSys('MongoDB Disconnected')
  } catch (error) {
    logErr(err)
    process.exit(1)
  }
}

module.exports = {connect, disconnect};