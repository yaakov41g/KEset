//
//*** Gets and Sends messages to restore the last original text in optins page textarea
//**  and to stop/restart the possibility of conversion.

var toggleEnable = false;
GetFromStorage();
//----------------------------------------------------------------------------------------------------
async function GetFromStorage() {                // Why we need all this complexity ? See rematk (1)
    toggleEnable = await PromiseStorage_Get();
    //      --------   ---------   ---------      Initializing      ---------   -----------   ---------
    if (toggleEnable == undefined)               // Here we are initializing 'enabled' (on installing) to be used here and in popup.js
        chrome.storage.local.set({ 'enabled': true }, function () { });   // Initializes the status of toggling, before getting it in popup.js
    //      --------   ---------   ---------   -------------------   ---------   -----------   ---------
    return toggleEnable;
    function PromiseStorage_Get() {              //------- inner function
        return new Promise((resolve, reject) => {// Promises that data is retrieved from storage before continue in the code. See remark (1.2)
            chrome.storage.local.get('enabled', data => {
                if (data.enabled != undefined)
                    if (data.enabled)
                        toggleEnable = true
                    else
                        toggleEnable = false
                else
                    toggleEnable = undefined;    // We use this for the initialization of  'enabled'
                resolve(toggleEnable);           // Returns the toggle status only after updating from storage
            });
        })
    } // End of PromiseStorage_Get
}

//----------------------------------------------------------------------------------------------------
// The selected languages and the toggling status of 'Start/Stop' are sent to the contentscript of the activated page
// The original text is sent to options.js when activated
chrome.tabs.onActivated.addListener(async function (tabInfo) {
    chrome.tabs.sendMessage(tabInfo.tabId, { arrgo: 'selectedLanguages', originText: "theOriginalText", toggleStatus: await GetFromStorage() });
});
chrome.tabs.onUpdated.addListener(async function (tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete' || changeInfo.status === 'loading') { // Waits untill the tab is loaded completely. Otherwise 'disableExtension' in contentscript will reinitialize to false
        chrome.tabs.sendMessage(tabId, { toggleStatus: await GetFromStorage() });
    }
});
//----------------------------------------------------------------------------------------------------
// Gets message from popup and sends message to contentscript in order to disable/enable the conversion
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.userAction) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (request.userAction == 'stop') {
                chrome.tabs.sendMessage(tabs[0].id, { toggled: "stop" })
                toggleEnable = false;
            }
            else {
                chrome.tabs.sendMessage(tabs[0].id, { toggled: "restart" })
                toggleEnable = true;
            }
        });
    }
});


//-----------------------------------------  Remarks  --------------------------------------------

//(1) Why we need all this complexity ?  Why not to set toggleEnable to true in the first line ?
//  The reason is that background.js revealed some unexpected inconsistency. In some cases when I moved
//  between tabs it has been reinitialized and set 'toggleEnable = true;' while it(toggleEnable) should be
//  set by storage status.
//  See that I use GetFromStorage() for the initialization of 'enabled' in the storage, and as a message
//  in chrome.tabs.onActivated / chrome.tabs.onUpdated events.




