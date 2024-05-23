const mongoose = require('mongoose')

const MetaSchema = new mongoose.Schema({
    language: {
        required: true,
        default: "Swedish",
        type: String
    },
    recordingId: {
        type: Number,
        required: true
    },
    contactId: {
        type: String,
        required: true
    }
}, {_id: false})

const TextSchema = new mongoose.Schema({
    text: {
        type: String,
        reuired: true
    },
    channel: {
        type: String,
        required: true
    }
}, {_id: false})

const ContactReasonSchema = new mongoose.Schema({
    level1: {
        type: String,
        reuired: true
    },
    level2: {
        type: String,
        required: true
    },
    level3: {
        type: String,
        required: true
    }
}, {_id: false})

const TranscriptSchema = new mongoose.Schema({
    meta: {type: MetaSchema, required: true},
    transcript: [TextSchema],
    summary: {
        type: String,
        default: 'TBC',
        required: true
    },
    contactReason: ContactReasonSchema,
    hasSummary: {
        type: Boolean,
        required: true,
        default: false
    }
}, {timestamps: true})

module.exports = mongoose.model('Transcript', TranscriptSchema)