const WebSocket = require('ws')
const moment = require('moment')

function createWebSocket(uri){
    const ws = new WebSocket(uri)
    ws.on('error', console.error);
    ws.on('open', _=> ws.send(JSON.stringify({message: 'ping'})))
    return ws
}

function subscribeToQueues(ws, queues){
    ws.send(JSON.stringify({
            "message": "subscribe",
            "topics": [...queues.map(a=>"v2.routing.queues." + a._id + ".conversations")],
            "correlationId": "Subscribing to queues@" + moment().format('YYYY-MM-DD hh:mm')
        })
    )
}

function subscribeToTranscript(ws, conversationId){
    ws.send(JSON.stringify({
            "message": "subscribe",
            "topics": ["v2.conversations." + conversationId + ".transcription"],
            "correlationId": "Subscribing to transcription(" + conversationId + ")@" + moment().format('YYYY-MM-DD hh:mm')
        })
    )
}
//v2.conversations.{id}.transcription


module.exports = {createWebSocket, subscribeToQueues, subscribeToTranscript}