const Language = require('../../models/Language');

async function getActiveLanguages() {
    try {
        const activeLanguages = await Language.find({ state: 'active' }).lean()
        return activeLanguages;
    } catch (error) {
        // console.error('Error fetching active languages:', error);
        throw error;
    }
}

module.exports = getActiveLanguages;