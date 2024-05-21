const axios = require('axios')

const {C1USERNAME, C1PASSWORD, C1BASEURL} = process.env
// console.log({C1USERNAME, C1PASSWORD, C1BASEURL});
const c1authenticate = {
    method: 'post',
    url: C1BASEURL + 'authorize',
    data: {
        "userId": C1USERNAME,
        "password": C1PASSWORD,
        "language": "en"
    }     
}

function authCalabrio(){
    return new Promise(async (resolve, reject)=>{
        try {
            const auth = await axios(c1authenticate)
            resolve(auth)
        } catch (error) {
            reject(error)
        }

    })
}

module.exports = authCalabrio