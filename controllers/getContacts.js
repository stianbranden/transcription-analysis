const axios = require('axios')

const {C1BASEURL} = process.env

const limit = 1000

const contactQuery = {
    method: 'GET',
    url:  C1BASEURL + 'recording/contact?limit=' + limit + '&hasTranscription&expand=metadata'
}

const statQuery = {
    method: 'GET',
    url:  C1BASEURL + 'recording/contact?hasTranscription&searchStats=true'
}

//beginDate=2024-05-02&endDate=2024-05-02&
function getContacts(sessionId, date="2024-05-02"){
    return new Promise(async(resolve, reject)=>{
        try {
            // const min = 0
            // let  max = 999
            const query = {...statQuery, headers: {
                cookie: "hazelcast.sessionId=" + sessionId
            }}
            query.url = query.url + '&beginDate=' + date + '&endDate=' + date
            const count = (await axios(query)).data.count
            console.log('Number to fetch: ' + count);
            let contacts = []
            for (let min = 0; min < count; min += limit) {
                const max = min + limit - 1
                console.log({min, max});
                const cQuery = {
                    ...contactQuery,
                    headers: {
                        cookie: "hazelcast.sessionId=" + sessionId,
                        Range: "items="+ min + "-" + max
                    }
                }
                cQuery.url = cQuery.url + '&beginDate=' + date + '&endDate=' + date
                const newContacts = (await axios(cQuery)).data
                contacts = [...contacts, ...newContacts]
            }
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