const mongoose = require('mongoose');

const LanguageSchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    state: {
        type: String, 
        required: true
    }
});

module.exports = mongoose.model('Language', LanguageSchema);

