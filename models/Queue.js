const mongoose = require('mongoose');

const QueueSchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true
    },
    name: String,
    program: {
        type: String,
        default: 'TBD',
        required: true
    },
    mainProgram: {
        type: String,
        default: 'TBD',
        required: true
    },
    country: {
        type: String,
        default: 'TBD',
        required: true
    }
});

module.exports = mongoose.model('Queue', QueueSchema);