const axios = require('axios')

const {C1BASEURL} = process.env

const contactQuery = {
    method: 'GET',
    url:  C1BASEURL + 'recording/contact?beginDate=2024-05-06&endDate=2024-05-06&limit=1000&hasTranscription&expand=metadata'
}

function getContacts(sessionId){
    return new Promise(async(resolve, reject)=>{
        try {
            const contacts = (await axios({
                ...contactQuery,
                headers: {
                    cookie: "hazelcast.sessionId=" + sessionId
                }
            })).data
            resolve(contacts)
        } catch (error) {
            reject(error)
        }

    })
}

module.exports = {
    getDefaultContactData: getContacts
}

// const {sessionId} = (await authCalabrio()).data
//             const forms = (await axios({
//                 ...c1evalForms,
//                 headers: {
//                     cookie: "hazelcast.sessionId=" + sessionId
//                 }
//             })).data