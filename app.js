require('dotenv').config()

//Node packages
const Progress = require('progress')
const fs = require('fs')
const {argv} = require('yargs')
const moment = require('moment')

//Std controllers
const { logErr, logStd, logTab, logSys } = require('./controllers/logger')
const {connect, disconnect} = require('./controllers/connectDB')

//Controllers
const createMetadata = require('./controllers/createMetadata')
const convertTranscript = require('./controllers/convertTranscript')
const { getDefaultContactData, getChatContacts } = require('./controllers/getContacts')
const authCalabrio = require('./controllers/authCalabrio') 
const { getTranscriptForContact, getChatTranscript } = require('./controllers/getTranscript')
const {createSummaries, fixWrongContactReasons, createSummariesGenesys} = require('./controllers/getSummary')
const analyseContactReason = require('./controllers/analyseContactReason')
const { analyseCallTranscriptions } = require('./controllers/analyseCall')

//Models
const Transcript = require('./models/Transcript')
const { cleanUpErrors } = require('./controllers/transcriptMaintenance')
const writeMetadata = require('./controllers/writeMetadata')
const { sleepAsync } = require('./controllers/utils')
const { genesysAuth, authWithToken } = require('./controllers/genesys/authGC')
const { searchTranscripts } = require('./controllers/genesys/searchTranscripts')
const { saveInitial, appendTranscript, appendCall, saveOne, runSpeechToTextAnalytics } = require('./controllers/genesys/saveTranscript')
const { getTranscripts } = require('./controllers/genesys/getTranscripts')
const createChannel = require('./controllers/genesys/createChannel')
const { createWebSocket, subscribeToQueues, subscribeToTranscript } = require('./controllers/genesys/handleWS')
const getActiveQueues = require('./controllers/genesys/getActiveQueues')
const { log } = require('console')
const getActiveLanguages = require('./controllers/genesys/getLanguages')
const { getChatMessagesAndSaveToTranscript } = require('./controllers/genesys/getChatMessages')
const { getEmailMessageAndSaveToTranscript } = require('./controllers/genesys/getEmailMessages')
const deleteToken = require('./controllers/genesys/deleteToken.js');
const getChannels = require('./controllers/genesys/getChannels.js');
const deleteSubscriptions = require('./controllers/genesys/deleteSubscriptions.js');

//Params
const startCron = Object.keys(argv).length === 2
let lastFetch = moment(argv.d || argv.date).startOf('day')
// console.log(lastFetch.format('HH:mm'));


