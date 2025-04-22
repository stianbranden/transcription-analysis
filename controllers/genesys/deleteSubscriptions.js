
module.exports = function(platformClient, channelId){
    return new Promise (async (resolve, reject)=>{
        try {
            let apiInstance = new platformClient.NotificationsApi();
            await apiInstance.deleteNotificationsChannelSubscriptions(channelId)
            resolve('ok')
        } catch (error) {
            reject(error)
        }

    })
}