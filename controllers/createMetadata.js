module.exports = function(contact){
    const languages = {
        'SV': 'Swedish',
        'NO': 'Norwegian',
        'DA': 'Danish',
        'FI': 'Finnish'
    }
    const contactTypeToChannel = {
        'CALL': 'Phone',
        'TEXT': 'Chat',
        'EMAIL': 'Email'
    }

    return {
        language: languages[contact.metadata.QueueLanguage.value],
        recordingId: contact.id,
        contactId: contact.assocCallId?.replaceAll('-', '') || contact.metadata["contact-id-key"].value,
        callDuration: contact.callDuration,
        channel: contactTypeToChannel[contact.contactType]
    }
}