async function run(){
    try {
        await connect(true)
        if (argv.h || argv.documentation){
            // logStd()
            logTab([
                {name: 'Help', command: '--h or --documentation', description: 'Prints available commands'},
                {name: 'Fetch contacts', command: '--fc or --fetchContacts', description: 'Fetches contacts and transcripts from Calabrio, use together with date command'},
                {name: 'Date', command: '--d or --date', description: 'Used together with fetchContacts, syntax --date=2024-05-02. Defaults to today'},
                {name: 'Create AI Summary', command: '--cs or --createAISummary', description: 'Creates AI summary where hasSummary=false'},
                {name: 'Analyse contact reasons', command: '--ac or --analyse', description: 'Generates a suggestions for contact reasons using 1000 random summaries'},
                {name: 'Analyse call transcriptions for event', command: '--ae or --analyseEvents', description: 'Analyses calls for events'}
            ], 'Commands available:')
        }
        if (argv.cleanUp || argv.cu ){
            const date = argv.date || argv.d || moment().format('YYYY-MM-DD')
            logStd('Cleaning up data for ' + date)
            await cleanUp(date)
        }
        
        if (argv.fetchContacts || argv.fc){
            logStd('Authenticating with Calabrio')
            const {sessionId} = (await authCalabrio()).data
            const date = argv.date || argv.d || moment().format('YYYY-MM-DD')
            logStd('Fetching transcripts for ' + date)
            await runFetchContacts(sessionId, date)
            
        }
        if ( argv.analyseEvents || argv.ae ){
            logStd('Analyzing call transcriptions events')
            await analyseCallTranscriptions()
        }
        if (argv.createAISummary || argv.cs){
            logStd('Creating summaries of contacts')
            await createSummaries()
        }
        if (argv.analyse || argv.ac){
            logStd('Analyzing contact reasons')
            await analyseContactReason()
        }
        
        if ( argv.full || argv.f ){
            const date = argv.date || argv.d || moment().format('YYYY-MM-DD')
            logSys('Running full run for ' + date)
            logStd('Cleaning up data')
            await cleanUp(date)
            logStd('Authenticating with Calabrio')
            const {sessionId} = (await authCalabrio()).data
            logStd('Fetching transcripts here')
            await runFetchContacts(sessionId, date)
            await Promise.all([analyseCallTranscriptions(),createSummaries()])
            await fixWrongContactReasons(date)
            await writeMetadata(sessionId)
            logSys('Full Run ended')
            
        }
        if ( argv.writeMetadata || argv.wm ){
            const {sessionId} = (await authCalabrio()).data
            await writeMetadata(sessionId)
        }
        
        if ( argv.fixErrors || argv.fe ){
            const date = argv.date || argv.d || moment().format('YYYY-MM-DD')
            logStd(`Fixing errors for ${date}`)
            await fixWrongContactReasons(date)
        }

        if ( argv.genesys || argv.g ){
            runGenesys()
        }
        

        if ( startCron ){
            // logStd('Waiting for planned tasks')
            const cron = require('node-cron');
            const CronConfig = require('./models/CronConfig')
            const cronSchedule = await CronConfig.findOne({name: "Fetch transcriptions and do AI summary"}).lean()
            const cronNightlySchedule = await CronConfig.findOne({name: "Refetch yesterdays calls and fetch chats"}).lean()
            logSys('Starting one time job to remove backlog')
            startJobs().then(_=>{ //Fetching all data for today to avoid cluttering
                cron.schedule(cronSchedule.minute + ' ' + cronSchedule.hour + ' * * ' + cronSchedule.weekDay, async _=>{
                    startJobs()
                })    
                // logSys(`Waiting for cron job "${cronSchedule.name}" @${Number(cronSchedule.hour)<10 ? 0: ''}${cronSchedule.hour}:${Number(cronSchedule.minute)<10?0:''}${cronSchedule.minute} ${cronSchedule.weekDay === '*' ? 'every day': cronSchedule.weekDay}`)
                printCronJobInfo(cronSchedule)
                
                cron.schedule(cronNightlySchedule.minute + ' ' + cronNightlySchedule.hour + ' * * ' + cronNightlySchedule.weekDay, async _=>{
                    cleanUp(moment().subtract(1, 'd').format('YYYY-MM-DD'))
                    .then(_=>startJobs(true))
                }) 
                
                printCronJobInfo(cronNightlySchedule)
                // logSys(`Waiting for cron job "${cronNightlySchedule.name}" @${Number(cronNightlySchedule.hour)<10 ? 0: ''}${cronNightlySchedule.hour}:${Number(cronNightlySchedule.minute)<10?0:''}${cronNightlySchedule.minute} ${cronNightlySchedule.weekDay === '*' ? 'every day': cronNightlySchedule.weekDay}`)
            })
        }
        // else await disconnect(true)

    } catch (error) {
        logErr(error.message)
        disconnect(true)
    }
}

function printCronJobInfo(job){
    delete job._id
    logTab(job, 'Running cronjob')
}

function cleanUp(date = moment().format('YYYY-MM-DD')){
    return new Promise (async (resolve, reject)=>{
        try {
            // let date = argv.date || argv.d || moment().format('YYYY-MM-DD')
            // if (yesterday) date = moment(date).subtract(1, 'day')
            const {deletedCount} = await cleanUpErrors(date)
            logStd(deletedCount + ' contacts removed due to errors')
            resolve('ok')
        } catch (error) {
            reject(error)
        }
    })
}

function startJobs(yesterday=false){
    return new Promise( async (resolve, reject)=>{
        try {
            logSys('Transcriptions and AI Summaries cron job started')
            logStd('Authenticating with Calabrio')
            const {sessionId} = (await authCalabrio()).data
            let date = argv.date || argv.d || moment().format('YYYY-MM-DD')
            if (yesterday) date = moment(date).subtract(1, 'day').format('YYYY-MM-DD')
            logStd('Fetching transcripts for ' + date)
            await runFetchContacts(sessionId, date, yesterday)
            await Promise.all([analyseCallTranscriptions(),createSummaries()])
            await fixWrongContactReasons(date)
            await writeMetadata(sessionId)
            logSys('Transcriptions and AI Summaries cron job ended')
            resolve('ok')
        } catch (error) {
            reject(error)
        }
    })
}

function fetchTranscriptAndMediaEnergy(sessionId, contact, date){
    return new Promise (async (resolve, reject)=>{
        try {
            const meta = createMetadata(contact)
            const {transcript, mediaEnergy} = await getTranscriptForContact(sessionId, meta.recordingId, meta.callDuration)
            await new Transcript({date, meta, mediaEnergy, transcript: convertTranscript(transcript.texts)}).save()
            resolve('ok')
        } catch (error) {
            reject(error)
        }    
    })
}
function fetchChatTranscript(sessionId, contact, date){
    return new Promise (async (resolve, reject)=>{
        try {
            const meta = createMetadata(contact)
            const chat = (await getChatTranscript(sessionId, meta.recordingId)).emailBody
            await new Transcript({date, meta, chat}).save()
            resolve('ok')
        } catch (error) {
            logErr(`Contact: ${contact.id}: ${error.message}`)
            reject(error)
        }    
    })
}

