
// function convertHits(){

// }

function convertTranscript(texts){
    const transcript = []
    texts.forEach(a=>{
        const {text, channel, hits} = a
        const h = []
        hits.forEach(hit=>{
            h.push(hit.category)
        })

        transcript.push({
            text,
            channel: channel === 1 ? 'Customer Service' : 'Customer',
            hits: h
        })
    })
    return transcript
}

module.exports = convertTranscript