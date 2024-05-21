const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");
const color = require('colors/safe');
const {AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY} = process.env
const Transcript = require('../models/Transcript')
const db = require('./connectDB')
// console.log({AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY})

// const _id = "662f4ea597c09f2ee68e2fda"

const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  };

  
  function traverseTranscripts(){
    return new Promise( async(resolve, reject)=>{
      try {
      await db.connect()
      const transcripts = (await Transcript.find({hasSummary: {$ne: true}}, "_id").lean()).map(tr=>tr._id.toString())
      for ( let i = 0; i < transcripts.length; i++){
        await summary(transcripts[i])
      }
      
      await db.disconnect() 
    } catch (error) {
      reject(error)
    }
    
  })
}

function summary(_id) {
  const messages = [
    { role: "system", content: "Always answer in English. You create summaries from text transcipts of conversations with an electronics retailer customer service. In addition, using a 3 level granularity, you categorize the contact reason of the conversation. Return the summary and contact reason as a json object with the format: {\"summary\": \"example summary\", \"contact_reason\": {\"level1\": \"example level 1\", \"level2\": \"example level 2\", \"level3\": \"example level 3\"}}" },
  //   { role: "user", content: "Does Azure OpenAI support customer managed keys?" },
  //   { role: "assistant", content: "Yes, customer managed keys are supported by Azure OpenAI" },
  //   { role: "user", content: "What are Azure AI services?" },
  ];
  //   console.log("== Chat Completions Sample ==");
    return new Promise( async(resolve, reject)=>{
        try {
            // await db.connect()
            const client = new OpenAIClient(AZURE_OPENAI_ENDPOINT, new AzureKeyCredential(AZURE_OPENAI_API_KEY));
            const deploymentId = "gpt35turbo-1106";
            const transcript = await Transcript.findById(_id, "meta.language transcript.text transcript.channel").lean()
            // for ( let i = 0; i < transcript.transcript.length; i++ ){
            //     const text = transcript.transcript[i]
            //     if ( text.channel === 'Customer') console.log(color.green(text.channel + ': ') + text.text);
            //     else console.log(color.blue(text.channel + ': ') + text.text);
            //     await sleep(1000)                
            // }
            messages.push({role: "user", content: JSON.stringify(transcript)})
            // console.log()
            // console.log('OpenAI, please create a summary of this conversation and also a log the contact reason :D');
            // console.log()
            const result = await client.getChatCompletions(deploymentId, messages);
            // console.log(color.red('Summary: '))
            
            // for (const choice of result.choices) {
              console.log(result.choices[0].message.content);
              const data = JSON.parse(result.choices[0].message.content)
              // console.log(result.choices[1].message.content);
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

module.exports = { summary, traverseTranscripts };