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
// function 
// console.log(argv);
async function run(){
    try {
        await connect(true)
        if (argv.fetchContacts){
            logStd('Authenticating with Calabrio')
            const {sessionId} = (await authCalabrio()).data
            const date = argv.date || '2024-05-02'//moment().format('YYYY-MM-DD')
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
        if (argv.createAISummary){
            logStd('Creating summaries of contacts')
            await createSummaries()
        }
        if (argv.analyse){
            logStd('Analyzing contact reasons')
            await analyseContactReason()

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