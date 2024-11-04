function sleepAsync(ms){
    return new Promise (async (resolve, reject)=>{
        setTimeout(_=>{
            resolve('ok')
        }, ms)
    })
}

module.exports = {sleepAsync}