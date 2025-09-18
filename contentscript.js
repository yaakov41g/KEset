///  This contentscript is added to any web page as it is usual in any extension contentscript.
///  In this extension we check an input or any other editable element and correct its gibberish text.


//=========================== common functions for the old and the new versions (HEADER) ============================

///  Additional remarks in the bottom of this version.

//+0,+1  Called by EditAndDisplay and RemoveFromString functions.   Returns the kind of a Div element by its inner pattern
function GetDivPattern(event) {
    if (event.target.lastElementChild)
        if (event.target.lastElementChild.nodeName == 'DIV')
            return "normal div"
        else
            if (event.target.lastElementChild.nodeName == 'P')
                return "linkedin div";
}
//   --            --            --            --             --            --
//+0   Called by EditAndDisplay function.   Constructs the converted text into the html format before displaying (only for LinkedIn div).  See end of remark (2), remark (6)
function BuildLinkedInDivHTML(str) {    //The function is based on 'Bing AI (Copilot)'
    let html = "";
    for (let line of str.split("\n"))
        if (line)
            html += "<p>" + line + "</p>";
        else
            html += "<p><br></p>";
    return html;
}
//   --            --            --            --             --            --
//+0   Called by EditAndDisplay function.  For div of sites except LinkedIn.
function BuildDivHTML(str) { //I need to check why didn't I use here the same way as in BuildLinkedInDivHTML function
    let html = "";
    let arrayOfLines = GetLinesArray(str); // Array of the lines in the converted text
    let arrayOfNewLineSignsSets = GetNewLineSignsSetsArray(str); // Array of '\n' sets in the converted text (after extra \n's had been eliminated). See remark (7)
    for (let i = 0; i < arrayOfLines.length || i < arrayOfNewLineSignsSets.length; i++) {
        if (i < arrayOfLines.length)       // Based on Bing AI
            if (i == 0)                    // Adds the line
                html += arrayOfLines[0]
            else
                html += "<div>" + arrayOfLines[i] + "</div>";
        if (i < arrayOfNewLineSignsSets.length) {           // Then adds the html for new line sign(s) , repeating according to the number of '\n's in the set
            let count = arrayOfNewLineSignsSets[i].length;
            if (count > 1 || count == 1 && !html)
                html += "<div><br></div>".repeat((count > 1) ? count - 1 : 1);// <div><br></div> creates new line within the contenteditable div 
        }
    }
    return html;
}
//   --            --            --            --             --            --
//+1   Called by BuildDivHTML function.  Returns an array of pure lines (without '\n' signs) from the converted text. I got this code from Bing AI
function GetLinesArray(str) {
    let newStr = str.replace(/\n+/g, '|'); // Replaces all the '\n' signs by '|'
    let substrings = newStr.split('|');    // Gets the splitted lines into the array
    if (substrings[substrings.length - 1] == "")
        substrings.pop();
    return substrings;                     // Returns the array
}
//   --            --            --            --             --            --
//+1   Called by BuildDivHTML and by RemoveFromString functions.  Returns an array of sets of successive '\n's from the text. From AI (Bing) , see remark (7)
function GetNewLineSignsSetsArray(str) {
    var array = [];
    array = str.split(/[^\n]+/).filter(substring => substring !== '');
    return array;                          // Array of '\n' series
}
//   --            --            --            --             --            --
//+0   Called by SetGetBuffersU and by ConvertText functions.  Removes the extra \n's from the text. Based on Bing AI. See remark (2)
function RemoveFromString(event, str) {
    let arrayOfLines = GetLinesArray(str); // Divides the text into an array of regular lines (witout '\n')
    let arrayOfNewLineSignsSets = (GetDivPattern(event) == "linkedin div") ? RemoveLinkedInDivExtraNewLineSigns(GetNewLineSignsSetsArray(str)) : RemoveNormalDivExtraNewLineSigns(GetNewLineSignsSetsArray(str)); // The array of successive '\n' sets after eliminating the extra \n's.  Remark (7)
    let newArray = [];
    for (let i = 0; i < arrayOfLines.length || i < arrayOfNewLineSignsSets.length; i++) {
        if (i < arrayOfLines.length)
            newArray.push(arrayOfLines[i]);            // Add one array
        if (i < arrayOfNewLineSignsSets.length)
            newArray.push(arrayOfNewLineSignsSets[i]); // Add '\n' set
    }
    return newArray.join('');              // Returns string, (because join() returns string out of the array) which contains the text lines with the new lines by the teality(one '\n' for one 'enter') 
}
//   --            --            --            --             --            --
//+1   Called by RemoveFromString function.   Algorithm to remove the extra '\n' signs in a set of '\n's in editable Div in LinkedIn. See remark(8 - same principle)
function RemoveLinkedInDivExtraNewLineSigns(aray) {    // aray contains the sets of the '\n'
    for (let i = 0; i < aray.length; i++) {
        let count = Math.floor((aray[i].length - 5) / 3) + 2;
        aray[i] = '\n'.repeat(count);
    }
    return aray;
}
//   --            --            --            --             --            --
//+1   Called by RemoveFromString function.   Algorithm to remove the extra '\n' signs in a set of '\n's in text of editable Div. See remark(8)
function RemoveNormalDivExtraNewLineSigns(aray) {
    for (let i = 0; i < aray.length; i++) {
        let count = 0;
        if ((aray[i].length == 1) || (aray[i].length == 2))
            count = 1
        else
            count = Math.floor(aray[i].length / 2) + 1;
        aray[i] = '\n'.repeat(count);
    }
    return aray;
}
//   --            --            --            --             --            --
//+0   Called by EditAndDisplay function.   From Bing AI , mimics clicking on END key in order to set the caret on the end of text
function SetCaretPosition(el) {
    var range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
}
//                     Up to this point, the comon functions of the old and the new versions
//=================================================================================================================

