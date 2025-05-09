const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");
const color = require('colors/safe');
const {AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, GPT35_MODEL_NAME, GPT4_MODEL_NAME} = process.env
const Transcript = require('../models/Transcript')
const GenesysTranscript = require('../models/GenesysTranscript')
const db = require('./connectDB')
const Progress = require('progress');
const { logErr, logTab, logStd } = require("./logger");
const { createOrUpdateTokenUsage } = require("./logTokensUsed");
const contact_reasons = require('../training_data/contact_reasons')
const service_journeys = require('../training_data/service_journeys');
const { sleepAsync } = require("./utils");
// console.log({AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY})


const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

function runSummary(id, status, source){
  return new Promise (async (resolve, reject)=>{
    try {
      let tries = 0
        try {
          await summary(id, false, source)
        } catch (error) {
          tries ++
          logErr(id + ' Failed')
          if (error.message.includes("Unexpected token") || error.message.includes("Unexpected end of JSON input")){
            logStd('Retrying')
            try {
              await summary(transcripts[i], source)
            } catch (error) {
              status.failed++
              logErr(error.message)
            }
          }
          else if ( error.message.includes("This model's maximum context length") ){
            logStd('Retrying with bigger model')
            try {
              await summary(id, true, source)
            } catch (error) {
              status.failed++
              logErr(error.message)
            }
          }
          else if ( error.message.includes("have exceeded token rate limit") ){
            logStd('Token rate limit exceeded, waiting 10 seconds')
            try {
              await sleep(10000)
              await summary(id, false, source)
            } catch (error) {
              status.failed++
              logErr(error.message)
            }
          }
          else if ( error.message.includes("have exceeded call rate limit") ){
            logStd('Call rate limit exceeded, waiting 10 seconds')
            try {
              await sleep(10000)
              await summary(id, false, source)
            } catch (error) {
              status.failed++
              logErr(error.message)
            }
          }
          else {
            status.failed++
            logErr(error.message)
          }

        }
        status.success++
      resolve('ok')
    } catch (error) {
      reject(error)
    }
  })
}

function createSummaries(){
  return new Promise( async(resolve, reject)=>{
    const status = {success: 0, failed: 0}
    try {

      const transcripts = (await Transcript.find({hasSummary: {$ne: true}}, "_id").lean()).map(tr=>tr._id.toString())
      logStd(`Creating summaries for ${transcripts.length} contacts`)

      const step = 100
      for ( let i = 0; i < transcripts.length; i+=step){
        if ( i > 0) await sleepAsync(10000)
        const results = await Promise.allSettled(transcripts.slice(i, i+step).map(a=>runSummary(a, status)))
        logStd(`Summary ${i} to ${i+step} complete. Success: ${results.filter(a=>a.status==='fulfilled').length}, Failed: ${results.filter(a=>a.status==='rejected').length}`)
      }


      resolve('ok')
      // await db.disconnect() 
    } catch (error) {
      // logErr(JSON.stringify(error))
      status.failed++
      reject(error)
    }
    finally {
      logStd(status.success + " AI Summaries created successfully, " + status.failed + ' errors')
    }
  })
}

function createSummariesGenesys(conversationId = null){
  return new Promise( async(resolve, reject)=>{
    const status = {success: 0, failed: 0}
    try {
      const transcripts = []
      if (conversationId){ //This runs a continous single 
        const contact = await GenesysTranscript.findOne({"meta.conversationId": conversationId}).lean()
        transcripts.push(contact._id.toString())
      }
      else { //This runs a bulk job
        transcripts.push(...(await GenesysTranscript.find({hasSummary: {$ne: true}, hasTranscript: true}, "_id").lean()).map(tr=>tr._id.toString()))
      }
      logStd(`Creating summaries for ${transcripts.length} contacts`)

      const step = 100
      for ( let i = 0; i < transcripts.length; i+=step){
        if ( i > 0) await sleepAsync(10000)
        const results = await Promise.allSettled(transcripts.slice(i, i+step).map(a=>runSummary(a, status, 'Genesys')))
        logStd(`Summary ${i} to ${i+step} complete. Success: ${results.filter(a=>a.status==='fulfilled').length}, Failed: ${results.filter(a=>a.status==='rejected').length}`)
      }


      resolve('ok')
      // await db.disconnect() 
    } catch (error) {
      logErr(JSON.stringify(error))
      status.failed++
      reject(error)
    }
    finally {
      logStd(status.success + " AI Summaries created successfully, " + status.failed + ' errors')
    }
  })
}



