const mongoose = require('mongoose')

const MetaSchema = new mongoose.Schema({
    language: {
        required: true,
        default: "Unknown",
        type: String
    },
    communicationId: {
        type: String,
        required: true
    },
    conversationId: {
        type: String,
        required: true
    },
    callDuration: {
        type: Number
    },
    channel: {
        type: String,
        default: 'Phone',
        required: true
    },
    queueId: {
        type: String
    }
}, {_id: false})

const TextSchema = new mongoose.Schema({
    text: {
        type: String,
        reuired: true
    },
    channel: {
        type: String,
        required: true, 
        default: 'unknown'
    },
    start: {
        type: Number
    },
    end: {
        type: Number
    },
    stability: Number,
    confidence: Number,
    hits: [String],
    wordCount: {
        default: 0,
        type: Number
    }
}, {_id: false})

const ContactReasonSchema = new mongoose.Schema({
    service_journey: {
        fullname: String,
        abbreviation: String
    },
    level1: {
        type: String,
        default: 'N/A',
        reuired: true
    },
    level2: {
        type: String,
        default: 'N/A',
        required: true
    },
    level3: {
        type: String,
        required: true,
        default: 'N/A'
    }, confidence: {
        type: Number
    }
}, {_id: false})


const SpeechTextAnalyticsSchema = new mongoose.Schema({
    sentimentScore: Number,
    sentimentTrend: Number,
    sentimentTrendClass: String,
    empathyScores: [ { score: Number, userId: String} ],
    participantMetrics: {
        agentDurationPercentage: Number,
        customerDurationPercentage: Number,
        silenceDurationPercentage: Number,
        ivrDurationPercentage: Number,
        acdDurationPercentage: Number,
        otherDurationPercentage: Number,
        overtalkDurationPercentage: Number,
        overtalkCount: Number
    }
}, {_id:false})

const TranscriptSchema = new mongoose.Schema({
    meta: {type: MetaSchema, required: true},
    date: {type: String},
    transcript: [TextSchema],
    chat: {
        type: String
    },
    summary: {
        type: String,
        default: 'TBC',
        required: true
    },
    sentiment: {
        type: String,
        default: "Unknown"
    },
    contactReason: ContactReasonSchema,
    hasSummary: {
        type: Boolean,
        required: true,
        default: false
    },
    hasAnalysis: {
        type: Boolean,
        default: false
    },
    hasTranscript: {
        type: Boolean,
        default: false
    },
    hasError: {
        type: Boolean,
        default: false
    },
    hasMetadataPushed: {
        type: Boolean,
        required: true,
        default: false
    },
    errorMessage: {
        type: String
    },
    source: {
        type: String,
        required: true,
        default: 'Genesys'
    },
    speechToTextAnalytics: SpeechTextAnalyticsSchema
}, {timestamps: true})

TranscriptSchema.index({createdAt: 1},{expireAfterSeconds: 60*60*24*30});
module.exports = mongoose.model('GenesysTranscript', TranscriptSchema)