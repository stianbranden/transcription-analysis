const mongoose = require('mongoose')

const UseSchema = new mongoose.Schema({
    promptTokens: Number,
    completionTokens: Number,
    totalTokens: Number
}, {_id: false})

const UsageSchema = new mongoose.Schema({
    date: {
        type: String
    },
    model: {
        type: String
    },
    object: {
        type: String
    },
    usage: {type: UseSchema, required: true},
    executions: {
        type: Number,
        default: 1
    }
}, {timestamps: true})

module.exports = mongoose.model('OpenAIUse', UsageSchema)