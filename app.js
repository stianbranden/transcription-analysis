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

async function run(){
    try {
        await connect(true)
        const {sessionId} = (await authCalabrio()).data
        const contacts = await getDefaultContactData(sessionId)
        for ( let i=0; i<contacts.length; i++){
            const meta = createMetadata(contacts[i])
            const transcript = convertTranscript((await getTranscriptForContact(sessionId, meta.recordingId)).texts)
            logTab(meta)
            // logTab(transcript)
            await new Transcript({meta, transcript}).save()
            // await file.save()
        }
        await createSummaries()
        await disconnect(true)
        resolve('done')

    } catch (error) {
        logErr(error)
        reject(error)
    }
}

run()
// fs.writeFileSync('./output/data.json', JSON.stringify(outputData), 'utf8')
// log(outputData)