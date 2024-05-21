const axios = require('axios')

const {C1BASEURL} = process.env

const transcriptQuery = {
    method: 'PUT',
    url:  C1BASEURL + 'cas/speechtextview',
    headers: {
        "Content-Type": "application/json"
    }
}



function getTranscriptForContact(sessionId, recordingId){
    return new Promise(async(resolve, reject)=>{
        try {
            const query = {...transcriptQuery}
            query.headers['Cookie'] = "hazelcast.sessionId=" + sessionId
            query.data = {
                ccrid: recordingId,
                isRootRecording: false   
            }
            const transcript = (await axios(query)).data
            resolve(transcript)
        } catch (error) {
            reject(error)
        }
    })
}

module.exports = {getTranscriptForContact}