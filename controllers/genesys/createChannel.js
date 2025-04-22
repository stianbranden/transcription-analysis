function createChannel(platformClient){
    return new Promise(async(resolve, reject)=>{
        try {
            const apiInstance = new platformClient.NotificationsApi();
            const channel = await apiInstance.postNotificationsChannels()
            resolve(channel)
        } catch (error) {
            reject(error)
        }
    })
}
module.exports = createChannel