// function sleepAsync(ms){
//     return new Promise (async (resolve, reject)=>{
//         setTimeout(_=>{
//             resolve('ok')
//         }, ms)
//     })
// }

function runFetchContacts(sessionId, date, yesterday=false){
    return new Promise (async (resolve, reject)=>{
        try {
            if (yesterday) lastFetch = moment()
            const contacts = await getDefaultContactData(sessionId, date, lastFetch.subtract(lastFetch.format('H')=== '0' ? 0: 1, 'hour').format('HH:mm'))
            lastFetch = moment(contacts.reduce((max, obj)=>{
                return obj.startTime > max ? obj.startTime: max
            }, 0))
            const transcripts = (await Transcript.find({date}, "meta.recordingId").lean()).map(tr=>tr.meta.recordingId)
            const diff = contacts.map(a=>a.id).filter(a=>!transcripts.includes(a))
            // const funcs = diff.map(a=>fetchTranscriptAndMediaEnergy(sessionId, contacts.filter(b=>b.id===a)[0], date))
            logStd('Fetching ' + diff.length + ' transcripts')
            const step = 100
            for (let i = 0; i < diff.length; i+=step){
                if ( i > 0 ) await sleepAsync(1000)
                const curr = diff.slice(i, i+step).map(a=>fetchTranscriptAndMediaEnergy(sessionId, contacts.filter(b=>b.id===a)[0], date))
                let runs = await Promise.allSettled(curr)
                // console.log(i, curr.length, curr[0],runs);
                logStd(`Contact ${i} to ${i+runs.length} - Success: ${runs.filter(a=>a.status==='fulfilled').length}. Fails: ${runs.filter(a=>a.status === 'rejected').length}`)
            }
            
            const chatContacts = await getChatContacts(sessionId, date)
            const diff2 = chatContacts.map(a=>a.id).filter(a=>!transcripts.includes(a))
            logStd('Fetching ' + diff2.length + ' chat logs')
            for (let i = 0; i < diff2.length; i+=step){
                if ( i > 0 ) await sleepAsync(1000)
                const curr = diff2.slice(i, i+step).map(a=>fetchChatTranscript(sessionId, chatContacts.filter(b=>b.id===a)[0], date))
                let runs = await Promise.allSettled(curr)
                // console.log(i, curr.length, curr[0],runs);
                logStd(`Contact ${i} to ${i+runs.length} - Success: ${runs.filter(a=>a.status==='fulfilled').length}. Fails: ${runs.filter(a=>a.status === 'rejected').length}`)
            }

            resolve('ok')
        } catch (error) {
            logErr(error.message)
            reject(error)
        }
    })

}
let authToken
async function runGenesys(){
    try {
        if ( authToken ) { //Genesys clean-up
            try {
                logSys('Cleaning up Genesys Cloud authentication')
                const platformClient = await authWithToken(authToken)
                const channels = await getChannels(platformClient)
                
                // console.log({channels: channels.entities})
                for ( let i = 0; i < channels.entities.length; i++){
                    logSys('Deleting subscriptions ' + channels.entities[i].id)
                    await deleteSubscriptions(platformClient, channels.entities[i].id)
                }
                await deleteToken(platformClient)
                logSys('Deleted token ', authToken)
                authToken = null
            } catch (error) {
                logErr('Error in Genesys clean-up: ' + error.message)
            }
        }
    
        const platformClient = await genesysAuth();
        authToken = platformClient.ApiClient.authData.accessToken
        logStd('Authenticating with Genesys')
        const date = argv.date || argv.d || moment().format('YYYY-MM-DD')
        logStd('Fetching transcripts for ' + date)
        const languages = await getActiveLanguages()
        // console.log(languages);
        
        const data = await searchTranscripts(platformClient, date)
        // console.log(data);
        console.log( await saveInitial(data, date))
        const transcripts = await getTranscripts(platformClient)
        console.log(transcripts)
        await createSummariesGenesys()
        logStd('Genesys data initialized')
    
        const conversationChannel = await createChannel(platformClient)
        const conversationWs = createWebSocket(conversationChannel.connectUri) 
        const transcriptionChannel = await createChannel(platformClient)
        const transcriptionWs = createWebSocket(transcriptionChannel.connectUri)
        const transcriptsubscriptions = []
        
        conversationWs.on('message', async ms=> {
            const msg = JSON.parse(ms.toString())
            const {topicName, eventBody} = msg
            // log(topicName)
            // if (eventBody?.message !== 'WebSocket Heartbeat')
            //     fs.writeFileSync('./data/' + moment().unix() + '.json', JSON.stringify(msg), 'utf8')
            if ( eventBody?.message === 'pong'){ //When recieving a pong, subscribe to queues
                subscribeToQueues(conversationWs, await getActiveQueues())
            }
            else if ( topicName?.includes('v2.routing.queues.') && topicName?.includes('.conversations')){
                const { id, participants } = eventBody
                const customer = participants.filter(p => p.purpose === 'customer')[0]
                const agent = participants.filter(p=>p.purpose === 'agent')[0]
                const acd = participants.filter(p=>p.purpose === 'acd')[0]
                if ( !transcriptsubscriptions.includes(id )){
                    let mediaType = 'na'
                    if (acd){
                        if (acd.emails) mediaType = 'email'
                        if (acd.calls) mediaType = 'voice'
                        if (acd.callbacks) mediaType = 'callback'
                        if (acd.chats) mediaType = 'chat'
                        if (acd.messages) mediaType = 'chat'
                        log(mediaType + ' ' + id + ' - ' + acd.name + ' - ' + agent?.name)
                    }
                    if ( agent && acd  ) {
                        log('Save/Subscribing: ' + id)
                        transcriptsubscriptions.push(id)
                        const language = languages.filter(a=>a._id === acd?.conversationRoutingData?.language?.id)[0]?.name || 'unknown'
                        if ( ['voice'].includes(mediaType) && acd?.calls?.recordingState === 'active') subscribeToTranscript(transcriptionWs, id)   
                            await saveOne({conversationId: id, communicationId: 'awaiting', channel: mediaType, queueId: acd.queueId, language}, moment().format('YYYY-MM-DD'))
                        if ( mediaType === 'chat' && customer?.endTime){
                            const messages = [...customer.messages.map(a=>a.messageId), ...agent.messages.map(a=>a.messageId)]
                            await getChatMessagesAndSaveToTranscript(platformClient, id, messages)
                        }
                        if ( mediaType === 'email' && customer?.endTime){
                            await getEmailMessageAndSaveToTranscript(platformClient, id)
                        }
                    }
                }
                else {
                    if ( customer && acd && agent && ( acd.calls || acd.callbacks) && customer.endTime ){
                        const stt = await runSpeechToTextAnalytics(id, platformClient)
                        console.log(stt);
                        

                    }
                }
            }
            else if (topicName && eventBody && topicName !== 'channel.metadata') {
                console.log({channel: 'conversation', topicName, eventBody});
                
            }
            else if ( topicName !== 'channel.metadata' && msg?.message === 'Successfully subscribed to topic(s).' )
                logStd('Subscribed to conversations in ' + msg.topics.length + ' queues')
            else if ( topicName !== 'channel.metadata' )
                console.log({channel: 'conversation', msg});
            
            
        })
        
        transcriptionWs.on('message', async msg=> {
            const {topicName, eventBody} = JSON.parse(msg.toString())
            
            if ( topicName?.includes("v2.conversations.") && topicName?.includes(".transcription") ){
                const {communicationId, conversationId, status, transcripts, eventTime, sessionStartTimeMs, transcriptionStartTimeMs} = eventBody
                console.log({communicationId, conversationId, status: status.status, eventTime, sessionStartTimeMs, transcriptionStartTimeMs})
                // console.log({type: 'last', transcript: transcripts[transcripts.length-1].alternatives[0].transcript})
                const ts = []
                if (transcripts){
                    for ( let i = 0; i < transcripts.length; i++ ){
                        const {alternatives, channel, dialect} = transcripts[i]
                        const {transcript, confidence, words, offsetMs, durationMs} = alternatives[0]
                        ts.push({channel, dialect, transcript, confidence, words, offsetMs, durationMs})
                        console.log({
                            channel, dialect, transcript, confidence, wordCount: words.length, offsetMs, durationMs
                        })
                    }
                    await appendTranscript(conversationId, ts)
                }
                try {
                    await appendCall({conversationId, communicationId, status: status.status}, platformClient)
                } catch (error) {
                    logErr(error)
                }
            }
            else if (topicName && eventBody && topicName !== 'channel.metadata') {
                console.log({channel: 'transcription', topicName, eventBody});
                
            }
            else  if ( topicName !== 'channel.metadata' ) {
                console.log({channel: 'transcription', data: JSON.parse(msg.toString())});
                
            }
            // if ( data?.eventBody?.message === 'pong'){ //When recieving a pong, subscribe to queues
            //     subscribeToQueues(ws, await getActiveQueues())
            // }
    
        })

    } catch (error) {
        logErr
    }
        

}


run().catch(e=>logErr(e.message))
// fs.writeFileSync('./output/data.json', JSON.stringify(outputData), 'utf8')
// log(outputData)