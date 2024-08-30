const Transcript = require('../models/Transcript')
const moment = require('moment')

function cleanUpErrors(date = moment().format('YYYY-MM-DD')){
        //{hasError: true, summary: "TBC", date: "2024-08-06"}
    return new Promise (async (resolve, reject)=>{
        try {
            const {deletedCount} = await Transcript.deleteMany({date, hasError: true, summary: "TBC"})
            resolve({deletedCount})
        } catch (error) {
            reject(error)
        }
    })
    
}

module.exports = {cleanUpErrors}