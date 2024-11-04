
// function convertHits(){

// }

function convertTranscript(texts){
    const transcript = []
    if ( texts ){
        texts.forEach(a=>{
            const {text, channel, hits, start, end} = a
            const h = []
            hits.forEach(hit=>{
                h.push(hit.category)
            })
    
            transcript.push({
                text,
                start, 
                end, 
                channel: channel === 1 ? 'Customer Service' : 'Customer',
                hits: h
            })
        })
        return transcript
    }
}

module.exports = convertTranscript