const Queue = require('../../models/Queue.js')

module.exports = function(){
    return new Promise (async (resolve, reject)=>{
        try {
            const queues = await Queue.find(
                // { mainProgram: { $ne: 'na' }, country: { $ne: 'na' } }
            ).lean();
            resolve(queues)
        } catch (error) {
            reject(error)
        }
    })
}