// Clears the badge when the user clicks on the extension icon
chrome.action.setBadgeText({ text: "" }); // clears badge on click

//
//*** Sends messages to toggle the conversion to on/of.  
//**  Gets the converted text on Facebook/Twitter

var enabled = false;                             // Enabling conversion
let toggleButton = document.getElementById('toggle_gibb107010021066080661060');
let textAreaBox = document.getElementById('ta');
chrome.storage.local.get('enabled', data => {    // 'enabled' was initialized in background.js
    enabled = data.enabled;
    (enabled) ? toggleButton.textContent = 'Stop "KEset"' : toggleButton.textContent = 'Restart "KEset"';
});
chrome.storage.sync.get('popupText', data => { // Gets the text from facebook/twitter element after being converted
    if (data.popupText != undefined)
        textAreaBox.value = data.popupText;
    textAreaBox.select();                       // Selects the converted text in the popup in order to prepare it for copy-paste by the user
});
toggleButton.addEventListener('click', () => {  // Sends messages to background.js on clicking the popup button
    if (toggleButton.textContent == 'Stop "KEset"') {
        chrome.runtime.sendMessage({ userAction: 'stop' });
        toggleButton.textContent = 'Restart "KEset"'
        chrome.storage.local.set({ 'enabled': false }, function () { });
    }
    else {
        chrome.runtime.sendMessage({ userAction: 'restart' })
        toggleButton.textContent = 'Stop "KEset"';
        chrome.storage.local.set({ 'enabled': true }, function () { });
    }
});
//-----------------------------------------------------------------------------------------
chrome.storage.local.get(['showUpdateInfo'], (result) => {
    if (result.showUpdateInfo) {
        // Show update info only once after the update. The message comes from background.js
        chrome.storage.local.set({ showUpdateInfo: false });
        document.getElementById('ta').placeholder = '';
        document.getElementById('ta').value = 'New in this version:\n\nYou can now select part of the text and correct only that portion 🎯';
    }
});

//----------------------------      old version of conversion for the textarea       ----------------------------

var langFrom = 0;    // Index of the language that we want to convert. The index is the position of of the languages in the list.
var langTo = 0;      // Index of the language to which we want to convert.
var txt = "";        // String of the text to convert/converted 
var langArray = [];  // Array of the positions of selected languages in the list ('Choose languages' list).
var langArrayIndx = 0;
var langArrayNext = 1;
var toCaps = false;   // Indicates if to exchange between capital to regular letters or to convert between languages.

// Old version of the table
// Table of languages letters as they are arranged on standard keyboard
var board = [];
board[0] = " ذ1234567890-=\\دجحخهعغفقثصضشسيبلاتنمكطظزوةىلرؤءئ";      // Arabic //posision 4 at the full list
board[1000] = " ذ1234567890-=\\دجحخهعغفقثصضشسيبلاتنمكطظزوةىلرؤءئ";   // capital Arabic (pseudo)
board[1] = " `1234567890-=\\][poiuytrewqasdfghjkl;'/.,mnbvcxz";      // English //posision 26 at the full list
board[1001] = " `1234567890-=\\][POIUYTREWQASDFGHJKL;'/.,MNBVCXZ";   // capital English
board[2] = " ;1234567890-=\\[]פםןוטארק'/שדגכעיחלךף,.ץתצמנהבסז";     // Hebrew //posision 55 at the full list
board[1002] = " `1234567890-=\\][POIUYTREWQASDFGHJKL;'/.,MNBVCXZ";   // capital Hebrew
board[3] = " ё1234567890-=\\ъхзщшгнекуцйфывапролджэ.юбьтимсчя";      // Russian //posision 101 at the full list
board[1003] = " Ё1234567890-=\\ЪХЗЩШГНЕКУЦЙФЫВАПРОЛДЖЭ.ЮБЬТИМСЧЯ";   // capital Russian
board[4] = " `1234567890-=\\][ποιθυτρες;ασδφγηξκλ΄'/.,μνβωψχζ";      // Greek //posision 50 at the full list
board[1004] = " `1234567890-=\\][ΠΟΙΘΥΤΡΕς;ΑΣΔΦΓΗΞΚΛ΄'/.,ΜΝΒΩΨΧΖ";   // capital Greek 

