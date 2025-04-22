
module.exports = function(platformClient){
    return new Promise (async (resolve, reject)=>{
        try {
            let apiInstance = new platformClient.NotificationsApi();
            const channels = await apiInstance.getNotificationsChannels()
            resolve(channels)
        } catch (error) {
            reject(error)
        }

    })
}