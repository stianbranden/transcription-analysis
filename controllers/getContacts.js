const axios = require('axios')
const moment = require('moment')

const {C1BASEURL} = process.env

const limit = 1000

const contactQuery = {
    method: 'GET',
    url:  C1BASEURL + 'recording/contact?limit=' + limit + '&hasTranscription&expand=metadata&contactType=CALL'
}

const statQuery = {
    method: 'GET',
    url:  C1BASEURL + 'recording/contact?hasTranscription&searchStats=true&contactType=CALL'
}
const chatQuery = {
    method: 'GET',
    url:  C1BASEURL + 'recording/contact?limit=' + limit + '&expand=metadata&contactType=TEXT'
}

const statChatQuery = {
    method: 'GET',
    url:  C1BASEURL + 'recording/contact?searchStats=true&contactType=TEXT'
}

//beginDate=2024-05-02&endDate=2024-05-02&
function getDefaultContactData(sessionId, date=moment().format('YYYY-MM-DD'), startTime='00:00'){
    return new Promise(async(resolve, reject)=>{
        try {
            // const min = 0
            // let  max = 999
            console.log({sessionId, date, startTime});
            
            const query = {...statQuery, headers: {
                cookie: "hazelcast.sessionId=" + sessionId
            }}
            query.url = query.url + '&beginDate=' + date + '&endDate=' + date + '&beginTime=' + startTime + '&endTime=23:59'
            console.log(query.url)
            const count = (await axios(query)).data.count
            console.log('Calls to fetch: ' + count);
            let contacts = []
            for (let min = 0; min < count; min += limit) {
                const max = min + limit - 1
                // console.log({min, max});
                const cQuery = {
                    ...contactQuery,
                    headers: {
                        cookie: "hazelcast.sessionId=" + sessionId,
                        Range: "items="+ min + "-" + max
                    }
                }
                cQuery.url = cQuery.url + '&beginDate=' + date + '&endDate=' + date + '&beginTime=' + startTime + '&endTime=23:59'
                const newContacts = (await axios(cQuery)).data
                contacts = [...contacts, ...newContacts]
            }
            resolve(contacts)
        } catch (error) {
            reject(error)
        }

    })
}

function getChatContacts(sessionId, date=moment().format('YYYY-MM-DD')){
    return new Promise(async(resolve, reject)=>{
        try {
            // const min = 0
            // let  max = 999
            const query = {...statChatQuery, headers: {
                cookie: "hazelcast.sessionId=" + sessionId
            }}
            query.url = query.url + '&beginDate=' + date + '&endDate=' + date
            const count = (await axios(query)).data.count
            console.log('Chats to fetch: ' + count);
            let contacts = []
            for (let min = 0; min < count; min += limit) {
                const max = min + limit - 1
                // console.log({min, max});
                const cQuery = {
                    ...chatQuery,
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
    getDefaultContactData,
    getChatContacts
}

// const {sessionId} = (await authCalabrio()).data
//             const forms = (await axios({
//                 ...c1evalForms,
//                 headers: {
//                     cookie: "hazelcast.sessionId=" + sessionId
//                 }
//             })).data