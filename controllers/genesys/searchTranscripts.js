const moment = require('moment')
function searchTranscripts(platformClient, date=moment().format('YYYY-MM-DD')){
    return new Promise(async(resolve, reject)=>{
        try {
            
            let apiInstance = new platformClient.SpeechTextAnalyticsApi();
            const data = []
            for ( let j = 0; j < 48; j++){
              const {status, pageCount, results} = await iterate(apiInstance, 1, date, j)
              if ( status === 429){
                  console.log('Rate limit exceeded, waiting 60 seconds...')
                  await delay(60000)
                  j--
              }
              else {
                data.push(...results)
                for ( let i = 2; i <= pageCount; i++){
                    const {status, results} = await iterate(apiInstance, i, date, j)
  
                    if (results.length > 0) data.push(...results)
                    else if (status === 429) {
                        console.log('Rate limit exceeded, waiting 60 seconds...')
                        await delay(60000)
                        i--
                    }
                    console.log('page ' + i + ' of ' + pageCount)
                    // console.log(results)
                }
              }
            }

            
            resolve(data)
        } catch (error) {
            reject(error)
        }
    })
}

async function iterate(apiInstance, pageNumber, date, interval){
    const dateObject = moment(date)
    const pageSize = 100
    const minutes = 30 * interval
    const startTime = dateObject.add(minutes, 'minute').format('YYYY-MM-DDTHH:mm:ss') + '.000Z'
    const endTime = dateObject.add(30, 'minute').format('YYYY-MM-DDTHH:mm:ss') + '.000Z'
    // console.log({minutes, startTime, endTime})
    
    let body = {
        pageSize,
        pageNumber,
        "types": [
          "transcripts"
        ],
        "returnFields": [
          "conversationId", "communicationId"
        ],
        "query": [
          {
            "type": "EXACT",
            "fields": [
              "mediaType"
            ],
            "value": "call"
          },
          {
            "type": "DATE_RANGE",
            "fields": [
              "startTime"
            ],
            "startValue": startTime,
            "endValue": endTime,
            "dateFormat": "yyyy-MM-dd'T'HH:mm:ss.SSSX"
          }
        ]
      }
    //   console.log(body) 
    try {
      const data = await apiInstance.postSpeechandtextanalyticsTranscriptsSearch(body)
      // await delay(500)
      return data
      
    } catch (error) {
      console.error('Error in searchTranscripts:', error.status)
      return {status: error.status, results: []}
      // throw new Error(error);
      
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {searchTranscripts}