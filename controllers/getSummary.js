const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");
const color = require('colors/safe');
const {AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, GPT35_MODEL_NAME} = process.env
const Transcript = require('../models/Transcript')
const db = require('./connectDB')
const Progress = require('progress');
const { logErr } = require("./logger");
// console.log({AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY})


const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};


function createSummaries(){
  return new Promise( async(resolve, reject)=>{
    try {
      // await db.connect()

      // const _id = "662f4ea597c09f2ee68e2fda"
      // await summary(_id)

      const transcripts = (await Transcript.find({hasSummary: {$ne: true}}, "_id").lean()).map(tr=>tr._id.toString())
      const aiBar = new Progress('Summaries [:bar] :current/:total (:percent) ETA: :etas', {total: transcripts.length, renderThrottle: 1000})
      for ( let i = 0; i < transcripts.length; i++){
        try {
          await summary(transcripts[i])
        } catch (error) {
          logErr(transcripts[i] + ' Failed')
          logErr(JSON.stringify(error))
        }

        aiBar.tick()
      }
      resolve('ok')
      // await db.disconnect() 
    } catch (error) {
      logErr(JSON.stringify(error))
      reject(error)
    }
    
  })
}

function summary(_id) {
  const messages = [
    { role: "system", content: "Always answer in English. You create summaries from text transcripts of conversations with an electronics retailer customer service. In addition, using a 3 level granularity, you categorize the contact reason of the conversation. Return the summary and contact reason as a json object with the format: {\"summary\": \"example summary\", \"contact_reason\": {\"level1\": \"example level 1\", \"level2\": \"example level 2\", \"level3\": \"example level 3\"}}" },
  //   { role: "user", content: "Does Azure OpenAI support customer managed keys?" },
  //   { role: "assistant", content: "Yes, customer managed keys are supported by Azure OpenAI" },
  //   { role: "user", content: "What are Azure AI services?" },
  ];
  //   console.log("== Chat Completions Sample ==");
    return new Promise( async(resolve, reject)=>{
        try {
            // await db.connect()
            const client = new OpenAIClient(AZURE_OPENAI_ENDPOINT, new AzureKeyCredential(AZURE_OPENAI_API_KEY));
            const transcript = await Transcript.findById(_id, "meta.language transcript.text transcript.channel").lean()
            // for ( let i = 0; i < transcript.transcript.length; i++ ){
            //     const text = transcript.transcript[i]
            //     if ( text.channel === 'Customer') console.log(color.green(text.channel + ': ') + text.text);
            //     else console.log(color.blue(text.channel + ': ') + text.text);
            //     await sleep(350)                
            // }
            messages.push({role: "user", content: JSON.stringify(transcript)})
            // console.log()
            // console.log('Azure OpenAI, please create a summary of this conversation and also a log the contact reason :D');
            // console.log()
            const result = await client.getChatCompletions(GPT35_MODEL_NAME, messages);
            // await sleep(200)
            
            // console.log(color.red('Summary: '))
            // for (const choice of result.choices) {
              // console.log(result.choices[0].message.content);
              const data = JSON.parse(result.choices[0].message.content)
              // console.log(data.summary);
              
              // await sleep(1000)
              // console.log()
              // console.log(color.red('Contact reason: '))
              // console.log('Level 1: ' + data["contact_reason"].level1);
              // console.log('Level 2: ' + data["contact_reason"].level2);
              // console.log('Level 3: ' + data["contact_reason"].level3);
              // console.log()
              // console.log()

            // }
            await Transcript.findByIdAndUpdate(_id, {
              summary: data.summary,
              contactReason: data["contact_reason"],
              hasSummary: true
            })

            resolve(result)
        } catch (error) {
            console.log(error);
            reject(error)
        }
    })
}

// summary().catch((err) => {
//   console.error("The sample encountered an error:", err);
// });

module.exports = { createSummaries };