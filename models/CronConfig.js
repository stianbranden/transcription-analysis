const mongoose = require('mongoose')

const CronSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    hour: {
        type: String,
        required: true,
        default: '*'
    },
    minute: {
        type: String,
        required: true,
        default: '*'
    },
    weekDay: {
        type: String,
        required: true,
        default: '*'
    }
})

module.exports = mongoose.model('cronconfig', CronSchema)