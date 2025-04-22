const moment = require("moment");
const Transcript = require('../../models/GenesysTranscript');
const { createSummariesGenesys } = require("../getSummary");

function getChatMessagesAndSaveToTranscript(platformClient, conversationId, messageIds){
    return new Promise(async (resolve, reject) => {
        try {
            let apiInstance = new platformClient.ConversationsApi();

            const doc = await Transcript.findOne({"meta.conversationId": conversationId})
            let opts = { 
                'useNormalizedMessage': true,
                'body': messageIds
            };

            let response = await apiInstance.postConversationsMessageMessagesBulk(conversationId, opts);
            const msgs = []
            response.entities.forEach(e=>{
                msgs.push({
                    text: e.normalizedMessage.text,
                    channel: e.createdBy.name,
                    end: moment(e.timestamp).unix()
                })
            })
            doc.transcript = msgs
            doc.hasTranscript = true
            await doc.save()
            await createSummariesGenesys(conversationId)

            resolve('ok');
        } catch (error) {
            reject(error);
        }
    });
}

module.exports = {getChatMessagesAndSaveToTranscript}


/*
let apiInstance = new platformClient.ConversationsApi();

let conversationId = "conversationId_example"; // String | 
let opts = { 
  'useNormalizedMessage': false, // Boolean | If true, response removes deprecated fields (textBody, media, stickers)
  'body': ["body_example"] // [String] | messageIds
};

apiInstance.postConversationsMessageMessagesBulk(conversationId, opts)
*/