const json_summary_template = {
  summary: "string",
  sentiment: "Positive, negative or neutral"
}

const json_contact_reason_template = {
  contact_reason: {
    service_journey: {
      fullname: "string",
      abbreviation: "string"
    },
    level1: "string",
    level2: "string", 
    confidence: "Number from 0 to 100"
  }
}

function cleanResult(result){
  const first = result.indexOf('{')
  const last = result.lastIndexOf('}')
  return result.slice(first, last+1)
}

function summary(_id, largeModel = false, source='Calabrio') {
  const messages = [
    // { role: "system", content: "Always answer in English. You create summaries from text transcripts of conversations with an electronics retailer customer service. In addition, using a 3 level granularity, you categorize the contact reason of the conversation. Return the summary and contact reason as a json object with the format: {\"summary\": \"example summary\", \"contact_reason\": {\"level1\": \"example level 1\", \"level2\": \"example level 2\", \"level3\": \"example level 3\"}}" },
    { role: "system", content: "Always answer in English. You create summaries from text transcripts of conversations with an electronics retailer customer service. Leave out customer data like address, name, etc in the summary. You also analyse the customer sentiment. Please respond only in JSON format: " + JSON.stringify(json_summary_template)}
    
    //In addition, categorize the contact reason of the conversation using the set list of contact reasons. Return the summary and contact reason as a json object with the format: {\"summary\": \"example summary\", \"contact_reason\": {\"level1\": \"example level 1\", \"level2\": \"example level 2\"}}. The list of contact reasons are: " + JSON.stringify(contact_reasons) },
  //   { role: "user", content: "Does Azure OpenAI support customer managed keys?" },
  //   { role: "assistant", content: "Yes, customer managed keys are supported by Azure OpenAI" },
  //   { role: "user", content: "What are Azure AI services?" },
  ];
  //   console.log("== Chat Completions Sample ==");
    return new Promise( async(resolve, reject)=>{
        try {
            // await db.connect()
            const client = new OpenAIClient(AZURE_OPENAI_ENDPOINT, new AzureKeyCredential(AZURE_OPENAI_API_KEY));
            let transcript
            if ( source === 'Calabrio') {
              transcript = await Transcript.findById(_id, "meta.language meta.channel chat transcript.text transcript.channel").lean()
            }
            else {
              transcript = await GenesysTranscript.findById(_id, "meta.language meta.channel chat transcript.text transcript.channel").lean()
            }
              // for ( let i = 0; i < transcript.transcript.length; i++ ){
            //     const text = transcript.transcript[i]
            //     if ( text.channel === 'Customer') console.log(color.green(text.channel + ': ') + text.text);
            //     else console.log(color.blue(text.channel + ': ') + text.text);
            //     await sleep(350)                
            // }
            if ( transcript.chat || transcript.transcript.length > 0){

              if (transcript.meta.channel === 'Chat' ) messages.push({role: 'user', content: transcript.chat})
            
              else messages.push({role: "user", content: JSON.stringify(transcript)})
              // console.log()
              // console.log('Azure OpenAI, please create a summary of this conversation and also a log the contact reason :D');
              // console.log()
              const model = largeModel ? GPT4_MODEL_NAME : GPT35_MODEL_NAME
              const result = await client.getChatCompletions(model, messages, {response_format: "json_object"});
              await createOrUpdateTokenUsage(result)
              // await sleep(200)
              
              // console.log(color.red('Summary: '))
              // for (const choice of result.choices) {
                // console.log(result.choices[0].message.content);
              const data = JSON.parse(cleanResult(result.choices[0].message.content))
              // console.log(data);
              //const initialPrompt = "Based on this summary of a conversation of a electronics reatil contact center, categorize the service journey and contact reason of the conversation using the set list of service journeys and contact reasons. Return service journey and contact reason as a json object with the format: " + JSON.stringify(json_contact_reason_template) + ". The list of contact reasons are: " + JSON.stringify(contact_reasons) + ". the list of Service journeys are: " + JSON.stringify(service_journeys)
              const initialPrompt = `
                You are a categorisation assistant. 
                Based on the provided summary of a conversation between an electronic retail contacts center and a customer, 
                select the best service journey and contact reason from the lists below. If you cannot find a good fit, select the option "Unknown".
                The list of Service Journeys are: ${JSON.stringify(service_journeys)}.
                The list of Contact reasons are: ${JSON.stringify(contact_reasons)}.
                Please respond only in JSON format: ${JSON.stringify(json_contact_reason_template)}`

              const messages2 = [
                {role: 'system', content: initialPrompt },
                {role: 'user', content: data.summary}
              ]
              // await sleep(1000)
                // console.log()
                // console.log(color.red('Contact reason: '))
                // console.log('Level 1: ' + data["contact_reason"].level1);
                // console.log('Level 2: ' + data["contact_reason"].level2);
                // console.log('Level 3: ' + data["contact_reason"].level3);
                // console.log()
                // console.log()
                const result2 = await client.getChatCompletions(GPT35_MODEL_NAME, messages2, {response_format: "json_object", temperature: 0.0})
                await createOrUpdateTokenUsage(result2)
                const parsed = JSON.parse(cleanResult(result2.choices[0].message.content))
                const contact_reason = parsed || result2.choices[0].message.content
                // console.log(contact_reason);
                if (source === 'Calabrio'){
                  await Transcript.findByIdAndUpdate(_id, {
                    summary: data.summary,
                    contactReason: contact_reason["contact_reason"],
                    sentiment: data.sentiment,
                    hasSummary: true,
                    hasMetadataPushed: false
                  })                
                }
                else {
                  await GenesysTranscript.findByIdAndUpdate(_id, {
                    summary: data.summary,
                    contactReason: contact_reason["contact_reason"],
                    sentiment: data.sentiment,
                    hasSummary: true,
                    hasMetadataPushed: false
                  })     
                }
    
                resolve(result)
            }
            else {
              await Transcript.findByIdAndUpdate(_id, {
                hasError: true,
                errorMessage: 'No transcript found',
                hasSummary: true
              })
              reject({
                message: 'No transcript found'
              })
            }

            // }

        } catch (error) {
            // console.log(error);
            await Transcript.findByIdAndUpdate(_id, {
              hasError: true,
              errorMessage: error?.message || error,
              hasSummary: true
            })
            reject(error)
        }
    })
}

function fixWrongContactReasons(date){
  return new Promise( async (resolve, reject)=>{
    try {
      const query = {
        date, 
        hasSummary: true, 
        $or: [
          {"contactReason.service_journey.fullname": {$nin: service_journeys.map(a=>a.fullname)}}, 
          {"contactReason.level1": {$nin: contact_reasons.map(a=>a.title)}}
        ]
      }
      // console.log(JSON.stringify(query))
      const contacts = await Transcript.find(query).lean()
      // console.log(`Prerun: Contacts with non-fitting contact reason level 1: ${contacts.length}`);
      const rerun = await Promise.allSettled(contacts.map(a=>summary(a._id)))
      // console.log(rerun);
      // console.log(`Afterrun: Contacts with non-fitting contact reason level 1: ${(await Transcript.find(query).lean()).length}`);

      logStd(`Non-fitting Contact reasons: ${contacts.length}, reduced to ${(await Transcript.find(query).lean()).length}`)
      
      
      resolve('ok')
    } catch (error) {
      reject(error)
    }
  })
}

// summary().catch((err) => {
//   console.error("The sample encountered an error:", err);
// });

module.exports = { createSummaries, fixWrongContactReasons, createSummariesGenesys}