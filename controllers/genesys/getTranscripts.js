const Transcript = require('../../models/GenesysTranscript')
const axios = require('axios')


function getTranscript(platformClient, doc){
    return new Promise ( async (resolve, reject)=>{
        try {
            const {meta} = doc
            const {communicationId, conversationId} = meta
            const apiInstance = new platformClient.SpeechTextAnalyticsApi();
            const sttdata = await getSpeechToTextAnalytics(platformClient, conversationId)
            doc.speechToTextAnalytics = sttdata
            const {url} = await apiInstance.getSpeechandtextanalyticsConversationCommunicationTranscripturl(conversationId, communicationId)
            const {data} = await axios(url)
            const {transcripts, participants, mediaType, duration} = data
            doc.meta.channel = mediaType
            doc.meta.callDuration = duration?.milliseconds || 0
            const {phrases, language, analytics} = transcripts.filter(a=>a.features.includes('VOICE_TRANSCRIPTION'))[0]
            doc.meta.language = language
            doc.transcript = []
            const {queueId = 'n/a'} = participants.filter(a=>a.participantPurpose==='acd')[0] || {}
            const agents = participants.filter(a=>a.participantPurpose==='agent')
            const ps = phrases.filter(a=>{
                let returnIt = false
                agents.forEach(ag=>{
                    if ( a.startTimeMs >= ag.startTimeMs && a.startTimeMs <= ag.endTimeMs ) returnIt = true
                })
                return returnIt
            })
                .sort(indexSort)
            if (ps.length>0){
                for ( let i = 0; i < ps.length; i++){
                    doc.transcript.push(parseText(ps[i]))
                }
                doc.hasTranscript = true
            }
            doc.meta.queueId = queueId
            await doc.save()
            resolve(sttdata)
        } catch (error) {
            reject(error)
        }
    })
}

function getSpeechToTextAnalytics(platformClient, conversationId){
    return new Promise( async (resolve, reject)=>{
        try {
            const apiInstance = new platformClient.SpeechTextAnalyticsApi();
            const sttdata = await apiInstance.getSpeechandtextanalyticsConversation(conversationId)
            resolve(sttdata)
        } catch (error) {
            reject(error)
        }
    })
}

function getTranscripts(platformClient){
    return new Promise(async (resolve, reject) => {
        try {
            const docs = await Transcript.find({source: 'Genesys', hasTranscript: 'false', $or: [{"meta.channel": 'voice'}, {"meta.channel": 'Phone'}], "meta.communicationId": {$ne: "awaiting"}})
            console.log(docs.length);
            
            for ( let i = 0; i < docs.length; i++) {
                console.log(docs[i].meta.conversationId);
                
                await getTranscript(platformClient, docs[i])
            }
            resolve('ok');
        } catch (error) {
            reject(error);
        }
    });
}

function getChatTranscript(conversationId, messages){

}

/*
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
    stability: Number,
    confidence: Number,
    hits: [String],
    wordCount: {
        default: 0,
        type: Number
    }
*/

function indexSort(a,b){
    return a.phraseIndex > b.phraseIndex ? 1: -1
} 

const parseText = ({text, stability, confidence, startTimeMs, duration, participantPurpose, words})=>{
    return {
        text, stability, confidence,
        channel: participantPurpose,
        start: startTimeMs,
        end: startTimeMs + duration.milliseconds,
        wordCount: words.length
    }
}

module.exports = {getTranscripts, getSpeechToTextAnalytics}