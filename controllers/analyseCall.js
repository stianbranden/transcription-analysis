const Progress = require('progress');

const Transcript = require('../models/Transcript')
const { logErr, logTab } = require('./logger')
const silenceThreshold = 5000
const overtalkThreshold = 500

function analyseCallTranscriptions(){
    return new Promise( async (resolve, reject)=>{
        try {
            const transcripts = await Transcript.find({hasAnalysis: true, "mediaEnergy.minmax": {$gt:0}})  //{hasAnalysis: false})
            const analysisBar = new Progress('Analysis [:bar] :current/:total (:percent) ETA: :etas', {total: transcripts.length, renderThrottle: 1000})
            for ( let i= 0; i < transcripts.length; i++){
                const transcript = transcripts[i]
                const events = analyseCall(transcript.transcript)
                // logTab(events, transcript.meta.recordingId)
                transcript.events = events

                const bgnoise = analyseMediaEnergy(transcript.mediaEnergy?.channel_0 || [], transcript.transcript, transcript.mediaEnergy?.minmax || 0)
                transcript.backgroundNoise = bgnoise
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

function timeToTimeStamp(time, delimiter = 1000){
    const total = Math.floor(time / delimiter)
    const hour = Math.floor(total/3600)
    const min = Math.floor((total-hour*3600)/60)
    const sec = Math.floor(total-hour*3600-min*60)
    return hour + (min < 10 ? ':0': ':') + min + (sec < 10 ? ':0': ':') + sec
}

function analyseMediaEnergy(energy, transcript, minMax){
    const backgroundNoice = []
    const voiceNoise = []
    energy.forEach((e , i)=>{
        const text = transcript.filter(a=>a.channel==='Customer Service' && Math.floor(a.start/1000)<=i && Math.ceil(a.end/1000)>i)
        if (text.length == 0) backgroundNoice.push(Math.abs(e))
        else voiceNoise.push(Math.abs(e))
    })
    const avg = backgroundNoice.reduce((a,b)=> a+b,0) / backgroundNoice.length || 0
    const avg2 = voiceNoise.reduce((a,b)=> a+b,0) / voiceNoise.length || 0
    return {
        avg,
        avg2,
        relative: Math.floor(avg/minMax * 100) || 0,
        relative2: Math.floor(avg/avg2 *100) ||0
    }
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
                startTime: timeToTimeStamp(maxTime),
                end: text.start,
                endTime: timeToTimeStamp(text.start),
                length: text.start-maxTime
            })
            eventData.totalSilence += text.start-maxTime
            eventData.numOfSilenceEvents++
        }

        if (text.channel === 'Customer Service' && text.start < customerMaxTime - overtalkThreshold ){ //Calculate overtalk
            const end = customerMaxTime < text.end ? customerMaxTime : text.end
            eventData.overtalkEvents.push({
                start: text.start,
                startTime: timeToTimeStamp(text.start),
                end,
                endTime: timeToTimeStamp(end),
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