///////////////////////////////////////////  set the extension version  ///////////////////////////////////////////
var oldVersion = false;
//   Called by GetVersion function. Gets the version of the extension as selected by the user in the Options page
//   --            --            --            --             --            --
function PromiseGetVersionFromStorage() {         
    return new Promise((resolve, reject) => {// Promises that data is retrieved from storage before continue in the code. See remark (1.2)
        chrome.storage.sync.get('version', data => {
            if (data.version)
                if (data.version == 'old')
                    oldVersion = true
                else
                    oldVersion = false
            else
                oldVersion = undefined;    // We use this for the initialization of  'enabled'
            resolve(oldVersion);           // Returns the toggle status only after updating from storage
        });
    })
} 
//   --            --            --            --             --            --
//   Starting point
GetVersion();
async function GetVersion() {
    oldVersion = await PromiseGetVersionFromStorage();
    ExecKeset();
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//+0   Called by GetVersion function. Starting point of the contentscript
function ExecKeset() {
    if (oldVersion) {
        //////////////////////////////////// OLD VERSIN - HEADER /////////////////////////////////////////////
        GetSelectedLanguages();                                     // On the page loading
        function GetSelectedLanguages() {                           // Here we get the array of languages we want to deal with.
            chrome.storage.sync.get('langPosArr', function (data) { // 'chrome.storage.sync.set()' is in options.js.  Getting the data of the selected languages from the browser storage
                languagesArray = data.langPosArr;
                if (languagesArray != undefined && languagesArray.length > 1) {//@@@@@
                    fromLanguage = languagesArray[0];               // Pay attention that this setting isn't synchronized with the text. That is , the text can be Hebrew but fromLanguage is 1 (English position in the list)
                    toLanguage = languagesArray[1];
                    traverser = 0;
                }
            });
        }
        //   --            --            --            --             --            --
        chrome.runtime.onMessage.addListener(function (request) {   // Gets messages from/through background file(service_worker) 
            if (request.arrgo == 'selectedLanguages')               // Messages that languages were selected from the list on the Options page. Comes from background.js
                GetSelectedLanguages()                                 
            else
                if (request.toggled == 'stop')                      // Message via background.js from popup.js; on clicking the Stop/Restart toggle button in the extension popup window 
                    disableExtension = true
                else
                    if (request.toggled == 'restart')
                        disableExtension = false
                    else
                        if (request.toggleStatus)                   // Message from background.js; on page activation/updating. Gets the status of Stop/Restart toggle button in the extension-icon popup window. (Initialized in popup.js on clicking on the button)
                            disableExtension = false
                        else
                            disableExtension = true;
        });
        chrome.storage.sync.get('enabled', function (data) {         // On the page loading.  (by the way, "chrome.storage.sync.set({'enabled'...)" is in popup.js)
            if (data.enabled)
                disableExtension = true
            else
                disableExtension = false;
        });
        //================================= Variables and events-handlers mapping ====================================
        var disableExtension = false; // A flag to indicate activation/deactivation of the conversion process
        var fromHebrew = false;    // Indicates to toggle capital letters to hebrew , not to english
        var languagesArray = [];   // Array of selected-languages positions in the languages list(same positions as in the languages board table)
        var toLanguage = -1;       // The index of the target language in languagesArray, points to the next language within the selected languages, See remark (3)
        var fromLanguage = -1;     // The index of the original language, the language which we try to convert from.
        var originalText = "";     // The text we need to convert
        var storedText = [];       // The editted text to be stored for the text-area-element in Options page
        var records = [];          // Records of text that are stored in chrome.storage without the serial numbers
        var oldText = "";          // Used for comparing to newText. Mainly to check if the new converted char was involved with an arabic spare alif (joined 'ا') 
        var newText = "";          // The converted text
        var traverser = 0;         // Iterator of languages. Iterates over the selected languages pointed by languagesArray cells
        var additionSentenceForAlert = ""; // Appeared when user forgot to select languages after installing the extension
        var ctrlOrAlt = false;         // A flag to indicate that the char is not a visible one, to prevent inserting it to specialCharsPositions array (I mean to '<','>' and '|' + Ctrl)
        var isJoinedAlif = false;      // A flag to sign the current char as the spare 'ا' of the char-doubled 'لا' (chars لا are a compound of ا+ل)
        var div = false;               // Indicates that the (focused) element is a kind of div (not textarea) element
        var textArea = false;          // Indicates that the (focused) element is a kind of textarea  
        var linkedinDiv = false;       // Indicates if the (focused) element is of kind Linkedin site div
        var enforceUniformity = false; // Indicate that Ctrl + '|' were pressed to enforce uniform of language in the textbox
        var NoChangeMade = false;      // A flag to show up the little hovering description-window 
        var hoverDiv = null;           // The hovering window. It appears when the user try to convert when the relevant language was not selected

        //------------------------------------------ Events-handlers mapping -----------------------------------------

        const intervalID = setInterval(myCallback, 2000); // We need to renew the elements' listener for cases that new element was loaded after the page loading (like search-elements that appear after clicking on a button)
        function myCallback() {        // Listeners to handle the user presses and clicks. We need the 'off' operation to prevent multiple listeners while the function  myCallback() is called on every 2000 milisecond
            $("input,textarea").off("keydown.gibb107010021066080661060"); // We need to add a namespace in order to avoid abolishing other event listeners on the web. See remark (01)
            $("input,textarea").on("keydown.gibb107010021066080661060", function (event) { SetBuffersAndFlagsD(event); ConversionOptionsD(event); });
            $("input,textarea").off("keyup.gibb107010021066080661060");
            $("input,textarea").on("keyup.gibb107010021066080661060", function (event) { SetGetBuffersU(event); }); // Why I use keyup ? See remark (0)
            $('div[contenteditable = "true"]').on("click.gibb107010021066080661060", function (event) { setTimeout(function () { event.target.focus(); }, 0); });  // Enables to keep focus on div editable element(and its included)
            $("div").off("keydown.gibb107010021066080661060");
            $("div[contenteditable='true']").on("keydown.gibb107010021066080661060", function (event) { SetBuffersAndFlagsD(event); ConversionOptionsD(event); });
            $("div").off("keyup.gibb107010021066080661060");
            $('div[contenteditable="true"]').on("keyup.gibb107010021066080661060", function (event) { SetGetBuffersU(event); });
            $(document.body).on("click.gibb107010021066080661060", function () { $(hoverDiv).remove(); }); // Removing the hovering window by click. It appears when the user try to convert when the relevant language was not selected
        }
        //---------------------------------------- Getting data/messages  ---------------------------------
        //Languages Chars Table.  Of a STANDARD keyboard
        var board = []; // Keys of a sequencial order on the keyboard, for each of the 5 languages
        // The 'base' array contains keycodes in the same order of the letters on the languages strings (board[0] etc.)
        board["base"] = [32, 192, 49, 50, 51, 52, 53, 54, 55, 56, 57, 48, 189, 187, 220, 221, 219, 80, 79, 73, 85, 89, 84, 82, 69, 87, 81, 65, 83, 68, 70, 71, 72, 74, 75, 76, 186, 222, 191, 190, 188, 77, 78, 66, 86, 67, 88, 90];
        board[0] = " ذ1234567890-=\\دجحخهعغفقثصضشسيبلاتنمكطظزوةىلرؤءئ";      // Arabic   The Visual Studio editor mixes the real order of the chars.  // The right '\' is escaped by the left one
        board[1] = " `1234567890-=\\][poiuytrewqasdfghjkl;'/.,mnbvcxz";      // English 
        board[2] = " ;1234567890-=\\[]פםןוטארק'/שדגכעיחלךף,.ץתצמנהבסז";     // Hebrew  
        board[3] = " ё1234567890-=\\ъхзщшгнекуцйфывапролджэ.юбьтимсчя";      // Russian 
        board[4] = " `1234567890-=\\][ποιθυτρες;ασδφγηξκλ΄'/.,μνβωψχζ";      // Greek

        //////////////////////////////////////   OLD VERSIN - BODY  ////////////////////////////////////////////////////

        //*0   See explanations for the sign in the bottom of the version 1 code
        //  KeyDown event handler.  Sets and initializes data attributes , sets boolean indicators 
        function SetBuffersAndFlagsD(event) {                     // D represent keyDown handler
            (event.target.tagName.toUpperCase() == 'INPUT' || event.target.tagName.toUpperCase() == 'TEXTAREA') ? div = false : div = true; // 'div' is a flag to indicate if the focused (target) element is a kind of div
            (event.target.tagName.toUpperCase() == 'TEXTAREA') ? textArea = true : textArea = false;
            originalText = (div) ? event.target.innerText : event.target.value;   // Div is indicator of the element kind
            if (!$(event.target).data('lamAndAlifPositions'))     // 'lamAndAlifPositions' is an array of the positions of arabic compound 'لا'(on key 'B') in the text, this 'لا' equivalent to 'ا'+'ل'(lam + alif in Arabic) see remark (4) and the position of this   
                $(event.target).data('lamAndAlifPositions', []);  // Sets the element-attached array-data on the first only keydown 
            if (!$(event.target).data('specialCharsPositions'))   // Array that contains items of 2 parts: the positions in the text of the chars that are common to some languages , like . , / ; etc, when each of the languages has them in different keys , see remark (1) and the second part is the positions of these chars keys on the board (by the order of board[] array/string). See what is going on in function SetGetBuffersU
                $(event.target).data('specialCharsPositions', []);
            (event.ctrlKey || event.altKey) ? ctrlOrAlt = true : ctrlOrAlt = false;
        }
        //   --            --            --            --             --            --
        //*0  KeyDown event handler.  Mainly to navigate by the converting key
        function ConversionOptionsD(event) {
            var which = event.keyCode;
            originalText = (div) ? event.target.innerText : event.target.value;   // Div is indicator of a div kind element 
            //     -----     ------    -------    short-cuts options    ------    ------     ------
            if (event.ctrlKey && (which == 188 || which == 190 || which == 220) && !disableExtension) {// If ctrl + '<' or '>' or '|' were pressed
                if (!languagesArray || languagesArray.length < 2) {//  If not selected 2 languages in Options page
                    if (!languagesArray)
                        additionSentenceForAlert = "(In next time of wrong script, the conversion will be better.)" // If the user chose less than 2 languages  , if he types letters that are common  , then , when he choses the more one , the correction might be not perfect
                    alert("You should select 2 languages at least from Options page list.\nRight click on the plug-in icon , click \'Extention Options\', then select from list.\n" + additionSentenceForAlert);
                    additionSentenceForAlert = "";
                    return;
                }
                if (which == 190)                 // If Ctrl+ > were pressed. KeyCode of '>' key equal mostly to 190
                    ToggleCaps(event)
                else {
                    if (which == 220)             // keyCode of '|' key
                        enforceUniformity = true; // If there are two different languages mixed in the text (e.g. hello 'םרךג' , the conversion will be 'hello world' instead of 'יקךךם world')
                    ConvertText(event);           // Called if which is 188 or 220
                }
            }
        }
        //   --            --            --            --             --            --
        //+0   KeyUp event handler. The code here deals with the operations that arn't suitted for keydown event. See remark (0). The main actions are registering in the positions buffers or resetting them when a cher inserted not orderly or deleted. See remark (12)
        function SetGetBuffersU(event) {
            originalText = (div) ? event.target.innerText : event.target.value; // This is not suitted for keydown event handler because we don't have the last char of the text in keydown handler. 
            oldText = newText;
            newText = originalText;               // We use newText here in order to reset the positions buffers in case of inserting a char not by the order
            var specialCharsPositions = $(event.target).data('specialCharsPositions');
            var lamAndAlifPositions = $(event.target).data('lamAndAlifPositions');
            var which = event.keyCode;
            if ((languagesArray) && (SpecialCharsInclude(board['base'].indexOf(which))) && !ctrlOrAlt && (specialCharsPositions.length < 10000)) { // If the char position is included in the special chars positions array
                specialCharsPositions.push({ "positiononkeyboard": board['base'].indexOf(which), "positionintext": (div) ? /*See remark (2)*/ RemoveFromString(event, originalText).length - 1 : originalText.length - 1 }); // Pushes positiononkeyboard and the positionintext. Used to determine the language of the pressed key, see remark(1)
            }
            if ((event.keyCode == 66) && !ctrlOrAlt && (lamAndAlifPositions.length < 10000))
                if (['ا', 'آ', 'أ', 'إ'].indexOf(originalText[originalText.length - 1]) != -1)  // If the inputted key is 'لا' (same place as 'B') so the redundant 'ا' of 'لا' is now the char checked 
                    lamAndAlifPositions.push((div) ? RemoveFromString(event, originalText).length - 2 : originalText.length - 2) // We insert position of the previous joined 'ل' into lamAndAlifPositions. We need to eliminate 2 from the length because length-1 is the place of the joined/redundant 'ا' and the position of the 'ل' is length-2 indeed
                else
                    lamAndAlifPositions.push((div) ? RemoveFromString(event, originalText).length - 1 : originalText.length - 1); // The position in text of 'b', 'נ', 'и' or any other char on '66' key
            $(event.target).data('lamAndAlifPositions', lamAndAlifPositions);       // Storing the array in the attached data attribute of the element
            $(event.target).data('specialCharsPositions', specialCharsPositions);
            //     -----     ------    -------    buffers reset    ------    ------     ------
            if (!ctrlOrAlt) 
                if (newText.length != oldText.length && GetLastUniqSubString(newText) == GetLastUniqSubString(oldText)// If a letter was added but the end substring remains the same , which means that the user inserted a letter within the existing text, not in the ent of it
                    || newText.length == oldText.length && newText != oldText && oldText.length > 0 && oldText[oldText.length - 1] != '\n') {     // Or if some of the text removed or changed 
                    $(event.target).data('lamAndAlifPositions', []);                 // We reset these buffers to prevent confusion in the converted text
                    $(event.target).data('specialCharsPositions', []);
                }
            function SpecialCharsInclude(postiononboard) {//------------ inner function.  Detects Chars like ' , . ; /  that are common to some language lines. See remark (1)
                var specialChars = [14, 15, 16, 25, 26, 36, 37, 38, 39, 40]          // The positions on board of the special/common chars
                return (specialChars.indexOf(postiononboard) > -1) ? true : false;
            }
        }
        //   --            --            --            --             --            --
        //*1   Called by ConversionOptionsD function.  Toggles between capital(big) letters and normal letters
        function ToggleCaps(event) {
            var positionInBoard = -1;
            if (div)                                                       // Only on div, not on textarea or input element
                originalText = RemoveFromString(event, originalText);      // Removing extra new line chars (\n'). See remark (2)
            newText = originalText;
            //    -----     ------   converting from hebrew to english  (see remark 2.1)   ------     ------
            if ((Array.from(originalText).findIndex(char => "אבגדהוזחטיכלמנסעפצקרשתךםןףץ".indexOf(char) > -1) > -1)) { // If we have one hebrew char(or more) in the text then toggle to caps and set 'fromHebrew' to true
                newText = "";
                fromHebrew = true;           // Indicates that the current text is hebrew , so when toggling back from capital it will turn back to hebrew, not to regular english chars. If the current text is arabic this will not make problem
                for (var i = 0; i < originalText.length; i++) {            // Converts to English
                    positionInBoard = board[2].indexOf(originalText[i].toLowerCase());
                    HebrewEnglishCaps(1);    // Convert one char from hebrew to english and add it to newText
                }
            }
            else//-----     ------          converting back from english to hebrew         ------     ------
                if (originalText == originalText.toUpperCase() && (fromHebrew)) {// If the text is english capital that toggled from hebrew
                    newText = "";
                    for (var i = 0; i < originalText.length; i++) {         // Converts to English 
                        positionInBoard = board[1].indexOf(originalText[i].toLowerCase());
                        HebrewEnglishCaps(2);// From english to hebrew
                    }
                }
                else                         // If the text is not capital                       
                    fromHebrew = false;
            //    -----     ------     ------    toggle lower/upper case   ------     ------     ------
            newText = (newText === newText.toUpperCase()) ? newText.toLowerCase() : newText.toUpperCase() // Toggle the text to/from capitals; 
            EditAndDisplay(event);           // Edits the converted text and displays it
            function HebrewEnglishCaps(language) {//------------------ inner function.  Converts to english/hebrew
                if (positionInBoard > -1)    // If the source language is found
                    newText += board[language].charAt(positionInBoard)
                else {                       // If the checked char is not of english/hebrew or signs like '!','@' etc.
                    newText += originalText[i];                   // The original char is left as it is
                //    if (board[0].indexOf(originalText[i]) > -1) // If the char is arabic
                //        fromHebrew = false;
                }
            }
        }
        //   --            --            --            --             --            --
        //*1   Called by ConversionOptionsD function. The main loop to converts the original text
        function ConvertText(event) {
            var lamAndAlifPositions = $(event.target).data('lamAndAlifPositions');
            var specialCharsPositions = $(event.target).data('specialCharsPositions');
            if (div)                                                 // Only on div, on textarea or input elementwe don't remove the extra '\n' from the text
                originalText = RemoveFromString(event, originalText);// Removing extra new-line chars (\n'). See remark (2)
            newText = "";
            for (var i = 0; i < originalText.length; i++) {          // Looping on the text , char by char
                oldText = newText;                                   // We use oldText for AdjustArraysPositions function 
                newText += ConvertOneChar(originalText[i], i, lamAndAlifPositions, specialCharsPositions);// Builds the string of converted chars
                if (newText != "")
                    AdjustArraysPositions(event);  // Checks if the arabic redundent 'ا' was automaticaly added or was removed. If so, we need to reupdate the positions of the further positions in the positions buffers. See remark (5) 
            }
            EditAndDisplay(event);                                   // Edits the converted text and displays it
            LanguagesTraverser();                                    // Here this helps to roll on the conversion when enforceUniformity is on.  See example in remark (10)
        }
        //   --            --            --            --             --            --
        //+0   Called by ConvertText function. Re-setting positions arrays after conversion the char of 66 keycode ('لا') from/to arabic.  See remark (5) 
        function AdjustArraysPositions(event) {
            var updatedLamAndAlifPositions = $(event.target).data('lamAndAlifPositions');
            var updatedSpecialCharsPositions = $(event.target).data('specialCharsPositions');
            if (newText.length - oldText.length > 1) {          // If within the convertion loop iteration, 2 chars were added that is lam + alif ('لا') of arabic
                updatedSpecialCharsPositions = updatedSpecialCharsPositions.filter(specialPos => specialPos.positionintext <= newText.length - 1 - 1).concat(updatedSpecialCharsPositions.filter(specialPos => specialPos.positionintext > newText.length - 1 - 1).map(x => ({ ...x, positionintext: x.positionintext + 1 }))); // Filters(creates) array of the positions till the -
                updatedLamAndAlifPositions = updatedLamAndAlifPositions.filter(lamAlifPos => lamAlifPos <= newText.length - 1 - 1).concat(updatedLamAndAlifPositions.filter(lamAlifPos => lamAlifPos > newText.length - 1 - 1).map(lamAlifPos => lamAlifPos + 1));                             // - current position of the converted text , then filters the rest of the array , then -
            }                                                                                                                                                                                                                                                                            // - increases the positionintext in that part and then concatenates(joins) the two parts anew
            else
                if (newText.length == oldText.length) {         // If no char was added because the current char was 'ا' and it was removed in this iteration (see in CaseOfLamAndAlif function) then we updates the remain buffer cells after the the cell which holds the position of the current treated char, to a one place back
                    updatedSpecialCharsPositions = updatedSpecialCharsPositions.filter(specialPos => specialPos.positionintext <= newText.length - 1).concat(updatedSpecialCharsPositions.filter(specialPos => specialPos.positionintext > newText.length - 1).map(x => ({ ...x, positionintext: x.positionintext - 1 })));
                    updatedLamAndAlifPositions = updatedLamAndAlifPositions.filter(lamAlifPos => lamAlifPos <= newText.length - 1).concat(updatedLamAndAlifPositions.filter(lamAlifPos => lamAlifPos > newText.length - 1).map(lamAlifPos => lamAlifPos - 1));
                }
            $(event.target).data('lamAndAlifPositions', updatedLamAndAlifPositions);
            $(event.target).data('specialCharsPositions', updatedSpecialCharsPositions);
        }
        //   --            --            --            --             --            --
        //+0   Called by ConvertText function.  Directs the char to be converted in the suittable function
        function ConvertOneChar(char, positionintext, lamandalifpositions, specialcharspositions) {
            var positionOnBoard = -1;
            var specialsArrayIndex = specialcharspositions.findIndex(pos => pos.positionintext == positionintext);
            if (specialsArrayIndex > -1) // If the char is within the array, that is , it's a special char
                positionOnBoard = specialcharspositions[specialsArrayIndex].positiononkeyboard;
            if (positionOnBoard > -1)
                return ConvertSpecialChar(char, positionintext, positionOnBoard);
            else                         // If char is regular , that is , not of special chars
                return ConvertRegularChar(char, positionintext, lamandalifpositions);
        }
        //   --            --            --            --             --            --
        //+1   Called by ConvertOneChar function.  Seeks the language of the char , aided by specialCharsPositions array 
        function ConvertSpecialChar(char, positionintext, positiononboard) { // See remark (1) why we need to treat special chars
            var positionLower = -1;              // The (lowercase)char position in the checked language line. We also convert the upper cases after manipulating to lower case
            var convertedChar = char;
            var j = 0;
            positionLower = board[fromLanguage].indexOf(char.toLowerCase()); // Tries if the checked language contains the char
            if ((positionLower != positiononboard))
                if (!enforceUniformity)          // If not  ctrl + '|' were pressed. See above in ConversionOptionsD function
                    do {                         // Tries again by traversing the languages
                        j++;
                        LanguagesTraverser();    // Sets the next pair of from/to_languages
                        positionLower = board[fromLanguage].indexOf(char.toLowerCase()); // Tries the language
                        if (positionLower == positiononboard)
                            convertedChar = SetUpperOrLowerCase(char, positionintext, positionLower, true)
                        else                     // Try again next language
                            convertedChar = char;// (We need this only to prevent "undefined" returned in unexpected case)
                    } // Continue to seek the language that includes the char in the same position as it is registered in specialcharspositions array
                    while ((j < languagesArray.length + 1) && (positionLower != positiononboard))
                else                            // If the user pressed ctrl+| and the char was not in the language of the first try, we don't continue to try another language
                    convertedChar = char; // SetUpperOrLowerCase(char, positionintext, -1, true);
            else                                // If the char was found in the first try
                convertedChar = SetUpperOrLowerCase(char, positionintext, positionLower, true);
            return convertedChar;
        }
        //   --            --            --            --             --            --
        //+1   Called by ConvertOneChar function.  Seeks the language of the char
        function ConvertRegularChar(char, positionintext, lamandalifpositions) {
            var j = 0;
            var positionLower = -1;
            var convertedChar = char;
            positionLower = board[fromLanguage].indexOf(char.toLowerCase());
            if ((positionLower == -1) && !enforceUniformity) // If the checked language isn't including the char even when it is lowered , and the user didn't use Ctrl+'|' in order to enforce uniformity. See above in ConversionOptionsD function
                do {                             // While we didn't find the char's language
                    j++;
                    LanguagesTraverser();        // Set the next pair of from-to languages
                    positionLower = board[fromLanguage].indexOf(char.toLowerCase());
                    if (positionLower != -1)     // If original language of the char is found
                        convertedChar = SetUpperOrLowerCase(char, positionintext, positionLower, false, lamandalifpositions); // converts and formates the char
                    else                         // If the char isn't included not as normal(lowerCase) nor as capital form in the current checked language
                        convertedChar = char;
                }
                while ((j < languagesArray.length + 1) && (convertedChar == char)) // If converted char is same as the original, that is, the language was not found and the char was not converted
            else                                 // If the char was found in the fromLanguage line
                convertedChar = SetUpperOrLowerCase(char, positionintext, positionLower, false, lamandalifpositions); // In case of enforceUniformity the function will return the original char
            return convertedChar;
        }
        //   --            --            --            --             --            --
        //+2   Called by ConvertSpecialChar, ConvertRegularChar functions.  Sets the format of the char while converting it to the destined language
        function SetUpperOrLowerCase(char, positionintext, positioninlanguage, isspecialchar, lamandalifpositions) {
            var convertedChar = char;
            if (positioninlanguage != -1) // If fromLanguage is found , else convertedChar remains equal to char
                convertedChar = SetTheNewChar();
            return convertedChar;
            function SetTheNewChar() {   //------ inner function.   Checks if arabic is involved  
                if (!isspecialchar && (fromLanguage == 0 || toLanguage == 0))
                    convertedChar = CaseOfLamAndAlif(char, positionintext, lamandalifpositions);
                else                // If arabic isn't involved
                    convertedChar = SetFormat();
                return convertedChar;
                function SetFormat() {  //------ inner of inner function. Formates the case of the converted char (capital/regular)
                    if (char != char.toLowerCase())  // If the char is capital
                        convertedChar = board[toLanguage].charAt(positioninlanguage).toUpperCase()
                    else                             // If it is not capital
                        convertedChar = board[toLanguage].charAt(positioninlanguage); // Converts to the destination language
                    return convertedChar;
                }
            }
        }
        //   --            --            --            --             --            --
        //+2   Called by ConvertSpecialChar, ConvertRegularChar functions.  Sets the next to-from languages indexes in the selected-languages array(languagesArray) which contains the positions of the languages in the list (see remark (3))
        function LanguagesTraverser() {              // Moving the to-from pairs circularilly
            fromLanguage = languagesArray[traverser];// The source(original) language
            if (traverser < languagesArray.length - 1)
                traverser++
            else
                traverser = 0;
            toLanguage = languagesArray[traverser];  // The destination language (to which to convert to)
        }
        //   --            --            --            --             --            --
        //+3   Called by SetUpperOrLowerCase function.   Adjusting the occuring of a char of 66 key code like لا, b, נ etc. See remark (4)
        function CaseOfLamAndAlif(char, positionintext, lamandalifpositions) {
            var positionInLamAndAlifArray = lamandalifpositions.indexOf(positionintext);
            var convertedChar = char;
            char = char.toLowerCase();
            if (toLanguage == 0)                                // If we try to convert TO arabic
                if (positionInLamAndAlifArray > -1) {// If the position of the char is registered in lamAndAlifPositions array (like b etc.)
                    convertedChar = 'ل' + 'ا'        // Same as 'لا'. 
                }
                else                                            // If the char isn't of the 66 keycode key(like 'B' ,  'נ',  'и' etc.)
                    convertedChar = board[0][board[fromLanguage].indexOf(char)] // board[arabic][the position of the char in the source language line]
            //      -----     ------    -------      to convert from arabic         ------    ------     ------
            else
                if (positionInLamAndAlifArray > -1) {// Key 'لا' (of sixty six keycode) was pressed in arabic so char='ل'
                    isJoinedAlif = true;                        // Indicates that there is a redundant 'ا' (alif) following the current ('ل')
                    convertedChar = board[toLanguage][43];      // The key of keycode 66 (like 'B' etc.) is in the position 43 on the board[language line]
                }
                else {
                    if (['ا', 'آ', 'أ', 'إ'].indexOf(char) > -1)// If the char is kind of 'alif'
                        if (isJoinedAlif)
                            convertedChar = ""                  // If the alif is redundant of 'لا' then we remove it
                        else                                    // If it is one of the 'alif's , but was written by kecode 72 key (like 'H' etc.) so it was written deliberately(in intention)
                            convertedChar = board[toLanguage][32]; // The key of keycode 72-keycode (like 'ا','H' etc.) is in the position 32 on the board line, so we converts from arabic 'ا' to 'toLanguage' compatible char
                    else                                           // If char is not the registered 'ل' nor 'ا'
                        if (board[0].indexOf(char) > -1)
                            convertedChar = board[toLanguage][board[0].indexOf(char)] // To the 'toLanguage' char that exists on the equal place of the source arabic char
                        else                         // not really needed
                            convertedChar = char;    
                    isJoinedAlif = false;            // Resets isJoinedAlif
                }
            return convertedChar;
        }
        //   --            --            --            --             --            --
        //(***) Called by ConvertText and ToggleCaps.  Formates the whole converted text, displays it and alerts about unsucceeded conversion
        async function EditAndDisplay(event) {
            //     -----     ------    ------              miscellaneous              ------    ------     ------
            var hostName = window.location.hostname;
            if (hoverDiv)                     // If The hover_window div element exists
                hoverDiv.remove();            // Removing(deleting)  the hovering window.
            hoverDiv = null;
            enforceUniformity = false;
            chrome.storage.sync.set({ popupText: "" }, function () { });       // Reseting data of the textarea in the Popup window(the icon popup)
            chrome.storage.sync.set({ records: await SetOriginalTextsForStoring() }, function () { }); // Storing data for the textarea in the Options page. See remark (1.1)
            if (newText == originalText)
                NoChangeMade = true           // No change was made in text after trying to convert by all selected languages 
            else
                NoChangeMade = false;
            //     -----     ------          if text was not converted || Facebook/Twitter        ------     ------
            if (/^(www\.)?facebook\.com$/.test(hostName) || /^(www\.)?twitter\.com$/.test(hostName) || NoChangeMade) { 
                if (/^(www\.)?facebook\.com$/.test(hostName) || /^(www\.)?twitter\.com$/.test(hostName)) {
                    window.getSelection().selectAllChildren(event.target);
                    chrome.storage.sync.set({ popupText: newText }, function () { // Stores the converted text from facebook for the textarea in the Popup window
                    });
                }
                SetHoverWindow(event);      // Creates and displays hovering message-window and leaves the text as it is. It appears when NoChangeMade and on Facebook/Twitter
            }
            //     -----     ------    -------      if text was converted displays it      ------    ------     ------
            else {                        
                if ((Array.from(newText).findIndex(char => "אבגדהוזחטיכלמנסעפצקרשתךםןףץابتثجحخدذرزسشصضطظعغفقكلمنهوي".indexOf(char) > -1) > -1))  // Sets the direction of the text for hebrew/arabic (rtl) and for others (ltr)
                    $(event.target).css("direction", "rtl");
                else
                    $(event.target).css("direction", "ltr");
                NoChangeMade = false;
                //     -----     ------    -------    formates and  displays the corrected text    ------    ------     ------
                (div) ? event.target.innerHTML = (GetDivPattern(event) == "linkedin div") ? BuildLinkedInDivHTML(newText) : BuildDivHTML(newText) : event.target.value = newText; // Formates and displays the coverted text. This line is a nested ternary operator
                // Sets the place of the caret(the writing-point marker) to the end of the text
                (div) ? SetCaretPosition(event.target) : event.target.setSelectionRange(newText.length, newText.length);
            }
            async function SetOriginalTextsForStoring() {//--------------- inner function. Builds the records set to be displayed in Options page textarea
                records = await PromiseStorage_Get();                  // Awaiting for the records data to be retrieved from chrome storage
                if (records.length >= 3)
                    records.shift();
                records.push(originalText + '\n');
                return records;
                function PromiseStorage_Get() {//------------------------ inner of inner function
                    return new Promise((resolve, reject) => {         // Promises that data is retrieved from storage before continue in the code. See remark (1.2)
                        chrome.storage.sync.get('records', function (data) {
                            if (!data.records)
                                records = [];
                            else
                                records = Object.values(data.records);// Converts data.records to an array
                            resolve(records);                         // Returns the records only after updating from storage
                        });
                    })
                } 
            }
        } //*** End point of the conversion proccedure chain ***/
        //   --            --            --            --             --            --
        //+0    Called  by EditAndDisplay function.   Returns the last unique substring of the text. For example: for 'abc' returns 'c' , 'abbbcb' returns 'b', 'abcbbbbb' returns 'bbbbb', 'سلاملالالالا' returns 'لالالالا'
        function GetLastUniqSubString(s) {
            if (!s || s.length === 0)
                return "";
            let lastUniqSubString = "";
            if (s[s.length - 1] == 'ا' && s[s.length - 2] == 'ل') // On case 'لا' (pair joined arabic letters that gets out from 66 keycode key)
                for (let i = s.length - 1; i > 0; i -= 2)
                    if (s[i] == 'ا' && s[i - 1] == 'ل')
                        lastUniqSubString += 'لا';
                    else
                        return lastUniqSubString;
            else {                                                // If any other case
                lastUniqSubString = s[s.length - 1];
                for (let i = s.length - 1; i > 0; i--)
                    if (s[i] == s[i - 1])
                        lastUniqSubString += s[i];
                    else
                        return lastUniqSubString;
            }
            return lastUniqSubString;
        }
        //   --            --            --            --             --            --
        //+0   Called by EditAndDisplay function.  Sets and manipulates a hovering message-window. Displays it only while hovering the focused element
        function SetHoverWindow(event) {
            if (!hoverDiv) {      // If hoverDiv is null (hoverDiv is of type Object-element) , then create the element
                if (NoChangeMade)
                    hoverDiv = $("<div style = 'direction:ltr;'>Make sure that you selected the correct languages.<br>Also you should use the keys as recommended.<br>If you use 'Ctrl'+'|' try several times.<span style='font - size: 10px;line-height: 10px;  white - space: pre - wrap;float: right;padding-top:12px;'> [click to remove]</span></div>").addClass("hoveringWindow_gibb107010021066080661060"); // The css of the hovering Window is in hoverWindow.css
                else
                    hoverDiv = $("<div style = 'direction:ltr;'>On-spot correction is blocked on Facebook/Twitter.<br>You can get it on the popup (Click the plug-in icon).<br><span style='font - size: 10px;line-height: 10px;  white - space: pre - wrap;float: right;padding-top:12px;'> [click to remove]</span></div>").addClass("hoveringWindowF_gibb107010021066080661060");
                $(hoverDiv).css({ "font-size": "16px" });
            }
            $(document.body).append(hoverDiv);
            $(event.target).on("mousemove", function () { $(hoverDiv).css({ display: "block" }); }); // Displays when hovering the element
            $(event.target).on("mousemove", function () { $(hoverDiv).css({ display: "none" }); }); // Hides when the mouse is out of the element
        }// On clicking anywhere on the page , the hovering window is removed. See last line in function myCallback() in the header of this page
    }// Old version

    /////////////////////////////////////////////    Remarks version 1   //////////////////////////////////////////

//(0) Why keyup ? Why we don't use keydown event only ?
// This is because the keydown handler is performed before the char is displayed, so we can't use a line
// like: "originalText = (div) ? event.target.innerText : event.target.value;" because the char isn't appeared yet in the element.
// For example: If we type 'world', originalText will be 'worl' if the line was contained in a keyDOWN handler.

//(01) For example : In LinkedIn there is a shortcut 'shift+@' to tag a member profile. Because we use here '..).off("keydown...'
// this will abolish the handler of that shortcut. The namespace (gibb107010021066080661060) which is randomally chosen by me, restricts the
// influence of the off() to the handler in this contentscript only.

//(02) If the user erased some part from the text it may corrupt the conversion as the positions in these arrays
// become irrelevant, so we should reset(empty) the arrays. The same is when the user added some text (somewhere in the middle of the text).

//(1) What is the problem with common chars like "'" , "." , ";" etc. ?
// We cann't decide from which language to convert. Example : if the user writes "'ישא" instead of "what" , when
// we begin to convert the first letter , that is "'" , it can be english or hebrew letter , so "'ישא"
// might be converted to ",hat" instead of "what" or the word ",usv" to "ודה' " instead of "תודה".
// To solve this we register the positions of the key on the board and the char in the text.
// In ',usv', the comma which is in place 0 of the text, its key place on the board is 40, so the char is an English comma,
// as you can find out in board[1]-English line. Now it will be converted from English to 'ת' and not from Hebrew to the English apostrophe(').

//(1.1) We are storing the originalText records(the last three texts that the user have converted) in the browser storage for the case the user needs it. Then the records appear
// in the multyline textbox (textarea) in Options page.  See documentation in options.js.

//(1.2) 'chrome.storage.sync.get()' is Asynchronous so it doesn't block the next
//  code from continue, we need to promise that we continue in the code only after the get() is done.

//(2) Why to remove the extra '\n' (new line signs) ?
//  In linkedin , for example, for the first 'enter' in the 'div' element text , the text gets 2 '\n', for 2 enters : 5 '\n' , for 3 enters :- 8 '\n' , for 4 :- 11 and so on.
//  Another phenomenon is , that if I try to put the converted text into the element, every single '\n' becomes 3 '\n's.
//  It was easier to remove the extra new lines('\n') , then rebuild the converted text with new html to get the adequate format in return.
//  Why, at all to rebuild the html format ? Because I wanted to keep the original number of lines and the space (\n)
//  between them instead of getting one long line of the text.

//(2.1) In order to convert hebrew to capital english , we should convert it firstly to simple english
//  letters then , in the end of this function, we set it toUpperCase().

//(3) For example : languagesArray[0]=2, languagesArray[1]=3. Assume that fromLanguage now
//  is 3 (Russian),and it is pointed in the second place in the array ([1] of the array).
//  - Russian is Language no' 3  in the language-list in Options Page and in 'board' array. -
//  toLanguage is 2 (Hebrew) in our example, and it is pointed by [0] position of languagesArray array. After traversing there will be an exchanging between fromLanguage anf toLanguage.

//(4) In arabic there is a problem with the char 'لا' ('B' key). 'لا' is in fact two joined chars : 'ل' and 'ا' (like L and silent A in English). There are also
//  seperated 'ل'(G key) and 'ا'(H key). If I want to write 'baboon' but wrote mistakingly 'لاشلاخخى' , there are
//  two 'لا's in the word. Now it can be converted to 'baboon' but also to 'ghaghoon'. ( Lam and Alif (ل and ا) are
//  joined automatingly whenever they are appeared in follow (lam, Then alif) ). To solve this we use the buffer lamAndAlifPositions with the positions of 'لا's(keycode 66).

//(5) If we write 'baboon', the positions of the two 'b' are registered as 0 and 2 in lamAndAlifPositions array in SetGetBuffersU function.
//  When it is converted to 'لاشلاخخى' the positions now will be 0 and 3 (the positions of first and second 'ل's in 'لاشلاخخى'.
//  Pay attention that 'لا' are two chars - 'ل' + 'ا' joined). We need to update all the positions in lamAndAlifPositions
//  and in specialCharsPositions arrays from the position of the now added/eliminated 'ا' untill the end of the buffer.

//(5.1)  Example: In wrong text "hb,b]" there are two 'b' , so lamAndAlifPositions contains now the position 1 in index 0
//  and 3 in index 1. When we convert to arabic the first 'b' becomes 'لا'. Now we cut by filtering the sub array 'specialCharsPositions[0]
////  then filtering the rest of the array , then updating the positions  by map() , that is , the second index is now contains 4 instead of 3, then we join
//  two parts by concat(). After conversion we get the word "الاولاد"('the boys') with the updated lamAndAlifPositions. Pay attantion: arabic read from right to left, and 'لا' is two chars.

//(5.2) In function CaseOfLamAndAlif we set the flag isJoinedAlif differ between the 'ا' of lam + alif ('لا') and
//  the seperated 'ا' of keycode 71 (key 'H' in english , 'י' in hebrew etc.). We need to use Code66CharsInclude() for non arabic chars of 66 keycode.

//(6) It is common in sites that the text elements are of type editable 'Div', that contains inner elements.

//(7) For example : if newText="Hello\n\n\n\n\nBig\nAnd\nVery nice\n\nWorld". The array will contain these
//  sets(of string) : ['\n\n\n\n\n','\n','\n','\n\n'].
//  As well, GetLinesArray(str) returns the lines : ['Hello','Big','And','Very nice','World']

//(8) Let's assume the (original) text is : "Hello\n\n\n\n\nBig\n\nWorld" , that is 5 new lines after 'Hello'
//  and 2 new lines after 'Big'. See in remark(2) that editable Div created extra '\n' signs.
//  In this function we eliminate these extra to the real written "Hello\n\nBig\nWorld" (two Enters after Hello and one Enter after Big).

//(9) 'toUpperCase() makes no effect on hebrew/arabic chars , so if the char isn't of hebrew it must be of capital.

//(10)  When 'enforceUniformity' is true (by pressing Ctrl+'|') , if by chance the source language doesn't fit
//  the char , the text will remain as it is.  By this specific traversing , if the user makes some trials , the text will be changed.

//(12) If the user added a letter within the text, that is, not at the end of the text as usuall, he corrupted by this the
//  coordination between the positions buffers (specialCharsPositions,lamAndAlifPositions) and the text,
//  which makes the converted text confused.





//////////  Legend For The Symbols  ///////////
//  '*'  means this function is a link(joint) in the main process. The number joined is the serial number
//       of this function in the process. The function is ended by calling the next function in the chain of functions till the end function/process.
//  '+'  means this function is a auxiliary(helper) function.  The number joined is the hierarchy level.
//       The lowest function in the branch is ended with no calling.
// '***' End function of the process/chain.

//  For more explanation try to contact me via my LinkedIn profile : https://www.linkedin.com/in/yaakov-whise-1172322b/ , I'll try my best.

//***** Local readMe  ////////
// This application corrects gibberish. For example : typing 'akuo' in English instead of 'שלום' Hebrew.
// Before using, we need to select the languages which we work with , at least 2 languages , from the list on the Options Page.
// To correct the gibberish , press ctrl+ '<' or ctrl+ '|'(of 188 or 220 keyCode). To toggle between capital to normal letters press ctrl+ '>' (190 keyCode).
// See more details in OPTIONS.html file.

// Link to this extension on Microsoft add-ons  :
// https://microsoftedge.microsoft.com/addons/detail/ddahpfaemgfcpjkcaeieidbigomonbhm
// To learn extensions you can go here : https://developer.chrome.com/docs/extensions
        // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
        // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=  Version II  -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
        // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=

    else {
        ////////////////////////////////////////////////  "HEADER" ////////////////////////////////////////////////////

        //---------------------------------------- Getting data/messages  ---------------------------------

        chrome.runtime.onMessage.addListener(function (request) {   
            if (request.arrgo == 'selectedLanguages')               // A message that languages were selected from the list on the Options page. Comes from background.js
                GetSelectedLanguages();
            if (request.toggled == 'stop')                          // Message via background.js from options.js ; on page activation. When 'Stop' button in the extension-icon popup had been clicked
                disableExtension = true
            else
                if (request.toggled == 'restart')
                    disableExtension = false
                else
                    if (request.toggleStatus)                       // A message via background.js from options.js ; on clicking the extension popup button
                        disableExtension = false
                    else
                        disableExtension = true;
        });
        GetSelectedLanguages();                                     // On the page loading
        function GetSelectedLanguages() {                           // Here we get the array of languages we want to convert between them.
            chrome.storage.sync.get('langPosArr', function (data) { // ('chrome.storage.sync.set()' is in options.js.)  Getting the data of the selected languages from the browser storage
                languagesArray = data.langPosArr;
                if (languagesArray != undefined) {
                    fromLanguage = languagesArray[0];               // A pointer to the language that is examined now to be that of the originalText
                    toLanguage = languagesArray[1];                 // A pointer to the destination language (the converted)
                    traverser = 0;                                  // An iterator for the selected languages list
                }
            });
        }
        chrome.storage.sync.get('enabled', function (data) {         // On the page loading.  ("chrome.storage.sync.set('enabled'...)" is in options.js)
            if (data.enabled)
                disableExtension = true
            else
                disableExtension = false;
        });
        //================================= Variables and events-handlers mapping ====================================
        var additionSentenceForAlert = "";
        var commonChars = "";           // Common chars in two or more of the selected language. Mainly the capital letters which are commn to english and hebrew
        var fromLanguage = -1;          // The index of the language which we check if it suitted to the text
        var hostName = window.location.hostname;
        var iterationsCounter = 0;      // Counter of the visible chars till now.
        var languagesArray = [];        // An array that contains the selected-languages positions in the languages list(same as in the languages board table)
        var mostCharsTraverser = 0;     // An iterator of the languages that are most often found in the text
        var newText = "";               // The new converted text
        var newHtmlText = "";           // The html format of the corrected text
        var oldText = "";               // Used for comparing to newText in order to update the chars buffers (when converting to/from Arabic)
        var originalText = "";          // The text we need to convert
        var records = [];               // Records of text that are stored in chrome.storage without the serial numbers '1.', '2.', '3.'
        var toLanguage = -1;            // The index of the target language (the language we  want to convert to)
        var traverser = 0;              // Iterator of languages in the selected languages array
        var which = -1;                 // event.keyCode
        // Flags/indicators
        var canvas = null;              // Represents the demo checkbox in the hover window
        var checked = true;             // Used as toggle status for the demo checkbox in the general hover window
        var disableExtension = false;   // A flag to indicate activation/deactivation of the conversion process(the plug-in's activity)
        var div = false;                // Indicates that the (focused) element is a kind of div (not textarea) element
        var enforceUniformity = false;  // Indicates that Ctrl + '|' were pressed to enforce uniform of language in the text (makes the whole text of one language)
        var facebookTwitter = /^(www\.)?facebook\.com$/.test(hostName) || /^(www\.)?x\.com$/.test(hostName) || /^(www\.)?twitter\.com$/.test(hostName) // Indicates that the current page is a facebook or a twitter page(true) or not (false)
        var fromHebrew = false;         // A flag to convert from capital letters to hebrew , not to english
        var hoverDiv = null;            // The hovering window (a div element). It appears when the user tries to convert when the relevant language was not selected
        var hoverDivFace_Twit = null;   // A hovering window (a div element) that appears when the user try to convert on FaceBook or Twitter/X
        //var hoverChk = null;            //@@@@@ maybe not needed
        var noChangeMade = false;       // A flag to set up the little hovering description-window when converting was failed
        var textArea = false;           // Indicates that the (focused) element is a kind of text area
        var wasSelected = false;        // Indicates that some of the text was selected then erased.  In this case the chars buffers are resetted

        
        //------------------------------------------ Events-handlers mapping --------------------------------------
        var testChars = [];

        setInterval(myCallback, 2000);      // This is the srart point. We need to renew the elements' listener - 
        // - for cases that a new element was loaded after the page had been loaded (like search-elements that appear after clicking on a button)
        function myCallback() {      // Listeners to handle the user presses and clicks. We need the 'off' operation to prevent multiple listeners while the function myCallback() is called on every 1000 milisecond

            $("input,textarea").off("keydown.gibb107010021066080661060");// Why I didn't use keyup ? Because if we click two keys then releasing the second before the first one. It causes disorder in the chars buffers.
            $("input,textarea").on("keydown.gibb107010021066080661060", function (event) { InitializeBuffersAndFlags(event); HandleBuffers(event); ConversionOptions(event); });
            $("div").off("keydown.gibb107010021066080661060");
            $('div[contenteditable]').on("keydown.gibb107010021066080661060", function (event) { InitializeBuffersAndFlags(event); HandleBuffers(event); ConversionOptions(event); });
            $('body[contenteditable]').off("click.gibb107010021066080661060");
            $('body[contenteditable]').on("click.gibb107010021066080661060", function (event) { setTimeout(function () { event.target.focus(); }, 0); });// Enables to keep focus on editable div element(and its inner elements)
            $('input,textarea').off("keyup.gibb107010021066080661060"); //@@@@@ maybe not necessary
            $('input,textarea').on("keyup.gibb107010021066080661060", function () { wasSelected = window.getSelection().toString().length; });           // Determines if text was selected by the keys Shift + left or right arrow  
            $('div[contenteditable]').on("keyup.gibb107010021066080661060", function () { wasSelected = window.getSelection().toString().length });      // If length is 0 then wasSelected is false
            $(window).on("mouseup.gibb107010021066080661060", function () { wasSelected = window.getSelection().toString().length; });                   // Determines if text was selected by the mouse  
            $('body').on("click.gibb107010021066080661060", function (event) { if (event.target.type !== "checkbox") { $(hoverDiv).remove(); $(hoverDivFace_Twit).remove(); } }); // Removing the hovering window by a click. Unless the checkbox was clicked, in this case it will remain so the user can uncheck it
        }        

        //-------------------------------------        Languages table        -------------------------------------

        //Languages Chars Table.  Of a STANDARD keyboard
        var board = []; // Keys of a sequential snaky order on the keyboard,  same order for each of the 5 languages
        var SHFT = [];  // Shifted keys on the same order
        // The 'base' array contains keycodes in the same order of the languages strings
        board["base"] = [32, 192, 49, 50, 51, 52, 53, 54, 55, 56, 57, 48, 189, 187, 220, 221, 219, 80, 79, 73, 85, 89, 84, 82, 69, 87, 81, 65, 83, 68, 70, 71, 72, 74, 75, 76, 186, 222, 191, 190, 188, 77, 78, 66, 86, 67, 88, 90];
        board[0] = " ذ1234567890-=\\دجحخهعغفقثصضشسيبلاتنمكطظزوةىلرؤءئ"; SHFT[0] = ' ّ!@#$%^&*)(_+|><؛×÷‘إلًٌٍَُِ][لأـ،/:"؟.,’آل{}ْ~';   // Arabic  //posision 4 at the full list //1. The visual studio editor mixes the real order of some chars. //2. The right '\' is escaped by the left one
        board[1] = " `1234567890-=\\][poiuytrewqasdfghjkl;'/.,mnbvcxz"; SHFT[1] = ' ~!@#$%^&*)(_+|}{POIUYTREWQASDFGHJKL:"?><MNBVCXZ'; // English //posision 26 at the full list
        board[2] = " ;1234567890-=\\[]פםןוטארק'/שדגכעיחלךף,.ץתצמנהבסז"; SHFT[2] = ' ~!@#$%^&*)(_+|}{POIUYTREWQASDFGHJKL:"?<>MNBVCXZ'; // Hebrew  //posision 55 at the full list
        board[3] = " ё1234567890-=\\ъхзщшгнекуцйфывапролджэ.юбьтимсчя"; SHFT[3] = ' Ё!"№;%:?*)(_+/ЪХЗЩШГНЕКУЦЙФЫВАПРОЛДЖЭ,ЮБЬТИМСЧЯ'; // Russian //posision 101 at the full list
        board[4] = " `1234567890-=\\][ποιθυτρες;ασδφγηξκλ΄'/.,μνβωψχζ"; SHFT[4] = ' ~!@#$%^&*)(_+|}{ΠΟΙΘΥΤΡΕ΅:ΑΣΔΦΓΗΞΚΛ¨"?><ΜΝΒΩΨΧΖ';  // Greek

        ///////////////////////////////////////////////  "BODY"  ////////////////////////////////////////////////////

        //*0   See explanations for the signs in the bottom of the page
        //  KeyDown event handler.  Sets and initializes the data-attributes of the text element ; sets boolean indicators
        function InitializeBuffersAndFlags(event) {
            (event.target.tagName.toUpperCase() == 'DIV') ? div = true : div = false;
            (event.target.tagName.toUpperCase() == 'TEXTAREA') ? textArea = true : textArea = false;
            if ($(event.target).data('isNewLineChar') === undefined)
                $(event.target).data('isNewLineChar', false);// Indicates that the char is '\n'
            if (!$(event.target).data('lamAlifBuffer'))      // 1.'lamAlifBuffer' is an array of the positions of arabic 'لا'(keys of 66, 71, 84 keyCode) in the text, and some more details like in charsBuffer. // 2. 'لا' equivalents to 'ا' + 'ل'(lam + alif in Arabic) see remark (4)
                $(event.target).data('lamAlifBuffer', []);   // Sets the data-attribute only on the first keydown (initialization)
            if (!$(event.target).data('charsBuffer'))        
                $(event.target).data('charsBuffer', []);     // Array of objects that contain the inserted char position on the keyboard (according the order of the languages table - board[]), the char , the position of the char in the text , the shifting state of the char
            if (!$(event.target).data('previousText'))       
                $(event.target).data('previousText', "");    // The text that appeared on the screen before inserting the current treated char
            if (!$(event.target).data('currentText'))        
                $(event.target).data('currentText', "");     // The current text on the screen (in fact it represents the last char that was shown, previousText is previous to it)
            if (!$(event.target).data('corruptedText'))       
                $(event.target).data('corruptedText', "");   // The text after inserting/deleting a char unorderly, that is, not in the end of the text
            if (!$(event.target).data('backText'))    
                $(event.target).data('backText', "");        // The text before inserting the unorderly char. By ctrl+B we get it back in the element and we can convert it, if needed it, without disorders in the text. See remark (03)
            if (!$(event.target).data('LamAlifObject'))      
                $(event.target).data('LamAlifObject', {});   // The details of the inserted char of 'lamalif' (one of the keys of keyCode of 66, 71 or 84). The details are positiononkeyboard, key , positionintext and shifted
            if (!$(event.target).data('regularCharObject'))  
                $(event.target).data('regularCharObject', {});// The details of the inserted regular char. The details are positiononkeyboard, key , positionintext and shifted
            if (!$(event.target).data('backLamAlifBuffer'))       
                $(event.target).data('backLamAlifBuffer', []);
            if (!$(event.target).data('backCharsBuffer'))      
                $(event.target).data('backCharsBuffer', []);  // The status of charsBuffer before corruption. See remark (03)
            if (!$(event.target).data('backTextCorruptTextGap'))
                $(event.target).data('backTextCorruptTextGap', 0);// The length of the gap between the corrupted and correct texts lengthes 
            if (!$(event.target).data('badTextCounter'))      
                $(event.target).data('badTextCounter', 0);    // Counter of the corrupted chars. Counts the chars that were inserted unorderly 
            if ($(event.target).data('popped') === undefined)  
                $(event.target).data('popped', false);        // Flag to show that the last char was popped (popped, not pushed) from the charsBuffer , so we need to pop it from backbuffer too.(This is in case it was legal deleting). Else , if it was pushed there , we need to push it in the backbuffer too  
            if ($(event.target).data('backTextOn') === undefined) 
                $(event.target).data('backTextOn', false);    // Indicates that ctrl+b was operated
            if ($(event.target).data('backFirstTrigger') === undefined) 
                $(event.target).data('backFirstTrigger', true);// Flag to restrict the backText to be the text before the first corrupted char was inserted
            if ($(event.target).data('corruptedRegularChar') === undefined)
                $(event.target).data('corruptedRegularChar', true);// Indicates that the corruption is made by ilegal visible char, not by Enter
        }
        //   --            --            --            --             --            --
        //*0   KeyDown event handler. Inserts data to lamAlifBuffer and charsBuffer or resets them.  See remark (07)
        function HandleBuffers(event) { 
            // test  test  test ##################################################
            if (event.keyCode == 27) {// esc keycode=27
                for (var i = 0; i < testChars.length; i++)
                    console.log('char  ' + testChars[i].char + '   ' + testChars[i].code);
                testChars = [];
            }
            else
                testChars.push({ 'char': event.key, 'code': event.keyCode });
            //#####################################################################
            const isPasswordField = /password/i.test(event.target.name) || /password/i.test(event.target.id) || /password/i.test(event.target.type); //Preventing the conversion process on password boxes to prevent malicious interference
            if (!isPasswordField) {
                var ctrlOrAlt = event.ctrlKey || event.altKey;             //Indicates that ctrl or alt was pressed (with other key) // Need to check if need to store as data attribute
                var isNewLineChar = $(event.target).data('isNewLineChar');
                var charsBuffer = $(event.target).data('charsBuffer');
                var lamAlifBuffer = $(event.target).data('lamAlifBuffer');
                var previousText = $(event.target).data('previousText');   // It is in fact , the previous of the previous text
                var currentText = $(event.target).data('currentText');     // In fact, it is the previous text, the text that is vissible now, not including the char that was pressed now which envoked this handler. See remark (02)
             // These data-variables are connected with the ctrl+b option to retrieve the text and buffers before the incorrect(unorderly) typing. It make the code more comlicated. So if you need to review only the basic code you can ignore them
                var regularCharObject = $(event.target).data('regularCharObject');
                var LamAlifObject = $(event.target).data('LamAlifObject');
                var backCharsBuffer = $(event.target).data('backCharsBuffer');
                var backLamAlifBuffer = $(event.target).data('backLamAlifBuffer');
                var backFirstTrigger = $(event.target).data('backFirstTrigger');
                var backTextOn = $(event.target).data('backTextOn');
                var popped = $(event.target).data('popped');
                var badTextCounter = $(event.target).data('badTextCounter');
                var corruptedText = $(event.target).data('corruptedText');
                var backText = $(event.target).data('backText');
                var backTextCorruptTextGap = $(event.target).data('backTextCorruptTextGap');
                //     -----     ------   ------  ------     defines variables     ------  ------    ------     ------
                originalText = (div) ? event.target.innerText : event.target.value;  // textarea element has not attribute of 'innerText'
                previousText = currentText; 
                currentText = originalText;
                var originalTextLength = (div) ? (originalText[originalText.length - 1] == '\n') ? originalText.length - 1 : originalText.length : originalText.length;  // In div , when we press char after '\n', the char takes the position of the '\n', so we need to define the place of the current pressed char in the text as text length - 1// need to check a case that interior Enter was erased (and leaves one '\n' in the end
                var offset = (div) ? GetSelectedText(event).anchorOffset : event.target.selectionStart; // Start position of the selected text (if there is any)
                if (wasSelected)                                // If now some text is selected (blued)
                    originalTextLength = offset;                // Now , on typing a char, the selected text is erased and the char takes the place of the selected text offset
                var isEmptyRegularCharObject = JSON.stringify(regularCharObject) === '{}';  // Checks if the object is empty
                var isEmptyLamAlifObject = JSON.stringify(LamAlifObject) === '{}';
                if (originalText == "" || originalText == '\n'){// This is for case user posted a comment on LinkedIn , then he wants to post another one in the same (re-emptied) text box
                    charsBuffer = [];
                    lamAlifBuffer = [];
                    backCharsBuffer = [];
                    backLamAlifBuffer = [];
                    backText = "";
                }
                //     -----     ------     resets the positions buffers in case of unorder typing     ------     ------
                if (!LegalCharChange()) {        // If the char was inserted/deleted unorderly in the middle, not as a last char of the text. Pay attention that we check the previous key, not the current. This goes throughout the whole checking. We can't check the position of the current char because it is still unseen during this event handler. It will be seen only on finishing the handler
                    corruptedText = currentText; // Needed for ConversionOptions function , to eliminate the last corrupted part from the originalText
                    badTextCounter += currentText.length - previousText.length; // It can be a difference of 1 or 2 chars (in case of لا)
                    if (backFirstTrigger ) {     // Backs the correct (prvevious) text before it was corrupted by the current text
                        backText = previousText; // The correct text
                        backFirstTrigger = false;
                        backTextOn = false;      // Indicates that we didn't still use ctrl+B for this corruption in text
                    }
                    if (!backTextOn)             // After executing backText (ctrl+B) , there is no a corrupted text , so the gap is 0
                        backTextCorruptTextGap = corruptedText.length - backText.length;// The gap to eliminate when pushing the new correct char to buffers, then we can concat backtext with the new text
                    lamAlifBuffer = [];          // We erase these buffers content to prevent confusion in the converted text. remark (03) .  But then we add the last added char
                    charsBuffer = [];
                }
                //     -----     -- updates the positions back buffers after inserting/deleting a char correctly --    ------     ------
                else {                               // Pay attention that we work on last visible char. We cannot treat the current pressed char because it is not shown in this handler yet
                    if (!isEmptyRegularCharObject) { //'regular' = not a kind of lamAlif
                        if (!isEmptyLamAlifObject) { // I can take that inner 'if' out of 'if (!isEmptyRegularCharObject)'
                            if (!popped)             // If the last char was legel and its details were added to the the positions buffer, now we need to add it to the back buffers
                                backLamAlifBuffer.push(LamAlifObject) // Adds the new char's details to the back buffer 
                            else                     // If it was orderly deleted from the end of the text('legal')
                                backLamAlifBuffer.pop();
                        }
                        if (!popped)
                            backCharsBuffer.push(regularCharObject)
                        else
                            backCharsBuffer.pop()
                    }
                }
                //     -----     ------    -------    ------    buffers filling   ------    ------    ------     ------
                if (languagesArray && !ctrlOrAlt && board['base'].indexOf(event.keyCode) > -1 && charsBuffer.length < 10000) { // Inserts to the buffers only data of a visible char
                    if (backFirstTrigger) {  // Before the corrupt
                        backCharsBuffer = charsBuffer.slice();    // Saves previous buffers before the (may be) corruptive text adding (or deleting). We update the main buffers by these back buffers in ConversionOptions() in case of performing the back text procedure (ctrl+b)
                        backLamAlifBuffer = lamAlifBuffer.slice();// We should use slice() otherwise these two buffer names become referencial and point to the same one
                    }
                    if ([66, 71, 84].indexOf(event.keyCode) > -1) {
                        lamAlifBuffer.push({ // We insert the position on board, of the char on the key of 66/71/84 key code, like 'ل', into lamAlifBuffer, plus the char, plus its position of in the text, plus the Shift state of the char
                            "positiononkeyboard": board['base'].indexOf(event.keyCode), "key": event.key, "positionintext": originalTextLength, "shifted": event.shiftKey
                        });
                        LamAlifObject = { "positiononkeyboard": board['base'].indexOf(event.keyCode), "key": event.key, "positionintext": originalTextLength - backTextCorruptTextGap, "shifted": event.shiftKey }; // We save this object to the next performing of this handler, when, if it was a legal char, we add it (or delete) to the back buffer
                    }
                    else
                        LamAlifObject = {};
                    charsBuffer.push({      // See remark (1) why we register these char details
                        "positiononkeyboard": board['base'].indexOf(event.keyCode), "key": event.key, "positionintext": originalTextLength, "shifted": event.shiftKey
                    });
                    regularCharObject = { "positiononkeyboard": board['base'].indexOf(event.keyCode), "key": event.key, "positionintext": originalTextLength - backTextCorruptTextGap, "shifted": event.shiftKey }; // Same like as LamAlifObject
                    isNewLineChar = false;
                }
                else {                     // If no visible char was inserted to the main buffers (Chars- and LamAlif- buffers) we reset the objects so we will not push/pop nothing to/from the back buffers
                    LamAlifObject = {};
                    regularCharObject = {};
                    if (event.keyCode == 13)// Indicates 'Enter' char for the algorythm in LegalCharChange() in order not to pop/push it to the buffers
                        isNewLineChar = true;
                }
                //     -----     ------    -------    storing buffers and variables   ------    ------     ------
                $(event.target).data('lamAlifBuffer', lamAlifBuffer); 
                $(event.target).data('charsBuffer', charsBuffer); 
                $(event.target).data('LamAlifObject', LamAlifObject);         
                $(event.target).data('regularCharObject', regularCharObject); 
                $(event.target).data('backLamAlifBuffer', backLamAlifBuffer); 
                $(event.target).data('backCharsBuffer', backCharsBuffer);
                $(event.target).data('popped', popped); 
                $(event.target).data('previousText', previousText);                     
                $(event.target).data('currentText', currentText);                       
                $(event.target).data('backFirstTrigger', backFirstTrigger);                       
                $(event.target).data('backTextOn', backTextOn);                   
                $(event.target).data('corruptedText', corruptedText);
                $(event.target).data('backText', backText);  
                $(event.target).data('backTextCorruptTextGap', backTextCorruptTextGap);  
                $(event.target).data('badTextCounter', badTextCounter);
                $(event.target).data('goodTextLength', originalText.length - corruptedText.length);  
                $(event.target).data('isNewLineChar', isNewLineChar);

                function LegalCharChange() {  // ------------- inner function.   Checks if the change in text was legal. Also pops the last char object if it was erased legaly
                    //     -----     ------    ------     defines variables     ------    ------     ------
                    var tempPreviousText = "";
                    var tempCurrentText = "";
                    var previousTextEnd0 = "";
                    var currentTextEnd0 = ""; // The last char of the text (it can be also lam+alif pair - 'لا' if they are joind ). e.g. in 'odd' currentTextEnd0 will be 'd'
                    var previousTextEnd = GetLastUniqSubString(previousText, lamAlifBuffer);  // Last unique substring of previousText. e.g.: previousTextEnd in 'off' is 'ff'
                    var currentTextEnd = GetLastUniqSubString(currentText, lamAlifBuffer);    // Anothe example: in 'جلالا' currentTextEnd will be لالا if these are attached lamAlif, if the alif was created separately, that is, by clicking the arabic char 'ا'(same key of 'H'') than currentTextEnd will be the last alif 'ا'
                    if (previousTextEnd.length)
                        previousTextEnd0 = (previousTextEnd[0] == 'ل' && ['ا', 'آ', 'أ', 'إ'].indexOf(previousTextEnd[1]) > -1) ? 'لا' : previousTextEnd[0]; // If previousTextEnd is of 'لا's, than End0 is 'لا' which is 'ل' + joined 'ا' else it equals to the last char ( like 'ا' in 'ا ه ل ا' or 'e' in 'knee')
                    if (currentTextEnd.length)
                        currentTextEnd0 = (currentTextEnd[0] == 'ل' && ['ا', 'آ', 'أ', 'إ'].indexOf(currentTextEnd[1]) > -1) ? 'لا' : currentTextEnd[0];
                    //     -----     ------    -----    adapts special cases    -----    ------     ------
                    if (!textArea) {
                        tempPreviousText = previousText;//We should save the previousText too. Let's take the case of b, enter, b, enter, another enter between the two b's: Because the End0 of the previous text is '\n', The if(currentTextEnd0 == '\n' &&... gives false, so currentText remains as is : b\n\n\nb\n\n but previousText is b\nb\n and not b\nb\n\n ! because in the previous keydown event previous get the current that is  b\nb\n (see in the beginning of the handler). This makes  backTextCorruptTextGap not accurate. Try and see
                        tempCurrentText = currentText;
                        if (previousText == '\n')       // Occures in empty div when ctrl+shift is clicked. To prevent return false in this case
                            previousText = '';
                        if (currentTextEnd0 == '\n' && currentTextEnd.length > 1 && previousTextEnd0 != '\n') // In case of a, enter , b , delete b, any click, gives a\n\n , the previous is a\nb, so the length are equal and it will not pop the charsBuffer in the buffers push/pop procedure. In this procedure we check if current < previous, then we pop the buffer. Therefore we should slice tha last '\n' to make currentText shorter then previousText
                            currentText = currentText.slice(0, currentText.length - 1);
                    } 
                    //     -----     ------    -- deletes from the buffer on deleting a char from the text --    ------     ------
                    var charsBufferEnd = null;    // Last object of charsBuffer
                    var charsBufferEnd_pokb = -1; // position on keyboard of the last inserted char
                    if (charsBuffer.length) {
                        charsBufferEnd = charsBuffer[charsBuffer.length - 1]; 
                        charsBufferEnd_pokb = charsBufferEnd.positiononkeyboard;
                    }
                    popped = false;           // Indicator that tells if a char was deleted from the text and in parallel the last object was popped from the buffer
                    if (lamAlifBuffer.length)
                        var joinedAlif = lamAlifBuffer[lamAlifBuffer.length - 1].positionintext == currentText.length - 1 && ['لا', 'لآ', 'لأ', 'لإ'].indexOf(previousTextEnd0) > -1;   // Checks if the char is a joined alif. If it follows a lam ('ل') that is registered in the buffer , then it is a joined/additional alif. We need the second condition because lamAlif buffer registers all chars of 66/71/84 keyCods like b,t,א,ע etc. In such cases there is no joined alif here. Therefore we should detect the last char was kind of لا. In such case the erased char was the joined alif
                    // We delete now the last buffer's object before entering the new object. If the previous clicking was of deleting(backspace or delete keys), now we can see it and pop the last object 
                    if (currentText.length < previousText.length && !isNewLineChar && previousTextEnd0 != '\n' || currentText == '\n') { // On deletting a char // "|| currentText =='\n'" is for case that user clicked ctrl + shift which creates a '\n'. If we delelte one char, the '\n' still remains, so currentText.length = 1 same as previousText.length (try: ctrl+shift , נ , delete , ctrl). (Indeed, this condition is not very important)
                        //if (GetDivPattern(event) == "linkedin div"/* && (!isNewLineChar)*/ // (Remmember that the buffers don't hold Enters) In LinkedIn if we delete '\n' or the first char in the line, it happens before the handler is performed, so in case of: b,enter, b. delete
                        //    || (GetDivPattern(event) == "normal div" || GetDivPattern(event) == "" || textArea)/* && previousTextEnd0 != '\n'*/) { // We should remember that currentTextEnd0 is the char that was erased but still appears. We erase it now from the buffer if it is not equal to '\n'
                        if ([22, 31, 43].indexOf(charsBufferEnd_pokb) > -1 && !joinedAlif) {  // If the positiononkeyboard of the erased char is one of these: 22, 31, 43 (the places of B,G,T kes) but the text in this position isn't 'ل' joined by 'ا'. This is important because joined 'ا' is't registered independently (only its 'ل'), so, if we now erassed a joined 'ا' we shouldn't yet erase nothing
                                lamAlifBuffer.pop(); // Erases the char object
                            LamAlifObject = { "notEmpty": "notEmpty" }; // After the delete (keyCode 8 or 46) of the char we didn't update the objects(char and lamAlif) because the proccedure for that is performed only on clicking of a visible char, so we need to indicate that by filling somthing within the objects and then use the non-empty object to pop also the back buffers (backChars and backLamAlif buffers. See "if (!isEmptyRegularCharObject)..." on keydown after deleting
                            }
                            if (!joinedAlif) {       // If we deleted alif(ا) that was attached automaticaly to the lam('ل') in case of keyCode 66 (B) for example, than we can't pop it because we never don't insert such alif to the buffer
                                charsBuffer.pop();
                                regularCharObject = { "notEmpty": "notEmpty" };
                                popped = true;       // Indicates that a char was popped so we pop it also from the back buffers otherwise we push it to the back buffers. See " if (!popped)..."
                            }
                            else
                                charsBufferEnd.positiononkeyboard = 31;// If it is joined alif then we shouldn't pop because joined alif is not held in the buffer , but the 'ل' becomes of 31 as regular
                    }
                    if (!textArea) { // Retrieves the original variables
                        previousText = tempPreviousText;
                        currentText = tempCurrentText;
                    }
                    //     -----     ------    -- compares between the text and charsBuffer --    ------     ------
                    // Now we check if the text and the order of the keys in the charsBuffer are the same. If not, this is sign that the char added/erased not in the last place in the text
                    var bufferedChars = "";//----- Firstly we assemble the keys in the buffer by their order
                    var content = "";
                    if (currentText != previousText) { // Otherwise , on converting, the bufferedChars/charsBuffer remain as is because the shortcut 'ctrl+<' doesn't change the buffers, but the text is converted and we get return false
                        for (var i = 0; i < charsBuffer.length; i++) { 
                            if (charsBuffer[i].key == 'Unidentified' || charsBuffer[i].key == 'ف' && charsBuffer[i].shifted) // The 'key' attribute of the key which its keyCode=66 (B) is 'Unidentified' but infact the char sown is 'ل'. the same matter is with key 84(T) when it is shifted in arabic
                                charsBuffer[i].key = 'ل';
                            bufferedChars += charsBuffer[i].key;
                            if ([22, 31, 43].indexOf(charsBuffer[i].positiononkeyboard) > -1 && (charsBuffer[i].key == 'ل' || charsBuffer[i].key == 'Unidentified')) {// Here we add the joined alif for the comparing between the order of the 'keys' in the buffer(which doesn't contain the joined alifs) to the order of the text in the text box(which contains the joined alifs)
                                var alif = "";
                                switch (charsBuffer[i].positiononkeyboard) { // For each case of lamAlif('لا') there is special alif
                                    case 43:
                                        if (charsBuffer[i].shifted) {
                                            alif = 'آ'; break;
                                        }
                                        else {
                                            alif = 'ا'; break;
                                        }
                                    case 31:
                                        if (charsBuffer[i].shifted) {
                                            alif = 'أ'; break;
                                        }
                                        else {
                                            alif = ''; break;
                                        }
                                    case 22:
                                        if (charsBuffer[i].shifted) {
                                            alif = 'إ'; break;
                                        }
                                        else
                                            alif = '';
                                }
                                bufferedChars += alif; // إ,أ,آ
                            }
                        }
                        //-------  Now we determine the text to be compared. Because the corrupted text(if there is any) was erased from the buffer(charsBuffer) we need to determine the new orderly text only, from the text to be compared with the text(keys list) in the buffer
                        var corruptedTextTail = GetLastUniqSubString(corruptedText, lamAlifBuffer); // This is needed only for case the End of corruptedtext is of '\n', then we need to make an adaptation
                        var corruptedTextLength = (div) ? corruptedText.length - corruptedTextTail.length + AdaptNewLineSignsInInnerText(event, corruptedTextTail).length : corruptedText.length;
                        if (div)
                            content = event.target.innerText.substring(corruptedTextLength, originalText.length).replace(/\u00A0/g, ' ').replace(/\n/g, '') // Replacing the '&nbsp;'(innerText space char , represented here by u00A0) to regular space char and filtering the '\n'  inorder to identify the text with the  buffer chars. Filtering the corrupted part(if there is any) of the buffer
                        else
                            content = event.target.value.substring(corruptedText.length, originalText.length).replace(/\n/g, ''); 
                        //------- Now comparing
                        if (bufferedChars != content) // If some text is selected when pressing a key , we reset the buffers then we push the current pressed key to the buffer(s)
                            return false;  // If some text was deleted/added not regularly at the end of the text but within it , or if it was selected, then the buffers are resetted
                    }
                    //------- checks if there is a change the sets of '\n' (new line chars). If there is and if it is in the middle of the text, this means that 'Enter' was inserted not orderly
                    var currentNewLinesSets = GetNewLineSignsSetsArray(currentText);
                    var previousNewLinesSets = GetNewLineSignsSetsArray(previousText);
                    for (var i = 0; i < previousNewLinesSets.length || i < currentNewLinesSets.length; i++) 
                        if (currentNewLinesSets[i] != previousNewLinesSets[i] && (i < currentNewLinesSets.length - 1 && i < previousNewLinesSets.length - 1 || currentTextEnd0 != '\n' && previousTextEnd0 != '\n')) {
                            corruptedRegularChar = false; // Indicates that the corruption is made by ilegal Enter, not by a visible char, in this case we don't slice the buffers because they do not contain Enters so they aren't corrupted 
                            return false;
                        }
                    //--------
                    isEmptyRegularCharObject = JSON.stringify(regularCharObject) === '{}';
                    isEmptyLamAlifObject = JSON.stringify(LamAlifObject) === '{}'
                    return true; // Return after the deleting the last char in the text or when adding a char regularly to the end of the text, we return true so the buffers are not resetted
                }
            }
        }
        //   --            --            --            --             --            --
        //*0  KeyDown event handler.  Mainly to navigate by the converting key(the short cut)
        function ConversionOptions(event) {
            if (hoverDiv)                     // If The hover_window div element exists
                hoverDiv.remove();            // Removing(deleting)  the hovering window
            hoverDiv = null;
            if (hoverDivFace_Twit)            // Special hovering window for facebook/twitter sites
                hoverDivFace_Twit.remove();
            hoverDivFace_Twit = null;
            if (canvas)
                canvas.remove();
            canvas = null;
            which = event.keyCode;
            originalText = (div) ? event.target.innerText : event.target.value;   // Div is indicator that the element is kind of div
            //     -----     ------    -------    short-cuts options    ------    ------     ------
            const isPasswordField = /password/i.test(event.target.name) || /password/i.test(event.target.id) || /password/i.test(event.target.type); // Checks if the textbox is a kind of password box
            if (originalText.length < 10000 && !isPasswordField)                            // Prevents mistakingly conversion on very large text
                if (event.ctrlKey && (which == 188 || which == 190 || which == 220 || which == 66) && !disableExtension) {// If ctrl + '<' or '>' or '|' were pressed and the plug-in is not stopped
                    if (!languagesArray || languagesArray.length < 2) { //  If not selected 2 languages in Options page list
                        if (!languagesArray)
                            additionSentenceForAlert = "(In next time of wrong script, the conversion will be better.)" // (not important)If the user chose less than 2 languages  , if he types letters that are common  , then , when he choses the more one , the correction might be not perfect
                        alert("You should select 2 languages from Options page list.\nRight click on the plug-in icon , click \'Extention Options\', then select from list.\n" + additionSentenceForAlert);
                        additionSentenceForAlert = "";
                        return;
                    }
                    switch (which) {                  // If Ctrl+ '>' were pressed. KeyCode of '>' key equal to 190
                        case 190: ToggleCapsN(event); break;
                        case 220:                     // keyCode of '|' key
                            enforceUniformity = true; // If there are two different languages mixed in the text (e.g. hello 'םרךג' , the conversion will be 'hello world' instead of 'יקךךם world')
                        case 188: ConvertText(event); break;          // Called if which is 188 or 220
                        case 66: {                    // ctrl +'B' key(same to 'נ' or 'لا' etc.). To restore the text as it was before the corruption, that is before the unorder texting
                            var backTextOn = $(event.target).data('backTextOn');  
                            var corruptedText = $(event.target).data('corruptedText');
                            var backText = $(event.target).data('backText'); // Remmember that backText is set only once when a non legal texting is occured
                            var backTextCorruptTextGap = $(event.target).data('backTextCorruptTextGap');
                            var badTextCounter = (backTextOn) ? 0 : $(event.target).data('badTextCounter') - backTextCorruptTextGap; // The additional chars after the corruption
                            var lamAlifBuffer = $(event.target).data('lamAlifBuffer');
                            var backCharsBuffer = $(event.target).data('backCharsBuffer');    // We pull off the buffers-data to set it in charsBuffer and lamAlifBuffer (see ahead next lines)
                            var backLamAlifBuffer = $(event.target).data('backLamAlifBuffer');     
                            var backTextTail = GetLastUniqSubString(backText, lamAlifBuffer); // This is neede only for case the End of text is of '\n'
                            backText = (div) ? backText.substring(0, backText.length - backTextTail.length + AdaptNewLineSignsInInnerText(event, backTextTail).length) : backText;
                            var corruptedTextTail = GetLastUniqSubString(corruptedText, lamAlifBuffer);              // This is neede only for case the End of text is of '\n'
                            var corruptedTextLength = (div) ? corruptedText.length - corruptedTextTail.length + AdaptNewLineSignsInInnerText(event, corruptedTextTail).length : corruptedText.length;
                            var part1Length = (backTextOn) ? backText.length : corruptedTextLength + badTextCounter;// In case we allready used ctrl+B then we only need to add the backText to the rest of the text  
                            newText = backText.concat(originalText.substring(part1Length, originalText.length)); 
                            $(event.target).data('backTextOn', true);     
                            $(event.target).data('badTextCounter', 0);           // There is no corrupted/bad text after the restoring by ctrl+B
                            $(event.target).data('charsBuffer', backCharsBuffer);// Here we update the buffers by the corrected back buffers
                            $(event.target).data('lamAlifBuffer', backLamAlifBuffer);
                            $(event.target).data('corruptedText', "");     
                            $(event.target).data('backTextCorruptTextGap', 0);
                            $(event.target).data('backFirstTrigger', true);      // From now on, all the buffers are updated to the backed newtext, and new corruption will again be treated the same
                            EditAndDisplayN(event)
                        }
                    }
                }
        }
        //   --            --            --            --             --            --
        //*1   Called by ConversionOptions function.  Toggles between capital(big) letters and normal letters
        function ToggleCapsN(event) { // N means  'New' , the new version
            var charsBuffer = $(event.target).data('charsBuffer');
            var lamAlifBuffer = $(event.target).data('lamAlifBuffer');
            var positionInBoard = -1;        // The place of a char on language line (board[_])
            if (div)                                                       // Only on div, not on textarea or input element
                originalText = RemoveFromString(event, originalText);      // Removing extra new line chars (\n'). See remark (2)
            newText = originalText;
            //    -----     ------   converting from hebrew to english  (see remark 2.1)   ------     ------
            if ((Array.from(originalText).findIndex(char => "אבגדהוזחטיכלמנסעפצקרשתךםןףץ".indexOf(char) > -1) > -1)) { // If we have an hebrew char in the text then toggle to caps and set 'fromHebrew' to true
                newText = "";
                fromHebrew = true;           // Indicates that the current text is hebrew , so when toggling back from capital it will turn back to hebrew, not to english . If the current text is arabic this will not disturb
                for (var i = 0; i < originalText.length; i++) {            // Converts to English
                    positionInBoard = board[2].indexOf(originalText[i].toLowerCase());
                    HebrewEnglishCaps(1);    // From hebrew to english
                }
            }
            else//-----     ------          converting back from english to hebrew         ------     ------
                if (originalText == originalText.toUpperCase() && (fromHebrew)) {// If the text is english capital that toggled from hebrew
                    newText = "";
                    for (var i = 0; i < originalText.length; i++) {         // Converts to English 
                        positionInBoard = board[1].indexOf(originalText[i].toLowerCase());
                        HebrewEnglishCaps(2);// From english to hebrew
                    }
                }
                else                         // If the text is not capital                       
                    fromHebrew = false;  //tomorrow , bug typing ABC can't be converted to abc
            //    -----     ------     ------    set to lower/upper case   ------     ------     ------
            if (newText === newText.toUpperCase()) {
                charsBuffer = charsBuffer.map(x => ({ ...x, shifted: false }));
                lamAlifBuffer = lamAlifBuffer.map(x => ({ ...x, shifted: false }));
            }
            else {
                charsBuffer = charsBuffer.map(x => ({ ...x, shifted: true }));
                lamAlifBuffer = lamAlifBuffer.map(x => ({ ...x, shifted: true }));
            }
            newText = (newText === newText.toUpperCase()) ? newText.toLowerCase() : newText.toUpperCase() // Toggle the text to/from capitals; 
            EditAndDisplayN(event);           // Edits the converted text and displays it
            function HebrewEnglishCaps(language) {//------------------ inner function.  Converts to english/hebrew
                if (positionInBoard > -1)    // If the source language is found
                    newText += board[language].charAt(positionInBoard)
                else {                       // If it is arabic or signs like '!','@' etc.
                    newText += originalText[i];                // The original char is left as it is
                    if (board[0].indexOf(originalText[i]) > -1) // If the char is arabic
                        fromHebrew = false;
                }
            }
            $(event.target).data('lamAlifBuffer', lamAlifBuffer);
            $(event.target).data('charsBuffer', charsBuffer); 
        }
        //   --            --            --            --             --            --
        //*1   Called by HandleBuffers, ToggleCapsN and ConvertText functions.  Gets the selected text plus the offset
        function GetSelectedText(event) { // Not suitted to Twitter because of its element's html structure
            var anchorOffset = 0;  // See if you want some explanation in Laimonas answer at https://stackoverflow.com/a/33586253/13603920
            var focusOffset = 0;
            var selectedText = "";
            if (window.getSelection().toString().length)  // If some text was selected
                if (div) {
                    anchorOffset = GetOffset(event);
                    focusOffset = anchorOffset + Math.abs(GetOffset(event, "focus") - GetOffset(event, "anchor")); //Gets the offset from the beginning of the text
                    selectedText = event.target.innerText.substring(anchorOffset, focusOffset);
                }
                else {
                    anchorOffset = event.target.selectionStart;
                    focusOffset = event.target.selectionEnd;
                    selectedText = event.target.value.substring(anchorOffset, focusOffset);
                }
            return { "selectedText": selectedText, "anchorOffset": anchorOffset };
        }
        //   --            --            --            --             --            --
        //*1   Called by ConversionOptions function. Converts the original text (and checks if the text is indeed changed)
        function ConvertText(event) {
            var backTextOn = $(event.target).data('backTextOn');
            var lamAlifBuffer = $(event.target).data('lamAlifBuffer');
            var charsBuffer = $(event.target).data('charsBuffer'); // We need to use the updated buffer after AdjustBuffersPositions before we call ConvertBuffer
            var textToConvert = GetSelectedText(event).selectedText;  // textToConvert is global because it gets the target element content
            textToConvert = (textToConvert.length) ? textToConvert : (div) ? (facebookTwitter || backTextOn) ? event.target.innerText : event.target.innerHTML : event.target.value;//originalText; // If there is no selected text then gets the entire text in the text box
            iterationsCounter = 0;
            var lengthOfParts = 0; //Sum of the length of the html parts for the positionintext
            newText = ""; // We need newText side by side newHtmlText for cases of selected text and for textarea , also we need it for AdjustBuffersPositions where we need the pure text. Also for backtext (when ctrl + b)
            if (div && !wasSelected && !facebookTwitter /*||*/ && !backTextOn) {
                textToConvert = GetParsedHTML(textToConvert); // Now textToConvert is an array of the parsed html text and it contains the tags, the free text and the ' ' (&nbsp; -notbreaking space)
                commonChars = GetCommonChars();
                newHtmlText = ""; // Holds the html format of the corrected text e.g.: "נ&nbsp;<div>נ</div>"
                for (var i = 0; i < textToConvert.length; i++) {
                    if (/<[^>]*>|&[^;]+;/g.test(textToConvert[i])) {  // If the part is of html tag or of &nbsp; (' ')
                        if (/<[^>\/]*>|&[^;]+;/g.test(textToConvert[i]) || textToConvert[i] == "</p>")    // If it is an open (not with '/' like </...>) tag or P closer tag which it is actually a '\n'
                            if (i > 0 || /&[^;]+;/g.test(textToConvert[i])) {     // The first tag that opens the innerHTML isn't counted by the html engine
                                lengthOfParts++; //We need this for AdjustBuffersPositions. This includes the joined alifs length
                                iterationsCounter++; // We need the iteration number for ConvertOneChar as the position of the char, Especialy for converting 'لا'
                            }
                        newHtmlText = newHtmlText.concat(textToConvert[i]) // Concats the tag or '&nbsp;' string. Pay attention : textToConvert[i] now is string, not a char , textToConvert is array of strings
                    }
                    else { // If the part is a text node , not an html tag or  
                        var convertedChar = ConvertPart(event, textToConvert[i], /*iterationsCounter, */lengthOfParts, lamAlifBuffer, charsBuffer)
                        lengthOfParts += convertedChar.length //  The text length
                        newHtmlText = newHtmlText.concat(convertedChar); //Concat the converted chars
                        //newText = newText.concat(convertedChar);
                    }
                }
            }
            else  // If not div.  As I mentioned we need newText also for AdjustBuffersPositions where we need the length of the pure newText. Also for back text
                newText = ConvertPart(event, textToConvert, /*iterationsCounter,*/ lengthOfParts, lamAlifBuffer, charsBuffer);
            lamAlifBuffer = $(event.target).data('lamAlifBuffer');
            charsBuffer = $(event.target).data('charsBuffer'); // We need to use the updated buffer after AdjustBuffersPositions before we call ConvertBuffer
            EditAndDisplayN(event);                                   // Edits the converted text and displays it
            if (charsBuffer.length)
                ConvertBuffer(event, lamAlifBuffer, charsBuffer);   //We need to convert the buffer key chars to prevent an unidentity on the next  conversion , when we compare the buffer with the text in
            LanguagesTraverser();                                   // This helps to roll on the conversion when enforceUniformity is on.  See example in remark (10)
        }
        //   --            --            --            --             --            --
        function ConvertPart(event, parttoconvert, lengthtillnow, lamalifbuffer, charsbuffer) {
            var backTextOn = $(event.target).data('backTextOn');
            var offset = GetSelectedText(event).anchorOffset;
            var partText = "";
            var char = "";
            if (div && !wasSelected /*||*/ && !backTextOn) // to check if || or && !backTextOn is correct.
                newText = "";
            for (var i = 0; i < parttoconvert.length; i++) { // Looping on the text , char by char
                if (!enforceUniformity) {
                    traverser = 0;           // Is's better to reset the traverser for each char. Otherwise ,if you try: arabic shifted "أ ً" (shited h+space+w , but in arabic) when arabic,hebrew,english are selected, the result is not as expected. But, not when enforceUniformity
                    LanguagesTraverser();
                }
                oldText = newText;                            // We use oldText for AdjustBuffersPositions function
                char = ConvertOneChar(event, parttoconvert[i], iterationsCounter + offset, lamalifbuffer, charsbuffer)// Builds the string of converted chars
                newText += char;
                partText += char;
                if (div && !wasSelected || !backTextOn)
                    AdjustBuffersPositions(event, lengthtillnow + offset) // In cases like textarea lengthofparts = 0 !
                else
                    AdjustBuffersPositions(event, offset);
                iterationsCounter++;
            }
            if (!div || wasSelected) // I think we need also || backTextOn
                return newText
            else
                return partText;
        }
        //   --            --            --            --             --            --
        //+0   Called by ConvertText function. Re-setting positions buffers after conversion the char of 66 keycode ('لا' to 'b' etc.) from/to arabic.  See remark (5)
        function AdjustBuffersPositions(event, offset) {
            var updatedLamAlifBuffer = $(event.target).data('lamAlifBuffer');
            var updatedCharsBuffer = $(event.target).data('charsBuffer');
            if (newText.length - oldText.length > 1) {          // If 2 chars were added: lam + alif ('لا') of arabic
                updatedCharsBuffer = updatedCharsBuffer.filter(pos => pos.positionintext <= newText.length + offset - 1 - 1). // Filters(creates) array of the positions till the current position of the converted text , then filters the rest of the array , -
                    concat(updatedCharsBuffer.filter(pos => pos.positionintext > newText.length + offset - 1 - 1).map(x => ({ ...x, positionintext: x.positionintext + 1 }))); // - then increases the positionintext in that part and then concatenates(joins) the two parts anew
                updatedLamAlifBuffer = updatedLamAlifBuffer.filter(lamAlifPos => lamAlifPos.positionintext <= newText.length + offset - 1 - 1).                                 // // 'length - 1' is the position of the last char in the text, but the last char is the redundant 'ا' and we want to register the place of the precede 'ل' , hence the second -1
                    concat(updatedLamAlifBuffer.filter(lamAlifPos => lamAlifPos.positionintext > newText.length + offset - 1 - 1).map(x => ({ ...x, positionintext: x.positionintext + 1 })));
            }
            else
                if (newText.length == oldText.length) {         // If no char was added , like from لا to b , when current char is 'ا' and it is removed in this iteration (see in CaseOfLamAndAlif function)
                    updatedCharsBuffer = updatedCharsBuffer.filter(pos => pos.positionintext <= newText.length + offset - 1).concat(updatedCharsBuffer.filter(pos => pos.positionintext > newText.length + offset - 1).map(x => ({ ...x, positionintext: x.positionintext - 1 }))); // We update the positions of the chars after that removed 'ا'
                    updatedLamAlifBuffer = updatedLamAlifBuffer.filter(lamAlifPos => lamAlifPos.positionintext <= newText.length + offset - 1).concat(updatedLamAlifBuffer.filter(lamAlifPos => lamAlifPos.positionintext > newText.length + offset - 1).map(x => ({ ...x, positionintext: x.positionintext - 1 })));
                }
            $(event.target).data('charsBuffer', updatedCharsBuffer);
            $(event.target).data('lamAlifBuffer', updatedLamAlifBuffer);
        }
        //   --            --            --            --             --            --
        //+0   Called by ConvertText function.  Directs the char to be converted in the suittable function. Returns the converted char
        function ConvertOneChar(event, char, positionintext, lamalifbuffer, charsbuffer) {
            var positionOnBoard = -1;
            var isShiftedChar = false;
            var bufferIndex = charsbuffer.findIndex(pos => pos.positionintext == positionintext); // Checks if the charws position is registered or not - in case the buffer was resetted
            if (bufferIndex > -1) {           // If the char details are within the buffer
                positionOnBoard = charsbuffer[bufferIndex].positiononkeyboard;
                isShiftedChar = charsbuffer[bufferIndex].shifted;
                return RegisteredChar(char, positionintext, positionOnBoard, lamalifbuffer, isShiftedChar);
            }
            else
                return UnRegisteredChar(char, positionintext, lamalifbuffer);
        }
        //   --            --            --            --             --            --
        //+1   Called by ConvertOneChar function.  Seeks the language of the char , aided by charsBuffer array , returns the converted char. See remark (1.2)
        function RegisteredChar(char, positionintext, positiononboard, lamalifbuffer, isshifted) { // See remark (1) why we need to register the chars
            var convertedChar = char;
            var fromShift = false;   // A flag to determine if to seek the char in the base or in the shifted line
            mostCharsTraverser = 0; // Reseting the traverser in GetMostCharsLanguage() for each char , otherwise BBB will not be converted well , in ar-he-en
            // Still need to be checked on large texts. Also need to be checked if can be case that j gets its limits before all languages checked.// This comes to solve (partially) confusions between common chars like ,'Hק' convrted twice , on ar' , heb' and eng' selected.  If the second char in the text doesn't fit the language of the common char's fromLanguage, then we traverse(). We check the second char ([1]) because in many times the the first char is capital, hence we need to check if textToConvert.length > 1
            var charFitToText = (commonChars.indexOf(char) > -1) ? fromLanguage == GetMostCharsLanguage(originalText)/*textToConvert*/ : true;/*textToConvert.length > 1 && board[fromLanguage].indexOf(textToConvert[1]) < 0 && SHFT[fromLanguage].indexOf(textToConvert[1]) < 0*/;
            var j = 0;
            var lowerOrShiftedPosition = (!isshifted) ? board[fromLanguage].indexOf(char) : SHFT[fromLanguage].indexOf(char); // Although wehave positiononboard as function parameter , we stiil to locate the fromLanguage to use CaseOfLamAndAlif function only on arabic
            if (!charFitToText || lowerOrShiftedPosition != positiononboard && lowerOrShiftedPosition != 31 && lowerOrShiftedPosition != 22)  // There are 3 'ل' positions in the languages tables(lines) : 43, 31 ,22. If positiononboard of that 'ل' equals to 43 and lowerOrShiftedPosition = 22 the 'ل' will not be converted while enforceUniformity , therefore we include these options. In CaseOfLamAndAlif function we determine the position exactly
                if (!enforceUniformity)             // If not  ctrl + '|' were pressed. See above in ConversionOptions function
                    do {                                         // While we don't find the char's language
                        fromShift = false;  // In the first inner loop seek at the base (lower) lines
                        if (j >= languagesArray.length) { // After the inner loop we reset the j iterator to begin the checks of the shifted lines
                            j = 0;
                            fromShift = true; // In the second inner loop , seek at the shifted lines
                        }
                        do {                          // While we didn't find the char's language
                            j++;
                            LanguagesTraverser();     // Sets the next pair of from-to languages for checking the language of the char
                            lowerOrShiftedPosition = (board[fromLanguage].indexOf(char) > -1) ? board[fromLanguage].indexOf(char) : SHFT[fromLanguage].indexOf(char); // Seek the position in the lowercase or in the uppercase line
                            charFitToText = (commonChars.indexOf(char) > -1) ? fromLanguage == GetMostCharsLanguage(originalText/*textToConvert*/) : true;
                            if (charFitToText && lowerOrShiftedPosition == positiononboard || lowerOrShiftedPosition == 22 || lowerOrShiftedPosition == 31/* || lowerOrShiftedPosition == 43 || ['ا', 'آ', 'أ', 'إ'].indexOf(char) > -1*/)
                                convertedChar = SetUpperOrLowerCase(char, positionintext, positiononboard, lamalifbuffer, isshifted); // Gets the converted and formated char
                            else
                                convertedChar = char;
                        } // Continue to seek the language line (fromLanguage) that includes the char (in positiononboard position)
                        while ((j < languagesArray.length + 1) && convertedChar == char)
                    }
                    while ((char == convertedChar) && !fromShift)
                else                            // If the char was not found in the fromLanguage line but we enforce uniformity
                    convertedChar = SetUpperOrLowerCase(char, positionintext, /*lowerOrShiftedPosition*/ -1, lamalifbuffer, isshifted);
            else                                // If the char was found in the fromLanguage line
                convertedChar = SetUpperOrLowerCase(char, positionintext, positiononboard, lamalifbuffer, isshifted);
            return convertedChar;
        }
        //   --            --            --            --             --            --
        //+2   Called by RegisteredChar, UnRegisteredChar functions.  Sets the format of the char while converting it to the destined language. Returns the converted char
        function SetUpperOrLowerCase(char, positionintext, positioninlanguage, lamalifbuffer, toupper) {
            var convertedChar = char;
            if (positioninlanguage >/*==*/ -1) // If the char was found in any language
                if ((fromLanguage == 0 || toLanguage == 0)) {
                    convertedChar = CaseOfLamAndAlif(char, positionintext, lamalifbuffer)// Gets the converted char(s) upon the conditions involved in arabic
                    if (convertedChar != 'لا' && convertedChar != "") // 'لا' doesn't change for shifted case
                        convertedChar = SetFormat(convertedChar)
                }
                else
                    convertedChar = SetFormat(char)
            return convertedChar;
            function SetFormat(chari) {  //------ inner of inner function.  Sets the lower/upper case format of the char and returns the converted char
                if (chari != chari.toLowerCase() || toupper)   // If the char is capital (shifted or capslock on)
                    convertedChar = SHFT[toLanguage].charAt(positioninlanguage)
                else                              // If it is a lower case char
                    convertedChar = board[toLanguage].charAt(positioninlanguage);
                return convertedChar;
            }
        }
        //   --            --            --            --             --            --
        //+1   Called by ConvertOneChar function.  Seeks the language of the char in order to find its place in the language line. Returns the converted char
        function UnRegisteredChar(char, positionintext, lamalifbuffer) { // Very similar to RegisteredChar function
            var convertedChar = char;
            mostCharsTraverser = 0; // Reseting the traverser in GetMostCharsLanguage() for each char , otherwise BBB will not be cnverted well , in ar-he-en
            var j = 0;
            var positionLower = -1;    // The position of the char on board.
            var positionInSHFT = -1;
            var lowerOrShiftedPosition = -1;
            var fromShift = false;   // A flag to determine if to seek the char in the base or in the shifted line
            var charFitToText = (commonChars.indexOf(char) > -1) ? fromLanguage == GetMostCharsLanguage(originalText/*textToConvert*/) : true;/*textToConvert.length > 1 && board[fromLanguage].indexOf(textToConvert[1]) < 0 && SHFT[fromLanguage].indexOf(textToConvert[1]) < 0*/;
            positionLower = board[fromLanguage].indexOf(char);  // The position on the base language line (not shifted)
            positionInSHFT = SHFT[fromLanguage].indexOf(char);  // The position on the shifted language line
            lowerOrShiftedPosition = /*(*/positionLower;/* == -1) ? positionInSHFT : positionLower;*/ //  We need the position that is > -1 now, in case of enforceUniformity , in order to get entry to CaseOfLamAndAlif() in SetUpperOrLowerCase()
            if ((!charFitToText || lowerOrShiftedPosition/*positionLower*/ == -1) && !enforceUniformity) // If the checked language isn't including the checked char , and the user didn't use Ctrl+'|' in order to enforce uniformity.
                do {                                         // While we don't find the char's language
                    fromShift = false;  // In the first inner loop seek at the base (lower) lines
                    if (j >= languagesArray.length) { // After the inner loop we reset the j iterator to begin the checks of the shifted lines
                        j = 0;
                        fromShift = true; // In the second inner loop , seek at the shifted lines
                    }
                    do {
                        j++;
                        LanguagesTraverser();                // Set the next pair of from-to languages

                        charFitToText = (commonChars.indexOf(char) > -1) ? fromLanguage == GetMostCharsLanguage(originalText/*textToConvert*/) : true;/*textToConvert.length > 1 && board[fromLanguage].indexOf(textToConvert[1]) < 0 && SHFT[fromLanguage].indexOf(textToConvert[1]) < 0*/;
                        if (fromShift)
                            lowerOrShiftedPosition = SHFT[fromLanguage].indexOf(char)
                        else
                            lowerOrShiftedPosition = board[fromLanguage].indexOf(char.toLowerCase());

                        if (charFitToText && lowerOrShiftedPosition > -1)              // If original char language is found
                            convertedChar = SetUpperOrLowerCase(char, positionintext, lowerOrShiftedPosition, lamalifbuffer, fromShift); // Gets the converted and formated char
                        else                                // If the char isn't included not as normal nor as capital form in the current checked language
                            convertedChar = char;
                    }
                    while ((j < languagesArray.length + 1) && (convertedChar == char)) // If converted char is same as the original, that is, the language was not found
                    traverser = 0;    // Initializes traverser to check the languages from the first selected language
                    LanguagesTraverser(); // For the second loop , we restart fromLanguage to 0
                }
                while ((char == convertedChar) && !fromShift)
            else                                            // If the char was found in the fromLanguage line or if the user uses enforceUniformity (ctrl+|)
                convertedChar = SetUpperOrLowerCase(char, positionintext, lowerOrShiftedPosition, lamalifbuffer, fromShift);
            return convertedChar;
        }
        //   --            --            --            --             --            --
        function GetCommonChars() {
            var commonChars = "";
            for (var i = 0; i < languagesArray.length; i++)
                for (var j = i + 1; j < languagesArray.length; j++)
                    for (var k = 0; k < board['base'].length; k++)
                        if (board[i][k] == board[j][k])
                            if (commonChars.indexOf(board[i][k]) < 0) // Prevent multi instances
                                commonChars += board[i][k];
                            else
                                commonChars += ""
                        else
                            if (SHFT[i][k] == SHFT[j][k])
                                if (commonChars.indexOf(SHFT[i][k]) < 0) // Prevent multi instances
                                    commonChars += SHFT[i][k];

            return commonChars;
        }
        //   --            --            --            --             --            --
        // In case of 'He' converted to hebrew and arabic , we use this function to determine if H is of english or hebrew // neeed to test the traverser here that it will not cause false in the return in case of 'B-'
        function GetMostCharsLanguage(text) {
            var langs = [];
            for (var i = 0; i < languagesArray.length; i++) // Initializing
                langs[i] = 0;
            for (var i = 0; i < text.length; i++)
                for (j = 0; j < languagesArray.length; j++)
                    if (board[j].indexOf(text[i]) > -1 || SHFT[j].indexOf(text[i]) > -1) // to check SHFT
                        langs[j]++;
            var most = langs[0];
            var langIndex = 0;

            for (var i = mostCharsTraverser/*1*/; i < langs.length; i++) // Each converting we get the first most , checking for it from the traversed language , so in case of 'B' it will not stuck each time on the same language
                if (langs[i] > most) {
                    most = langs[i];
                    langIndex = i;
                }
            for (var i = 1; i < mostCharsTraverser; i++) // Then we complete to scan from i=1 (lang[0] is already set to most)
                if (langs[i] > most) {
                    most = langs[i];
                    langIndex = i;
                }
            if (mostCharsTraverser == languagesArray.length)
                mostCharsTraverser = 0
            else
                mostCharsTraverser++;
            return langIndex;
        }
        //   --            --            --            --             --            --
        //+2   Called by RegisteredChar, UnRegisteredChar functions.  Sets the next to-from languages indexes in the selected-languages array(languagesArray) which contains the positions of the languages in the list (see remark (3))
        function LanguagesTraverser() {                // Moving the to-from pairs circularilly
            fromLanguage = languagesArray[traverser];  // The source(original) language
            if (traverser < languagesArray.length - 1) // Prevents array overflow
                traverser++
            else
                traverser = 0;                         // Iterator of the languages indexes
            toLanguage = languagesArray[traverser];    // The destination language (to which to convert to)
        }
        //   --            --            --            --             --            --
        //+3   Called by SetUpperOrLowerCase function.  Adding/removing the extra 'ا' of لا, (see that لا=ا+ل) . See remark (4)
        function CaseOfLamAndAlif(char, positionintext, lamalifbuffer) {
            var indexOfLamInBuffer = lamalifbuffer.findIndex(pos => pos.positionintext == positionintext); // Seeks the char details object in the buffer by its place in the text
            var positionOfJoinedAlif = lamalifbuffer.findIndex(pos => IsJoinedAlif(pos, positionintext)); // Checks if the char is a joined alif. If it follows a lam ('ل') that is registered in the buffer , then it is a joined/additional alif
            var convertedChar = char;
            //      -----     ------    -------     If we try to convert TO arabic         ------    ------     ------
            if (toLanguage == 0)                     // arabic is number 0 in the list
                if (indexOfLamInBuffer > -1)       // If the position of the char is registered in lamalifbuffer array
                    if (lamalifbuffer[indexOfLamInBuffer].shifted || lamalifbuffer[indexOfLamInBuffer].positiononkeyboard == 43)
                        convertedChar = 'ل' + 'ا'    // = 'لا' // need to suit on of آ,أ,إ,ا
                    else
                        convertedChar = board[0/*toLanguage*/][lamalifbuffer[indexOfLamInBuffer].positiononkeyboard]
                else                                 // If the char isn't of the [66,71,84] keycodes key(like 'B' ,  'נ',  'и' etc. or 'g', 'ע', etc. etc.)
                    if (board[fromLanguage].indexOf(char) > -1 || SHFT[fromLanguage].indexOf(char) > -1)
                        convertedChar = board[0][board[fromLanguage].indexOf(char)] || SHFT[0][SHFT[fromLanguage].indexOf(char)] // board[arabic][the position of the char in the language line]
                    else
                        convertedChar = char;
            //      -----     ------    -------           to convert FROM arabic           ------    ------     ------
            else
                if (indexOfLamInBuffer > -1) {     // Key 'لا' (of 66 keycode, or shifted 71/84 codes) was pressed so char ='ل' or 'ف'
                    var lamAlifIndex = lamalifbuffer[indexOfLamInBuffer];
                    convertedChar = (lamAlifIndex.shifted) ? board[toLanguage][lamAlifIndex.positiononkeyboard].toUpperCase() : board[toLanguage][lamAlifIndex.positiononkeyboard];
                }
                else {
                    if (['ا', 'آ', 'أ', 'إ'].indexOf(char) > -1)// If the char is kind of 'alif'
                        if (positionOfJoinedAlif > -1)
                            convertedChar = ""                  // If the alif is redundant of 'لا' then remove it
                        else                                    // If it is one of the 'alif's , but was written by key of kecode 72 (like 'H' etc.) so it was added by pressing a key , not automaticaly
                            switch (char) {
                                case 'ا': convertedChar = board[toLanguage][32]; break; // The key of keycode 72 keycode (like 'ا','H' etc.) is in the position 32 on the board line
                                case 'آ': convertedChar = SHFT[toLanguage][43]; break;
                                case 'أ': convertedChar = SHFT[toLanguage][32]; break;
                                case 'إ': convertedChar = SHFT[toLanguage][21]; break;
                            }
                    else                                        // If char is not the registered 'ل' nor 'ا'
                        if (board[0].indexOf(char) > -1 || SHFT[0].indexOf(char) > -1)
                            convertedChar = board[toLanguage][board[0].indexOf(char)] || SHFT[toLanguage][SHFT[0].indexOf(char)]
                        else
                            convertedChar = char;
                }
            return convertedChar;
        }
        function IsJoinedAlif(i, positionintext) {//------------------------  inner function to determine if the alif is joined or independent
            if (i.positionintext == positionintext - 1)
                if (i.shifted)  // If 'لا' , 'ل' or 'ف' is shifted so it has a joined alif
                    return true
                else
                    if (i.positiononkeyboard == 43)
                        return true
                    else
                        return false
            else
                return false;
        }

        //   --            --            --            --             --            --
        //(***) Called by ConvertText and ToggleCapsN functions.  Formates the whole converted text, displays it and alerts about unsucceeded conversion
        async function EditAndDisplayN(event) {   
            var backTextOn = $(event.target).data('backTextOn');
            //     -----     ------    ------              miscellaneous              ------    ------     ------
            enforceUniformity = false;
            chrome.storage.sync.set({ popupText: "" }, function () { });       // Reseting data of the textarea in the Popup page
            chrome.storage.sync.set({ records: await SetOriginalTextsForStoring() }, function () { }); // Storing data for the textarea in the Options page. See remark (1.3)
            if (newText == originalText || newHtmlText == event.target.innerHTML && div && !backTextOn && event.keyCode != 190 && !wasSelected) // In case of textArea newHtmlText = event.target.innerHTML allways = "" because textarea element has no innerHTML property. We should care about case of selecting part of the text in which we also cannot use htmlText because of  the complexity.
                noChangeMade = true           // No change was made in text after trying to convert by all selected languages
            else
                noChangeMade = false;
            //     -----     ------          if text was not converted || Facebook/Twitter        ------     ------
            if (facebookTwitter || noChangeMade) {
                if (!noChangeMade) {
                    if (!wasSelected)
                        window.getSelection().selectAllChildren(event.target);
                    chrome.storage.sync.set({ popupText: newText }, function () { // Stores the converted text from facebook for the textarea in the Popup page\
                    });
                }
                SetHoverWindow(event);      // Creates and displays hovering message-window and leaves the text as it is
            }
            //     -----     ------    -------         if text was converted       ------    ------     ------
            else {                          // Displays the converted text after giving it the appropriate pattern. See the end of remark (2)
                //     -----     ------    -------        ------    ------     ------
                var composedText = newText;  // We use composedText only for cases we don't use newHtmlText
                if (window.getSelection().toString().length) //{  // If part of the text was selected
                    composedText = GetTextSection(event/*, true*/, "before") + GetTextSection(event/*, true*/, "selected") + GetTextSection(event/*, true*/, "after");
                var linkedDivHTML =/* newText;*/BuildLinkedInDivHTML(AdaptNewLineSignsInInnerText(event, composedText));
                var divHTML = /*newText;*/BuildDivHTML(AdaptNewLineSignsInInnerText(event, composedText));
                if (window.getSelection().toString().length)
                    var textHasGreatOrLessSign = /<|>/.test(originalText.concat(newText)) // The originalText that was not changed plus the part that was changed, cann't include '<' or '>' chars within HTML format because it harms the text and can erase it
                else
                    var textHasGreatOrLessSign = /<|>/.test(newText); // The whole original text
                if (textHasGreatOrLessSign) {
                    linkedDivHTML = composedText;
                    divHTML = composedText;
                }
                //     -----     ------    -------     displaying the corrected text    ------    ------     ------
                if (event.keyCode == 66 || event.keyCode == 190 || wasSelected || !div || backTextOn)
                    if (window.getSelection().toString().length) // If part of the text was selected
                        (div) ? (!textHasGreatOrLessSign) ? event.target.innerHTML = (GetDivPattern(event) == "linkedin div") ? linkedDivHTML : divHTML :
                            event.target.textContent = AdaptNewLineSignsInInnerText(event, composedText, true) :
                            event.target.value = GetTextSection(event/*, false*/, "before") + GetTextSection(event/*, false*/, "selected") + GetTextSection(event/*, false*/, "after")  // Displays the coverted text. This line is a nested ternary operator
                    else
                        (div) ? (!textHasGreatOrLessSign) ? event.target.innerHTML = (GetDivPattern(event) == "linkedin div") ? linkedDivHTML : divHTML :
                            event.target.textContent = AdaptNewLineSignsInInnerText(event, composedText, true) :
                            event.target.value = composedText
                else
                    event.target.innerHTML = newHtmlText;
                //     -----     ------    -------        ------    ------     ------
                // Sets the place of the caret(the writing-point marker) to the end of the text
                (div) ? SetCaretPosition(event.target) : event.target.setSelectionRange(newText.length, newText.length);
            }
            var txt = (div) ? event.target.textContent : event.target.value;
            if ((Array.from(txt).findIndex(char => "אבגדהוזחטיכלמנסעפצקרשתךםןףץابتثجحخدذرزسشصضطظعغفقكلمنهوي".indexOf(char) > -1) > -1))  // Sets the direction of the text. *findIndex works only on array, not on string
                $(event.target).css("direction", "rtl");
            else
                $(event.target).css("direction", "ltr");
            noChangeMade = false;
            var currentText = (div) ? event.target.innerText : event.target.value; // This line is needed for setting currentText in ConversionOptions(event)
            $(event.target).data('currentText', /*""*/ currentText); // Updating to the converted language
            $(event.target).data('previousText', "");
            async function SetOriginalTextsForStoring() {//--------------- inner function. Builds the records set to be displayed in Options page text area
                records = await PromiseStorage_Get();                  // Awaiting for the records data to be retrieved from chrome storage
                if (records.length >= 3)
                    records.shift();
                records.push(originalText + '\n');
                return records;
                function PromiseStorage_Get() {//------------------------ inner of inner function
                    return new Promise((resolve, reject) => {         // Promises that data is retrieved from storage before continue in the code. See remark (1.5)
                        chrome.storage.sync.get('records', function (data) {
                            if (!data.records)
                                records = [];
                            else
                                records = Object.values(data.records);// Converts data.records to array
                            resolve(records);                         // Returns the records only after updating from storage
                        });
                    })
                } // End of PromiseStorage_Get
            } // End of SetOriginalTextsForStoring
        } //*** End point of the conversion proccedure chain ***/
        //   --            --            --            --             --            --

        function ConvertBuffer(event, lamalifbuffer, charsbuffer) { // After converting we should convert also the charsbuffer , otherwise on entering to LegalCharChange() by any key it will retutn false , because the buffer chars and the text are not identical
            var positionOfJoinedAlif = false;
            var backTextOn = $(event.target).data('backTextOn');
            var j = 0;
            var text = (div && !wasSelected && !facebookTwitter /*||*/ && !backTextOn) ? newHtmlText.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ') : newText;
            for (var i = 0; i < text.length && j < charsbuffer.length; i++) {
                positionOfJoinedAlif = lamalifbuffer.findIndex(pos => IsJoinedAlif(pos, i)) > -1 && ['ا', 'آ', 'أ', 'إ'].indexOf(text[i]) > - 1; //Boolean expression // Checks if the char is a joined alif. If it follows a lam ('ل') that is registered in the buffer , then it is a joined/additional alif
                if (!positionOfJoinedAlif && text[i] != '\n') {
                    charsbuffer[j].key = text[i][0]; // @@@@ to think about backbuffer
                    j++;
                }
            }
            $(event.target).data('charsBuffer', charsbuffer);
        }
        //   --            --            --            --             --            --
        function GetSelectedHtml() {
            let html = '';
            if (window.getSelection) {
                const selection = window.getSelection();
                if (selection.rangeCount) {
                    const container = document.createElement('div');
                    for (let i = 0; i < selection.rangeCount; i++) {
                        container.appendChild(selection.getRangeAt(i).cloneContents());
                    }
                    html = container.innerHTML;
                }
            } else if (document.selection && document.selection.type != 'Control') { // For older versions of Internet Explorer,
                html = document.selection.createRange().htmlText;
            }
            return html;
        }
        function GetHtmlBeforeSelection() {
            let htmlBefore = '';
            if (window.getSelection) {
                const selection = window.getSelection();
                if (selection.rangeCount) { // Needed in Mizilla where it can be more than one selection in the text
                    const beforeRange = document.createRange();
                    beforeRange.setStart(document.body, 0); // Our target element
                    beforeRange.setEnd(startContainer, startOffset);

                    // Create a temporary container to hold the HTML
                    const container = document.createElement('div');
                    container.appendChild(beforeRange.cloneContents());
                    htmlBefore = container.innerHTML;
                }
            }
            return htmlBefore;
        }
        //+1   Called by BuildDivHTML function.  Returns an array of pure lines (without '\n' signs) from the converted text. I got this code from Bing AI
        function GetParsedHTML(htmlstring) {
            if (!htmlstring.length)
                return "";
            const partsArray = htmlstring.match(/[^<&]+|&[^;]+;|<[^>]+>/g);  // not good /(<[^>]*>)|([^<]+)|(&[a-z]+;)/g  // good /([^<&]+)|(&[^;]+;)|(<[^>]+>)/g
            return partsArray;                     // Returns the array
        }
        //   --            --            --            --             --            --
        //+0   Called by HandleBuffers and by ConvertText functions.  Removes the extra \n's from the text. Based on Bing AI. See remark (2)
        function AdaptNewLineSignsInInnerText(event, str, HTMLCanceled = false) {
            var charsBuffer = $(event.target).data('charsBuffer');
            var lamAlifBuffer = $(event.target).data('lamAlifBuffer');
            var arrayOfLines = GetLinesArray(str); // Divides the text into an array of regular lines (witout '\n')
            var arrayOfNewLineSignsSets = (GetDivPattern(event) == "linkedin div") ? AdaptLinkedInDivExtraNewLineSigns(GetNewLineSignsSetsArray(str)/*, operation, selected*/) : AdaptNormalDivExtraNewLineSigns(GetNewLineSignsSetsArray(str)/*, operation*/); // The array of  successive '\n' sets after eliminating the extra \n's.  remark (7)
            var newArray = [];
            var sumNewArrayLength = arrayOfLines[0];
            for (var i = 0; i < arrayOfLines.length || i < arrayOfNewLineSignsSets.length; i++) {
                if (i < arrayOfLines.length)
                    newArray.push(arrayOfLines[i]);            // Add one array
                if (i < arrayOfNewLineSignsSets.length)
                    if (HTMLCanceled) {
                        newArray.push(" ");
                        ArrangeFlatsBuffer(charsBuffer, lamAlifBuffer);
                    }
                    else
                        newArray.push(arrayOfNewLineSignsSets[i]); // Add '\n' set
                $(event.target).data('lamAlifBuffer', lamAlifBuffer);                   // Storing the array in the attached data attribute of the element
                $(event.target).data('charsBuffer', charsBuffer);
                sumNewArrayLength += arrayOfLines[i].length + 1;
            }
            return newArray.join('');              // Returns string , because join() returns string out of the array
            function ArrangeFlatsBuffer(charsbuffer, lamalifbuffer) {
                charsBuffer = charsbuffer.filter(pos => pos.positionintext </*=*/ sumNewArrayLength/*newArray.length*/)
                    .concat([{ "positiononkeyboard": 0, "key": event.key, "positionintext": sumNewArrayLength/*newArray.length*//* - 1*/, "shifted": true }]).
                    concat(charsbuffer.filter(pos => pos.positionintext >= sumNewArrayLength/*newArray.length*/).map((x, index) => ({ ...x, positionintext: index + sumNewArrayLength/*newArray.length*/ + 1 })));
                lamAlifBuffer = lamalifbuffer.filter(pos => pos.positionintext <= sumNewArrayLength/*newArray.length*/). // Filters(creates) array of the positions till the current position of the converted text , then filters the rest of the array , -
                    concat([{ "positiononkeyboard": 0, "key": event.key, "positionintext": sumNewArrayLength/*newArray.length*//* - 1*/, "shifted": true }]).
                    concat(lamalifbuffer.filter(pos => pos.positionintext > sumNewArrayLength/*newArray.length*/).map((x, index) => ({ ...x, positionintext: index + sumNewArrayLength/*newArray.length*/ + 1 })));
            }
        }
        //   --            --            --            --             --            --
        //+1   Called by AdaptNewLineSignsInInnerText function.   Algorithm to remove the extra '\n' signs in a set of '\n's in text of editable Div of LinkedIn. See remark(8 - same principle)
        function AdaptLinkedInDivExtraNewLineSigns(aray/*, operation, selected = false*/) {    // aray contains the sets of the '\n'
            let count = 0;
            for (let i = 0; i < aray.length; i++) {
                if (aray[i].length == 1 || aray[i].length == 2) //  like in AdaptNormalDivExtraNewLineSigns // b b -> bbE twice had problem with that but now it's ok because I distracted the adaption in previous/ currentNewLinesSets in LegalCharChange()
                    count = 1
                else
                    count = Math.floor((aray[i].length - 5) / 3) + 2;
                aray[i] = '\n'.repeat(count);
            }
            return aray;
        }
        //   --            --            --            --             --            --
        //+1   Called by AdaptNewLineSignsInInnerText function.   Algorithm to remove the extra '\n' signs in a set of '\n's in text of editable Div. See remark(8)
        function AdaptNormalDivExtraNewLineSigns(aray/*, operation*/) {
            for (let i = 0; i < aray.length; i++) {
                let count = 0;
                if (aray[i].length == 1 || aray[i].length == 2)
                    count = 1
                else
                    count = Math.floor(aray[i].length / 2) + 1;
                aray[i] = '\n'.repeat(count);
            }
            return aray;
        }
        //   --            --            --            --             --            --
        //+0    Called  by EditAndDisplayN function.   Returns the last unique substring of the text. For example : s='abc' - returns 'c' , s='abbbcb' - returns 'b', s='abcbbbbb' - returns 'bbbbb' , s='سلاملالالالا' - returns 'لالالالا'
        function GetLastUniqSubString(s, lamalifbuffer) {
            var positionOfJoinedAlif = lamalifbuffer.findIndex(pos => IsJoinedAlif(pos, s.length - 1)); // Checks if the char is a joined alif. If it follows a lam ('ل') that is registered in the buffer , then it is a joined/additional alif
            if (!s || s.length === 0)
                return "";
            let lastUniqSubString = "";
            if (s[s.length - 1] == 'ا' && s[s.length - 2] == 'ل' && positionOfJoinedAlif > -1) // On case 'لا' (pair joined arabic letters gets out from 66 keycode key)
                for (let i = s.length - 1; i > 0; i -= 2)
                    if (s[i] == 'ا' && s[i - 1] == 'ل' && positionOfJoinedAlif > -1)
                        lastUniqSubString += 'لا';
                    else    // When the former  chars are different from pairs of 'لا'
                        return lastUniqSubString;
            else {                                                // If any other case
                lastUniqSubString = s[s.length - 1];
                for (let i = s.length - 1; i > 0; i--)
                    if (s[i] == s[i - 1])
                        lastUniqSubString += s[i];
                    else
                        return lastUniqSubString;
            }
            return lastUniqSubString;
        }
        //   --            --            --            --             --            --
        //+0   Called by EditAndDisplayN function.  Sets and manipulates a hovering message-window. Displays it only while hovering the focused element
        async function SetHoverWindow(event) {
            var first = false;
            var hover = null;
            if (noChangeMade) {
                if (!hoverDiv)               // If hoverDiv is null (hoverDiv is of type Object-element) , then creates the regular hover div
                    hoverDiv = $("<div id = 'general' style = 'direction:ltr;'>Try again.<br>Select the correct languages.<br>Use the keys as recommended.<br>If you use 'ctrl' + '|' , try several times.<br><br><span style='font - size: 10px; line - height: 10px; white - space: pre - wrap; float: right; padding - top: 12px;'> [click to remove]</span>don\'t show again<br><span><canvas id='myCanvas' width='13'; height='13';></canvas></span></div>").addClass("hoveringWindow_gibb107010021066080661060")/*.css("display", *//*"block"*//* display)*/; // the css of the hovering window is in hoverwindow.css
                hover = hoverDiv;
            }
            else
                if (!hoverDivFace_Twit) {      // Creates the facebook/twitter hover div
                    hoverDivFace_Twit = $("<div id = 'face_twit' style = 'background-color:#ccffff;direction:ltr;'>Correction is blocked on Facebook/Twitter.<br>(Click the plug-in icon to get it)<br><span style='font - size: 10px;line-height: 10px;  white - space: pre - wrap;float: right;padding-top:12px;'> [click to remove]</span><input type='checkbox' id ='chck' style = 'margin-top:20px;'><br>don\'t show again</div>").addClass("hoveringWindowF_gibb107010021066080661060");
                    hover = hoverDivFace_Twit;
                }
            chrome.storage.sync.remove("displayStatusDiv", function () { });
            chrome.storage.sync.remove("displayStatusDivFace_Twit", function () { });
            var display = await GetDisplayStatus();
            $(document.body).append(hover);
            hover.css("display", display);
            $('#myCanvas').addClass("hoveringCanvas_gibb107010021066080661060");
            $(hover).css({ "font-size": "16px" });
            $("#chck").on("click", function () { SetDisplayStatus() });
            $("#myCanvas").on("click", function () { SetDisplayStatus() });
            if ($(hover).attr("id") == 'face_twit') {
                $(hover).css({ "display": display });  // On Facebook/Twitter I want to show it till the mouse click
                $(event.target).off("mousemove");
                $(event.target).off("mouseleave");
            }
            else {
                $(event.target).on("mousemove", function () { $(hover).css({ display: display }); }); // Displays when hovering the element
                $(event.target).one("mouseleave", function () { $(hover).css({ display: display }); first = true; }); // Shows when the mouse leaves the element in the first time
                $(event.target).on("mouseleave", function () { leave() }); // Hides when the mouse is out of the element
            }
            //$(hoverChk).css({ "display": display });  // On Facebook/Twitter I want to show it till the mouse click
            function leave() { //---------------------- inner function. Enebles the hover window when the leaving the element the first time. On the next times it will be off
                if (first)
                    $(hover).css({ "display": display })
                else
                    $(hover).css({ "display": "none" });
                first = false;
            }
            function SetDisplayStatus() {   //------------------------ inner function. Sets the hover to visible/invisible according the checkbox
                var checkBox = null;
                if ($(hover).attr("id") == 'face_twit')
                    checkBox = $('#chck');
                document.getElementById("myCanvas"); // "chck" can be the id of the general or facebook/twitter
                var status = "";

                if (checkBox && checkBox.checked || checked) {  // checked is the toggle flag for the demo checkbox of the general hover window
                    status = "none"
                    if (!checkBox/*.checked*/ && checked) { // If it's not of face_twit
                        DrawLine(0, 0, 13, 13);
                        DrawLine(0, 13, 13, 0);
                    }
                    else {
                    }
                    checked = !checked;
                }
                else {
                    status = "block";
                    checked = !checked;
                    if (!checkBox/*.checked && checked*/) {
                        DrawLine(0, 0, 13, 13, status);
                        DrawLine(0, 13, 13, 0, status);
                    }
                }
                new Promise((resolve, reject) => {
                    if ($(hover).attr("id") == 'general')
                        chrome.storage.sync.set({ 'displayStatusDiv': status }, function () {
                            resolve();
                        });
                    else
                        chrome.storage.sync.set({ 'displayStatusDivFace_Twit': status }, function () {
                            resolve();

                        });
                })
            }
            function GetDisplayStatus() { //------------------------ inner function. Gets the visibility status of the hover window
                return new Promise((resolve, reject) => {
                    if ($(hover).attr("id") == 'general')
                        chrome.storage.sync.get('displayStatusDiv', function (data) {             // to display the original text in text area
                            if (data.displayStatusDiv)
                                resolve(data.displayStatusDiv)
                            else   // If the data is empty for some reason
                                resolve("block")
                        })
                    else
                        chrome.storage.sync.get('displayStatusDivFace_Twit', function (data) {             // to display the original text in text area
                            if (data.displayStatusDivFace_Twit)
                                resolve(data.displayStatusDivFace_Twit)
                            else
                                resolve("block")
                        })
                })
            }
            function DrawLine(startX, startY, endX, endY, status) {
                // Get the canvas element and its context
                var canvas = document.getElementById('myCanvas');
                var context = canvas.getContext('2d');
                if (status == "block")
                    context.strokeStyle = 'rgb(255, 255, 237)'
                else
                    context.strokeStyle = 'rgb(0, 0, 0)';
                // Draw the line
                context.beginPath();
                context.moveTo(startX, startY);
                context.lineTo(endX, endY);
                context.stroke();
            }
        }// On clicking anywhere on the page , the hovering window is removed. See last line in function myCallback() in the header of this page

        //+0   Called by EditAndDisplayN function.  Returns the part of the text - before, after and the selected text , by 'part' parameter
        function GetTextSection(event/*, div*/, part) {
            var partOfText = "";
            if (div /*&& !wasSelected*/) {
                var startIndex = GetOffset(event);
                var endIndex = startIndex + Math.abs(GetOffset(event, "focus") - GetOffset(event, "anchor"));
                switch (part) {
                    case "before": partOfText = event.target.innerText.substring(0, startIndex); break;                  // The text that precedes to the selected text
                    case "selected": partOfText = newText; break;                                                       // The selected text
                    case "after": partOfText = event.target.innerText.substring(endIndex, event.target.innerText.length);// The text that follows to the selected text
                }
            }
            else
                switch (part) {
                    case "before": partOfText = originalText.substring(0, event.target.selectionStart); break;
                    case "selected": partOfText = newText; break;
                    case "after": partOfText = originalText.substring(event.target.selectionEnd, event.target.length);
                }
            return partOfText;
        }
        //   --            --            --            --             --            --
        // Returns the offset according the user view , that is , the offset from the beginning of the text. If node_type isn't equal to null it returns the real offset , that is , where the user started the selection
        function GetOffset(event, node_type = null) {          // See more in my answer here : https://stackoverflow.com/questions/78419539/how-to-get-the-start-index-of-a-selected-text-within-a-multiline-text-of-a-div
            let selection = window.getSelection();
            var anchorOffset = GetRealOffset(event, "anchor"); // Gets the offset of start point of the selection
            var focusOffset = GetRealOffset(event, "focus");   // Gets the offset of end point of the selection
            if (!node_type)
                return (anchorOffset < focusOffset) ? anchorOffset : focusOffset // Returns the offset, of the nearest side of the selected text to beginning of the entire text (the 'beginning of the selected text' in the user's point of view)
            else
                return GetRealOffset(event, node_type);
            function GetRealOffset(event, nodetype) {   //---------------- inner function.  Get the real offset of the anchor/focus according to 'npdetype'. Not fit to Twitter
                const node = (nodetype == "anchor") ? selection.anchorNode : selection.focusNode; // Returns the textNode of the node
                let offset = 0;
                let currentNode = node;
                let nodeOffset = (nodetype == "anchor") ? selection.anchorOffset :
                    (currentNode.nodeType === Node.TEXT_NODE) ? selection.focusOffset : 0;        // Initializes nodeOffset to 0 , if ther was no selection
                while (currentNode && currentNode !== event.target) {                             // event.target is the element on which we work now
                    var lastNode = null;
                    while (currentNode) {                                                         // Sums the the text length of the nodes plus the new line chars repressented by the node itself.
                        lastNode = currentNode;
                        currentNode = currentNode.previousSibling;
                        if (currentNode) {              // Conditions where to increase the offset depending on the kinde and the place of the element node
                            if (currentNode !== event.target.firstChild && currentNode !== event.target && currentNode.nodeName !== 'SPAN')
                                offset++;
                            if (currentNode.children && currentNode.children.length && currentNode.children[0].nodeName === 'BR')
                                offset++;
                            if (currentNode.previousSibling && currentNode.previousSibling.nodeName === 'P')// P element has more a new line also in its end
                                offset++;
                            offset += currentNode.textContent.length;
                        }
                    }
                    currentNode = lastNode.parentNode;  // Upleveling to the parent of the anchor/focus node (i.e. from text node to the element node.)
                    if (currentNode !== event.target.firstChild && currentNode !== event.target && currentNode.nodeName !== 'SPAN')
                        offset++;                      // Increases by the length of the newline char ('\n')
                    if (currentNode.previousSibling && currentNode.previousSibling.nodeName === 'P')
                        offset++;
                }
                offset += nodeOffset;                   // Adds the offset within the anchor or the focus node
                return offset;
            }
        }
    }
}
////////////////////////////    Remarks (based on version 1, with some changes)   //////////////////////////////////////////////////


//(01) For example : In LinkedIn there is a shortcut 'shift+@' to tag a member profile. Because we use here ..).off("keydown...
// this will abolish the handler of the shortcut. The namespace (gibb107010021066080661060) which is randomally chosen by me, restricts the
// influence of the event to this contentscript only.

//(02) Why we need to store the details of the previous pressed key ? Because in keydown handler we cann't know the place
//  of the current char, because it is visible only after the handler(the function) is finished. We need this for the compareing in LegalCharChange()
//  Pay attention , that we update current and previous char in EditAndDisplay function.

//(03) If the user erased some part within the text it may corrupt the conversion as the positions in the buffers
// become not relevant, so we should reset(empty) the buffers. The same is when the user added some text not in the orderly way (somewhere in the middle of the text).

//(07) In this function we try the best to prevent confusion in the buffers by reseting them on returning 'false'.
//  if the new char was add orderly in the end of the text we return true.  If some chars are erased from the end of the
//  text (without selecting it) we update the buffer and return true.  Let's see the conditions:
//  If something is changed when some text is selected - so now it is erased(if ctrl isn't pressed) - then return false.
//  Else , if last chars of current and previous are equals , that is , a char erased or added in the middle (but was
//  pushed to the END of the buffer) , so return false.
//  Next.  In LinkedIn when inserting a char after new line('\n') the length of current equates to previous's , so return true.
//  But, if we erase the char after '\n', the lengthes also equate ! in this case we use the next condition to pop the buffer.

//(1) One reason : There are common chars , for example "'" , it can be english , so "'ישא" will be converted to ",hat"
// it can be also hebrew and be convertd to "what". By registering the position of the key on the keyboard we can identify language -
// if "'" is in the position 25 on the board it will be convert to 'w' and not to ','.
// The second reason :In version 2, "shifted" attribute was added to register the shift mode of the char (B / b).

//(1.2) Why to find the language ? Why not to convert according the positiononboard that we have found ?
//  This is because we shouldn't get to CaseOfLamAndAlif function unless fromLanguage or toLanguage equals to 0. That is why we should find the language.

//(1.3) We are storing the originalText records in the browser storage for case the user need it. Then the records appear
// in the multyline textbox (textarea) in Options page.  See documentation in options.js.

//(1.5) We need to promise that records are retrieved from storage. 'chrome.storage.sync.get()' is Asynchronous so it doesn't block the next
//  code from continue, thus SetOriginalTextsForStoring() will return 'records' before it is retrieved.

//(2) Why to remove the extra '\n' (new line signs) ?
//  In linkedin , for example, for the first 'enter' in a 'div' , the text gets 2 '\n', for 2 enters : 5 '\n' , for 3 enters :- 8 '\n' , for 4 :- 11 and so on.
//  Another occurrence is , that if I try to return the converted text into the element, every single '\n' becomes 3 '\n's.
//  It was easier to remove the extra new lines('\n') , then rebuild the converted text with new html to get the adequate format in return.
//  Why, at all, to rebuild the html format ? Because I wanted to keep the original number of lines and the space (\n)
//  between them instead of getting one long line of the text.

//(2.1) In order to convert hebrew to capital english , we should convert it firstly to simple english
//  letters then, in the end of this function, we set it toUpperCase.

//(3) For example : languagesArray[0]=2, languagesArray[1]=3. Assume that fromLanguage now
//  is 3 (Russian),and it is pointed by the second place in the array (place [1] of the array).
//  - Russian is Language no' 3  in the language-list in Options Page and in 'board' array. -
//  toLanguage is 2 (Hebrew) in our example, and it is pointed by [0] position of languagesArray array. After traversing there will be an exchanging between fromLanguage anf toLanguage.

//(4) In arabic there is a problem with the char 'لا' ('B' key). 'لا' is in fact two joined chars : 'ل' and 'ا' (like L and A in English). There are also
//  seperated 'ل'(G key) and 'ا'(H key). If I want to write 'baboon' but wrote mistakingly 'لاشلاخخى' , there are
//  two 'لا's in the word. Now it can be converted to 'baboon' but also to 'ghaghoon'. ( Lam and Alif (ل and ا) are
//  joined automatingly whenever they are appeared in follow (lam, Then alif) ). To solve this we use lamAlifBuffer with the positions of 'لا's(keycode 66).

//(5) If we write 'baboon', the positions of the two 'b' are registered as 0 and 2 in lamAlifBuffer array in HandleBuffersU function.
//  When it is converted to 'لاشلاخخى' the positions now will be 0 and 3 (the positions of first and second 'ل's in 'لاشلاخخى'.
//  Pay attention that 'لا' are two chars - 'ل' + 'ا' joined). We need to update all the positions in lamAlifBuffer
//  and in charsBuffer arrays from the position of the now added/eliminated 'ا' till the end.

//(5.1)  Example: In wrong text "hb,b]" there are two 'b' , so lamAlifBuffer contains now the position 1 in index 0
//  and 3 in index 1. When we convert to arabic the first 'b' becomes 'لا'. Now we cut by filtering the sub array 'charsBuffer[0]
//  then filtering the rest of the array , then updating the positions  by map() , that is , the second index is now contains 4 instead of 3, then we join
//  two parts by concat(). After conversion we get the word "الاولاد"('the sons') with updated lamAlifBuffer. Pay attantion: arabic read from right to left, and 'لا' is two chars.

//(6) It is common in sites that the text elements are of type editable 'Div', that contains inner elements.

//(7) For example : if newText="Hello\n\n\n\n\nBig\nAnd\nVery nice\n\nWorld". The array will contain these
//  sets(of string) : ['\n\n\n\n\n','\n','\n','\n\n'].
//  As well, GetLinesArray(str) returns the lines : ['Hello','Big','And','Very nice','World']

//(8) Let's assume the (original) text is : "Hello\n\n\n\n\nBig\n\nWorld" , that is 5 new lines after 'Hello'
//  and 2 new lines after 'Big'. See in remark(2) that editable Div created extra '\n' signs.
//  In this function we eliminate these extra to the real written "Hello\n\nBig\nWorld".

//(9) 'toUpperCase() makes no effect on hebrew/arabic chars , so if the char isn't of hebrew it mustbe capital.

//(10)  When 'enforceUniformity' is true (by pressing Ctrl+'|') , if by chance the source language doesn't fit
//  the char , the text will be unchangeable by Ctrl+'|'.  By this traversing , if the user makes some trials , the text will be changed.

//(11)  We I don't display the converted text of all sites on pop up ? Why at all to have the converted text
//  in the Options page ?  Two reasons:
//  1. I don't want to display the three last conversions on pop up which was designed for copy-paste.
//  2. I want to direct the user to the Options page and make him remmember to convert more 3 times on
//     secrets , in order to remove the secrets (like password) from the browser storage.

//(12) If the user added a letter within the text, that is, not as usuall at the end of the text, he corrupted by this the
//  coordination between the positions buffers (charsBuffer,lamAlifBuffer) and the text,
//  which makes the converted text confused.
//  Pay attention, here we use oldText value in the keydown handler (ConversionOptions function).





//////////  Legend For The Symbols  ///////////
//  '*'  means this function is a link(joint) in the main process. The number joined is the serial number
//       of this function in the process. The function is ended by calling the next function in the chain of functions till the end function/process.
//  '+'  means this function is a auxiliary(helper) function.  The number joined is the hierarchy level.
//       The lowest function in the branch is ended with no calling.
// '***' End function of the process/chain.

//  For more explanation try to contact me via my LinkedIn profile : https://www.linkedin.com/in/yaakov-whise-1172322b/ , I'll try my best.

//***** Local readMe  ////////
// This application corrects gibberish. For example : typing 'akuo' in English instead of 'שלום' Hebrew.
// Before using, we need to select the languages which we work with , at least 2 languages , from the list on the Options Page.
// To correct the gibberish , press ctrl+ '<' or ctrl+ '|'(of 188 or 220 keyCode). To toggle between capital to normal letters press ctrl+ '>' (190 keyCode).
// See more details in OPTIONS.html file.

// Link to this extension on Microsoft add-ons  :
// https://microsoftedge.microsoft.com/addons/detail/ddahpfaemgfcpjkcaeieidbigomonbhm
// To learn extensions you can go here : https://developer.chrome.com/docs/extensions