//---------------------------------------------------------------------------------------------------
$("textarea").on("keydown", function (event) {
  checkKeys(event);
});

chrome.storage.sync.get('langPosArr', function (data) { // To convert languages in text area
    langArray = data.langPosArr;
    if (langArray.length > 1) {
        langFrom = langArray[0];
        langTo = langArray[1];
        langArrayIndx = 0;
        langArrayNext = 1;
    }
});
//   --            --            --            --             --            --
//This is an old version of the code

// Checking which keys were pressed
function checkKeys(event) {
    var ew = event.which;  // The key code
    if (event.ctrlKey && (ew == 188 || ew == 190)) {
        langFrom = langArray[langArrayIndx];
        langTo = langArray[langArrayNext];
        (ew == 190) ? toCaps = true : toCaps = false;
        Invert(event);
    }
}
//   --            --            --            --             --            --
// Converting the wrong text to a correct one
function Invert(event) {
    var etTxt = (event.target.tagName.toUpperCase() == 'INPUT' || event.target.tagName.toUpperCase() == 'TEXTAREA') ? event.target.value : event.target.textContent;
    for (i = 0; i < etTxt.length; i++) // etTxt is the original text
        txt += convert(etTxt[i]);
    // Here the new text shows up. (Input and Textarea have different text attribute then Div)
    (event.target.tagName.toUpperCase() == 'INPUT' || event.target.tagName.toUpperCase() == 'TEXTAREA') ? event.target.value = txt : event.target.textContent = txt;
    txt = "";  // Resetting the buffer after inverting
}
//   --            --            --            --             --            --
// Converting one char
function convert(letter) {
    var indx = getLetterIndex(letter);
    return (board[langTo][indx] || letter);  // When letter doesn't exist in the table , like '!' for example , then return the original letter as is.
}
//   --            --            --            --             --            --
// Return the index of the checked letter on the original-language line (line in table)
function getLetterIndex(lettr) {
    if (toCaps) { // if ctrl + > were pressed
        var capsIndex = correctCaps(lettr);
        return capsIndex;
    }
    else {
        for (j = 0; j < langArray.length; j++) { // Iterating the languages
            var index = 0;
            while ((!(lettr == board[langFrom][index])) && (index < board[langFrom].length)) // Iterating the line of the languge
                index++;
            if (index < board[langFrom].length)
                break;
            langPosArrTraverse(); // traversing 'to' and 'from' languages 
            langFrom = langArray[langArrayIndx];
            langTo = langArray[langArrayNext];
        } // for 
    } // else 
    return index;
}
//   --            --            --            --             --            --
// Traversing to the next pair of 'to' and 'from' languages
function langPosArrTraverse() {
    if (langArrayNext == 0)
        langArrayIndx = -1;
    langArrayIndx++;
    langArrayNext = langArrayIndx + 1;
    if (langArrayIndx == langArray.length - 1) {
        langArrayNext = 0;
    }
}
//   --            --            --            --             --            --
// Exchanging between capital and regular
function correctCaps(ltr) {
    for (k = 0; k < langArray.length; k++) {
        var indxx = 0;
        while ((!((ltr == board[langArray[langArrayIndx]][indxx]) || (ltr == board[langArray[langArrayIndx] + 1000][indxx]))) && (indxx < board[langFrom].length))
            indxx++;                     // The loop is stopped while the letter was found either in the regular line either in the capital line
        if (indxx < board[0].length) {   // If the letter is in the table line
            if (ltr == board[langArray[langArrayIndx] + 1000][indxx]) {// if it is in the capitals
                langFrom = langArray[langArrayIndx] + 1000;            // Change letter from capital- 
                langTo = langArray[langArrayIndx];                     // -to regular
            }
            else {
                langFrom = langArray[langArrayIndx];      // Change letter from regular- 
                langTo = langArray[langArrayIndx] + 1000; // -to capital
            }
            break;
        }
        langPosArrTraverse();                             // Traversing languages until one line contains the letter.
        langFrom = langArray[langArrayIndx];
        langTo = langArray[langArrayNext];
    }
    return indxx;
}









