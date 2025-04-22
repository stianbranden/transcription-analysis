const Transcript = require('../../models/GenesysTranscript')
const { createSummariesGenesys } = require('../getSummary')
const { getSpeechToTextAnalytics } = require('./getTranscripts')
const {logErr} = require('../logger.js')

function saveInitial(data, date){
    return new Promise (async (resolve, reject)=>{
        try {
            for ( let i = 0; i < data.length; i++){
                const {conversationId, communicationId} = data[i]
                const doc = await Transcript.findOne({"meta.conversationId": conversationId})
                if (!doc){
                    await Transcript.create({meta: {conversationId, communicationId}, date})
                }
            }
            resolve('ok')
        } catch (error) {
            reject(error)
        }
    })
}

function saveOne({conversationId, communicationId="awaiting", queueId, channel, language}, date){
    return new Promise (async (resolve, reject)=>{
        try {
            const doc = await Transcript.findOne({"meta.conversationId": conversationId})
            if ( doc ) resolve(doc)
            else {
                const doc = await Transcript.create({meta: {conversationId, communicationId, queueId, channel, language}, date})
                resolve(doc)
            }
        } catch (error) {
            reject(error)
        }
    })
}

function appendCall({conversationId, communicationId, status}, platformClient){
    return new Promise( async (resolve, reject)=>{
        try {
            const doc = await Transcript.findOne({"meta.conversationId": conversationId})
            if ( doc ){
                doc.meta.communicationId = communicationId
                if ( status === 'SESSION_ENDED') {
                    try {
                        await createSummariesGenesys(conversationId)
                    } catch (error) {
                        logErr(error)
                    }
                    if (doc.transcript?.length) doc.hasTranscript = true
                    // doc.speechToTextAnalytics = await getSpeechToTextAnalytics(platformClient, conversationId)
                }
                await doc.save()
                resolve('ok')
            }
            else {
                reject({message: 'Cannot find conversation with ID: ' + conversationId})
            }
        } catch (error) {
            reject(error)
        }
    })
}

function runSpeechToTextAnalytics(conversationId, platformClient){
    return new Promise (async (resolve, reject)=>{
        try {
            const doc = await Transcript.findOne({"meta.conversationId": conversationId})
            if ( doc ){
                doc.speechToTextAnalytics = await getSpeechToTextAnalytics(platformClient, conversationId)
                await doc.save()
                resolve('STT updated')
            } else {
                resolve('Could not find doc')
            }
        } catch (error) {
            // logErr(error)
            resolve('Could not find stt')   
        }
    })
}

function appendTranscript(conversationId, transcripts){
    return new Promise( async (resolve, reject)=>{
        try {
            const doc = await Transcript.findOne({"meta.conversationId": conversationId})
            if ( doc ){
                for ( let i = 0; i < transcripts.length; i++){
                    const {channel, dialect, transcript, confidence, words, offsetMs, durationMs} = transcripts[i]
                    doc.transcript.push({
                        text: transcript,
                        channel, 
                        confidence,
                        wordCount: words.length,
                        start: offsetMs,
                        end: offsetMs+durationMs
                    })
                }
                await doc.save()
                resolve('ok')
            }
            else reject({message: 'Cannot find conversation with ID: ' + conversationId})
        } catch (error) {
            reject(error)
        }
    })
}

module.exports = {saveInitial, saveOne, appendCall, appendTranscript, runSpeechToTextAnalytics}