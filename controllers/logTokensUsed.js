const Usage = require('../models/Usage')
const moment = require('moment')

function createOrUpdateTokenUsage({object, model, usage}, date=moment().format('YYYY-MM-DD')){
    return new Promise ( async (resolve, reject)=>{
        try {
            const tokenUsage = await Usage.findOne({object, model, date})
            if ( tokenUsage ){
                    tokenUsage.usage.promptTokens += usage.promptTokens
                    tokenUsage.usage.completionTokens += usage.completionTokens
                    tokenUsage.usage.totaTtokens += usage.totalTokens
                    tokenUsage.executions++
                    await tokenUsage.save()
            }
            else {
                await new Usage({object, model, date, usage}).save()
            }
            resolve('ok')
        } catch (error) {
            reject(error)
        }
    })
}

module.exports = {createOrUpdateTokenUsage}