require('dotenv').config()

const createMetadata = require('./controllers/createMetadata')
const convertTranscript = require('./controllers/convertTranscript')
const { logErr, logStd, logTab } = require('./controllers/logger')
const {connect, disconnect} = require('./controllers/connectDB')
const { getDefaultContactData } = require('./controllers/getContacts')
const authCalabrio = require('./controllers/authCalabrio') 
const { getTranscriptForContact } = require('./controllers/getTranscript')
const {createSummaries} = require('./controllers/getSummary')
const Transcript = require('./models/Transcript')
const Progress = require('progress')
// const moment = require('moment')
const analyseContactReason = require('./controllers/analyseContactReason')
const {argv} = require('yargs')
const { analyseCallTranscriptions } = require('./controllers/analyseCall')
// function 
// console.log(argv);
async function run(){
    try {
        await connect(true)
        if (argv.h || argv.documentation){
            // logStd()
            logTab([
                {name: 'Help', command: '--h or --documentation', description: 'Prints available commands'},
                {name: 'Fetch contacts', command: '--fc or --fetchContacts', description: 'Fetches contacts and transcripts from Calabrio, use together with date command'},
                {name: 'Date', command: '--d or --date', description: 'Used together with fetchContacts, syntax --date=2024-05-02. Defaults to 2024-05-02'},
                {name: 'Create AI Summary', command: '--cs or --createAISummary', description: 'Creates AI summary where hasSummary=false'},
                {name: 'Analyse contact reasons', command: '--ac or --analyse', description: 'Generates a suggestions for contact reasons using 1000 random summaries'},
                {name: 'Analyse call transcriptions for event', command: '--ae or --analyseEvents', description: 'Analyses calls for events'}
            ], 'Commands available:')
        }
        if (argv.fetchContacts || argv.fc){
            logStd('Authenticating with Calabrio')
            const {sessionId} = (await authCalabrio()).data
            const date = argv.date || argv.d || '2024-05-02'//moment().format('YYYY-MM-DD')
            logStd('Fetching transcripts for ' + date)
            const contacts = await getDefaultContactData(sessionId, date)
            const contactProgress = new Progress('Transcripts [:bar] :current/:total (:percent) ETA: :etas', {total: contacts.length, renderThrottle: 1000})
            for ( let i=0; i<contacts.length; i++){
                // if ( i === 0) console.log(contacts[i]);
                const meta = createMetadata(contacts[i])
                const transcript = convertTranscript((await getTranscriptForContact(sessionId, meta.recordingId)).texts)
                // logTab(meta)
                await new Transcript({date, meta, transcript}).save()
                contactProgress.tick()
            }
        }
        if (argv.createAISummary || argv.cs){
            logStd('Creating summaries of contacts')
            await createSummaries()
        }
        if (argv.analyse || argv.ac){
            logStd('Analyzing contact reasons')
            await analyseContactReason()
        }
        if ( argv.analyseEvents || argv.ae ){
            logStd('Analyzing call transcriptions events')
            await analyseCallTranscriptions()
        }

        await disconnect(true)

    } catch (error) {
        logErr(error)
        disconnect(true)
    }
}

run()
// fs.writeFileSync('./output/data.json', JSON.stringify(outputData), 'utf8')
// log(outputData)