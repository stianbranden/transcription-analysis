const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");
const color = require('colors/safe');
const {AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, GPT4_MODEL_NAME} = process.env
const Transcript = require('../models/Transcript')
const db = require('./connectDB')
const Progress = require('progress');
const { logErr, logStd, logTab } = require("./logger");
const { createOrUpdateTokenUsage } = require("./logTokensUsed");

function shortenJSON(data){
    return {summary: data.summary,  
        contact_reason_level1: data.contactReason.level1 || 'n/a', 
        contact_reason_level2: data.contactReason.level2 + ' - ' + data.contactReason.level3 || 'n/a'
        // contact_reason_level3: data.contactReason.level3 
    }
}

function analyse(query={hasSummary: true}, maxSampleSize=1000, options={temperature: 0.3, response_format: "json_object"}){
    return new Promise( async (resolve, reject)=>{
        try {
            const summaries = await Transcript.find(query, {summary: 1, "contactReason": 1}).lean()
            // console.log(shortenJSON(summaries[0]))
            logTab({"Samples found": summaries.length, "Max samples used": maxSampleSize }, "Starting analysis")

            const messages = [
                { role: "system", content: "Always answer in English. Provide response in json"},
                { role: "system", content: "Based on the data, create a set of 5-10 better Contact reasons Level 1s and Level 2s"},
                { role: "system", content: "Include how many of the samples each Contact reason would get and also how many of the sample data doesnt match a contact reason" }
            ];
            if (summaries.length <= maxSampleSize){
                for ( let i = 0; i < summaries.length; i++) {
                    messages.push({role: "user", content: JSON.stringify(shortenJSON(summaries[i]))})
                }
            }
            else {
                for ( let i = 0; i < maxSampleSize; i++){
                    const index = Math.floor(Math.random()*summaries.length)
                    const obj = summaries.splice(index, 1)
                    // console.log(obj[0])
                    messages.push({role: 'user', content: JSON.stringify(shortenJSON(obj[0]))})
                }
            }


            const client = new OpenAIClient(AZURE_OPENAI_ENDPOINT, new AzureKeyCredential(AZURE_OPENAI_API_KEY));

            const result = await client.getChatCompletions(GPT4_MODEL_NAME, messages, options);
            // console.log(result);
            logStd( result.choices[0].message.content )
            logTab ( result.usage , 'Tokens used')
            await createOrUpdateTokenUsage(result)

            resolve('ok')
        } catch (error) {
            // logErr(error)
            reject(error)
        }

    })
}

module.exports = analyse