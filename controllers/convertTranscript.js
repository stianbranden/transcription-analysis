

function convertTranscript(texts){
    const transcript = []
    texts.forEach(a=>{
        const {text, channel} = a
        transcript.push({
            text,
            channel: channel === 1 ? 'Customer Service' : 'Customer'
        })
    })
    return transcript
}

module.exports = convertTranscript