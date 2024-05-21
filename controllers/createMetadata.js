module.exports = function(contact){
    const languages = {
        'SV': 'Swedish',
        'NO': 'Norwegian',
        'DK': 'Danish',
        'FI': 'Finnish'
    }
    return {
        language: languages[contact.metadata.QueueLanguage.value],
        recordingId: contact.id,
        contactId: contact.assocCallId.replaceAll('-', ''),
    }
}