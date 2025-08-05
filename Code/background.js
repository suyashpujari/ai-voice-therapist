chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Voice Therapist Extension installed');
  } else if (details.reason === 'update') {
    console.log('Voice Therapist Extension updated');
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'checkMicrophonePermission') {
    chrome.permissions.contains({
      permissions: ['audioCapture']
    }, (result) => {
      sendResponse({hasPermission: result});
    });
    return true;
  } else if (message.action === 'requestMicrophonePermission') {
    chrome.permissions.request({
      permissions: ['audioCapture']
    }, (granted) => {
      sendResponse({granted: granted});
    });
    return true;
  }
});
