const _ = require('colors/safe');
const moment = require('moment');
const {NODE_ENV} = process.env; 


const logStd = (text, devOnly = true)=>{
    const time = moment().format('YYYY-MM-DD HH:mm:ss')
    if ( !devOnly || ( NODE_ENV != 'production' ) ){
        console.log(`${_.green(time)} - ${text}`);
    }
}

const logSys = (text, devOnly = false)=>{
    const time = moment().format('YYYY-MM-DD HH:mm:ss')
    if ( !devOnly || ( NODE_ENV != 'production' ) ){
        console.log(`${_.green(time)} - ${_.blue(text)}`);
    }
}

const logErr = (text, devOnly = true)=>{
    const time = moment().format('YYYY-MM-DD HH:mm:ss')
    if ( !devOnly || ( NODE_ENV != 'production' ) ){
        console.log(`${_.yellow(time)} - ${_.red(text)}`);
    }
}

const logTab = (obj, title = 'Table data', devOnly = true)=>{
    const time = moment().format('YYYY-MM-DD HH:mm:ss')
    if ( !devOnly || ( NODE_ENV != 'production' ) ){
        console.log(`${_.green(time)} - ${title}`);
        console.table(obj);
    }
}

module.exports = {
    logStd,
    logSys,
    logErr,
    logTab
}