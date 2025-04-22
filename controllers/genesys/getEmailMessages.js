const moment = require("moment");
const Transcript = require('../../models/GenesysTranscript');
const { createSummariesGenesys } = require("../getSummary");

function getEmailMessageAndSaveToTranscript(platformClient, conversationId){
    return new Promise(async (resolve, reject) => {
        try {
            const doc = await Transcript.findOne({"meta.conversationId": conversationId})
            const apiInstance = new platformClient.ConversationsApi();
            const emailMessages = await apiInstance.getConversationsEmailMessages(conversationId);
            const msgs = []
            emailMessages.entities.forEach(e=>{
                msgs.push({
                    text: e.subject + ' - ' + e.textBodyPreview,
                    channel: e.from.name,
                    end: moment(e.time).unix()
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

module.exports = {getEmailMessageAndSaveToTranscript}


/*
platformClient.ApiClient.instance.setAccessToken(yourAccessToken);

let apiInstance = new platformClient.ConversationsApi();

let conversationId = "conversationId_example"; // String | conversationId

apiInstance.getConversationsEmailMessages(conversationId)

*/