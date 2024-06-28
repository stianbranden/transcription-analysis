module.exports = function(contact){
    const languages = {
        'SV': 'Swedish',
        'NO': 'Norwegian',
        'DA': 'Danish',
        'FI': 'Finnish'
    }
    return {
        language: languages[contact.metadata.QueueLanguage.value],
        recordingId: contact.id,
        contactId: contact.assocCallId.replaceAll('-', ''),
        callDuration: contact.callDuration
    }
}