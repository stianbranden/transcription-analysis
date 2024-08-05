const axios = require('axios')
const { logErr } = require('./logger')

const {C1BASEURL} = process.env

const transcriptQuery = {
    method: 'PUT',
    url:  C1BASEURL + 'cas/speechtextview',
    headers: {
        "Content-Type": "application/json"
    }
}

const chatQuery = {
    method: 'GET',
    url:  C1BASEURL + 'cas/textview',
    headers: {
        "Content-Type": "application/json"
    }
}


const mediaEnergyQuery = {
    method: 'GET',
    url:  C1BASEURL + 'recording/media/energy/'
}


function getTranscriptForContact(sessionId, recordingId, callDuration){
    return new Promise(async(resolve, reject)=>{
        try {
            const query = {...transcriptQuery}
            query.headers['Cookie'] = "hazelcast.sessionId=" + sessionId
            query.data = {
                ccrid: recordingId,
                isRootRecording: false   
            }
            const transcript = (await axios(query)).data
            const energyQuery = {...mediaEnergyQuery, headers: {
                cookie: "hazelcast.sessionId=" + sessionId
            }}
            // energyQuery.headers['Cookie'] = "hazelcast.sessionId=" + sessionId
            energyQuery.url = energyQuery.url + recordingId  + '?dataPoints=' + Math.ceil(callDuration/1000)
            let mediaEnergy = {}
            try {
                mediaEnergy = (await axios(energyQuery)).data
                mediaEnergy.channel_0_length = mediaEnergy.channel_0.length
                mediaEnergy.channel_1_length = mediaEnergy.channel_1.length
            } catch (error) {
                logErr('Failed to get media energy on ' + recordingId + "\n" + error.message)
                // const mediaEnergy = {} 
            }
            
            resolve({transcript, mediaEnergy})
        } catch (error) {
            reject(error)
        }
    })
}

function getChatTranscript(sessionId, recordingId){
    return new Promise(async (resolve, reject)=>{
        const query = {...chatQuery}
        query.headers['Cookie'] = "hazelcast.sessionId=" + sessionId
        query.params = {ccrid: recordingId}
        try {
            const chat = (await axios(query)).data
            resolve(chat)
        } catch (error) {
            reject(error)
        }

    })
}

module.exports = {
    getTranscriptForContact,
    getChatTranscript
}