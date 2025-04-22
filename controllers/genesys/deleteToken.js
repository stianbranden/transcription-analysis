function deleteToken(platformClient){
    return new Promise(async(resolve, reject)=>{
        try {
            const apiInstance = new platformClient.TokensApi();
            await apiInstance.deleteTokensMe()
            resolve('ok')
        } catch (error) {
            reject(error)
        }
    })
}
module.exports = deleteToken