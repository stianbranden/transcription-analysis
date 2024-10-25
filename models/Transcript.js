const mongoose = require('mongoose')

const MetaSchema = new mongoose.Schema({
    language: {
        required: true,
        default: "Unknown",
        type: String
    },
    recordingId: {
        type: Number,
        required: true
    },
    contactId: {
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
    },
    start: {
        type: Number
    },
    end: {
        type: Number
    },
    hits: [String]
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

const SilenceEventSchema = new mongoose.Schema({
    start: Number,
    startTime: String,
    end: Number,
    endTime: String,
    length: Number
}, {_id: false})

const EventSchema = new mongoose.Schema({
    silenceEvents: [SilenceEventSchema],
    totalSilence: {
        type: Number,
        default: 0
    },
    numOfSilenceEvents: {
        type: Number
    },
    overtalkEvents: [SilenceEventSchema],
    totalOvertalk: {
        type: Number,
        default: 0
    },
    numOfOvertalkEvents: {
        type: Number
    },
    lineCount: {
        customer: {
            type: Number
        },
        agent: {
            type: Number
        }
    },
    wordCount: {
        customer: {
            type: Number
        },
        agent: {
            type: Number
        }
    },
    talkLength: {
        customer: {
            type: Number
        },
        agent: {
            type: Number
        }
    }
}, {_id: false})

const EnergySchema = new mongoose.Schema({
    numChannels: {
        type: Number,
        default: 2
    },
    duration: {
        type: Number,
        required: true,
        default: 0
    },
    minmax: {
        type: Number,
        required: true,
        default: 0
    },
    channel_0: [Number],
    channel_1: [Number],
    channel_0_length: {
        type: Number
    },
    channel_1_length: {
        type: Number
    }
}, {_id: false})

const BGNoiseSchema = new mongoose.Schema({
    avg: Number,
    relative: Number,
    avg2: Number,
    relative2: Number
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
    hasError: {
        type: Boolean,
        default: false
    },
    errorMessage: {
        type: String
    },
    events: EventSchema,
    mediaEnergy: EnergySchema,
    backgroundNoise: BGNoiseSchema
}, {timestamps: true})

TranscriptSchema.index({createdAt: 1},{expireAfterSeconds: 60*60*24*30});
module.exports = mongoose.model('Transcript', TranscriptSchema)