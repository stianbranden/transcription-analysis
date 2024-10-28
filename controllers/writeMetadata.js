const axios = require('axios')
const Transcript = require('../models/Transcript')
const { logErr, logTab, logStd } = require('./logger')
const {C1BASEURL} = process.env

const writeMetadataQuery =  {
    url: C1BASEURL + 'recordingcontrols/metadata',
    method: 'post'
}

function getMetadataObject(transcript){
    return [
        {
            "name":"automatic-contact-reason-level-1-key",
            "value" : transcript.contactReason.level1 || 'N/A'
        },
        {
            "name":"automatic-contact-reason-level-2-key",
            "value" : transcript.contactReason.level2 || 'N/A'
        },
        {
            "name":"service-journey-key",
            "value" : transcript.contactReason.service_journey.fullname || 'N/A'
        },
        {
            "name":"automatic-sentiment-key",
            "value" : transcript.sentiment || 'N/A'
        }
    ]
}

function writeMetadata(sessionId){
    return new Promise (async (resolve, reject)=>{
        try {
            const transcripts = await Transcript.find({hasMetadataPushed: false}).lean()
            logStd('Pushing ' + transcripts.length + ' contact metadatas back to Calabrio')
            const funcs = []
            for (let i= 0; i < transcripts.length; i++){
                funcs.push(pushMetadata(sessionId, transcripts[i]))
            }
            const results = await Promise.allSettled(funcs)
            const result = {
                fulfilled: 0,
                rejected: 0
            }
            results.forEach(r=>result[r.status]++)
            logTab(result, 'WriteMetadataResults')
            resolve('ok')
        } catch (error) {
            logErr(error.message)
            reject(error)
        }
    })
}

function pushMetadata(sessionId, transcript){
    return new Promise( async (resolve, reject)=>{
        const request = {
            ...writeMetadataQuery, 
            params: {ccrId: transcript.meta.recordingId},
            data: {
                "metadata": getMetadataObject(transcript)
            },
            headers: {
                cookie: "hazelcast.sessionId=" + sessionId
            }
        }
        try {
            const res = await axios(request)
            await Transcript.findByIdAndUpdate(transcript._id, {
                hasMetadataPushed: true
            })
            // logStd(res.status)
            resolve(res.status)  
        } catch (error) {
            logErr(error.message)
            reject(error.response?.status || 999)
        }

    })
}

module.exports = writeMetadata

