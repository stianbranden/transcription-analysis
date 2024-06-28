const Progress = require('progress');

const Transcript = require('../models/Transcript')
const { logErr, logTab } = require('./logger')
const silenceThreshold = 5000
const overtalkThreshold = 500

function analyseCallTranscriptions(){
    return new Promise( async (resolve, reject)=>{
        try {
            const transcripts = await Transcript.find({hasAnalysis: false})
            const analysisBar = new Progress('Analysis [:bar] :current/:total (:percent) ETA: :etas', {total: transcripts.length, renderThrottle: 1000})
            for ( let i= 0; i < transcripts.length; i++){
                const transcript = transcripts[i]
                const events = analyseCall(transcript.transcript)
                // logTab(events, transcript.meta.recordingId)
                transcript.events = events
                transcript.hasAnalysis = true
                analysisBar.tick()
                await transcript.save()
                
            }
            resolve('ok')
        } catch (error) {
            logErr(error.message)
            reject(error)
        }
    })
}


function analyseCall(transcription){
    const eventData = {
        silenceEvents: [],
        totalSilence: 0,
        numOfSilenceEvents: 0,
        overtalkEvents: [],
        totalOvertalk: 0,
        numOfOvertalkEvents: 0,
        lineCount: {
            customer: 0,
            agent: 0
        },
        wordCount: {
            customer: 0,
            agent: 0
        },
        talkLength: {
            customer: 0,
            agent: 0
        }
    }
    let maxTime = 0
    let customerMaxTime = 0;
    transcription.forEach(text =>{

        if (text.channel === 'Customer'){ //Calculate line and wordcount for Customers
            eventData.lineCount.customer++
            eventData.wordCount.customer += text.text.split(' ').length
            eventData.talkLength.customer += text.end - text.start
        }
        else { //Calculate line and wordcount for Customers
            eventData.lineCount.agent++
            eventData.wordCount.agent += text.text.split(' ').length
            eventData.talkLength.agent += text.end - text.start
        }

        if ( text.start > (maxTime + silenceThreshold)){ //Calculate silence events
            eventData.silenceEvents.push({
                start: maxTime,
                end: text.start,
                length: text.start-maxTime
            })
            eventData.totalSilence += text.start-maxTime
            eventData.numOfSilenceEvents++
        }

        if (text.channel === 'Customer Service' && text.start < customerMaxTime - overtalkThreshold ){ //Calculate overtalk
            const end = customerMaxTime < text.end ? customerMaxTime : text.end
            eventData.overtalkEvents.push({
                start: text.start,
                end,
                length: end - text.start
            })
            eventData.totalOvertalk += end - text.start
            eventData.numOfOvertalkEvents++
        }

        if (text.channel === 'Customer') customerMaxTime = text.end


        maxTime = text.end
    })
    return eventData
}

module.exports = {analyseCallTranscriptions}