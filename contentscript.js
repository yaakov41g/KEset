///  This contentscript is added to any web page.
///  We check an input or any other editable element and correct its gibberish text.

///  Additional remarks in the bottom of this page.

//////////////////////////////////////////////////  "HEADER" ////////////////////////////////////////////////////

var disableExtension = false;// A flag to indicate activation/deactivation of the conversion
var fromHebrew = false;    // Indicates to change capital letters to hebrew , not to english
var languagesArray = [];   // Array of selected-languages positions in the languages list(or in the languages board table)
var toLanguage = -1;       // The index of the target language
var fromLanguage = -1;     // The index of the original language, the language which we try to convert from.
var originalText = "";     // The text we need to convert
var storedText = [];       // The editted text to be stored for the text-area-element in Options page
var records = [];          // Records of text that are stored in chrome.storage without the serial numbers
var oldText = "";          // Used for comparing to newText
var newText = "";          // The new converted text
var traverser = 0;         // Iterator of languages
var additionSentenceForAlert = "";
var ctrlOrAlt = false;         // A flag to indicate that the (special) char is not a visible one, to prevent inserting it to specialCharsPositions array (I mean to '<','>' and '|' + Ctrl)
var isJoinedAlif = false;      // A flag to sign the current char as the char-doubled 'لا'. We don't need it to be a stored data for each element because it is used within the loop 
var div = false;               // Indicates that the (focused) element is a kind of div (not textarea) element
var textArea = false;          // Indicates that the (focused) element is a kind of text area
var linkedinDiv = false;           // Indicates if the (focused) element is of kind Linkedin site div
var enforceUniformity = false;     // Indicate that Ctrl + '|' were pressed to enforce uniform of language
var NoChangeMade = false;  // A flag to set up the little hovering description-window 
var hoverDiv = null;               // The hovering window. It appears when the user try to convert when the relevant language was not selected

//------------------------------------------ Events mapping --------------------------------------

const intervalID = setInterval(myCallback, 1000);      // This is the pre-srart point. We need to renew the elements' listener - 
                                                       // - for cases that new element was loaded after the page loading (like search-elements that appear after clicking on a button)
function myCallback() {            // Listeners to handle the user presses and clicks. We need the 'off' operation to prevent multiple listeners while the function  myCallback() is called on every 1000 milisecond
    $("input,textarea").off("keydown.gibb107010021066080661060"); // We need to add a namespace in order to avoid abolishing other event listeners on the web. See remark (01)
    $("input,textarea").on("keydown.gibb107010021066080661060",  function (event) { SetBuffersAndFlagsD(event); ConversionOptions(event); });
    $("input,textarea").off("keyup.gibb107010021066080661060");
    $("input,textarea").on("keyup.gibb107010021066080661060", function (event) { SetGetBuffersU(event); }); // Why I use keyup ? See remark (0)
    $('div[contenteditable = "true"]').on("click.gibb107010021066080661060", function (event) { setTimeout(function () { event.target.focus(); }, 0); });  // Enables to keep focus on div editable element(and its included)
    $("div").off("keydown.gibb107010021066080661060");
    $("div[contenteditable='true']").on("keydown.gibb107010021066080661060", function (event) { SetBuffersAndFlagsD(event); ConversionOptions(event); });
    $("div").off("keyup.gibb107010021066080661060");
    $('div[contenteditable="true"]').on("keyup.gibb107010021066080661060", function (event) { SetGetBuffersU(event); });
    $(document.body).on("click.gibb107010021066080661060", function () { $(hoverDiv).remove(); }); // Removing the hovering window by click. It appears when the user try to convert when the relevant language was not selected
}
//---------------------------------------- Getting data/messages  ---------------------------------

chrome.runtime.onMessage.addListener(function (request) { 
    if (request.arrgo == 'selectedLanguages')               // Messages that languages were selected from the list on the Options page
        GetSelectedLanguages();
    if (request.toggled == 'stop')                          // Message via background.js from options.js ; on page activation
        disableExtension = true
    else
        if (request.toggled == 'restart')
            disableExtension = false
        else
            if (request.toggleStatus)                       // Message via background.js from options.js ; on click the popup button
                disableExtension = false
            else
                disableExtension = true;
});
GetSelectedLanguages();                                     // On the page loading
function GetSelectedLanguages() {                           // Here we get the array of languages we want to treat.
    chrome.storage.sync.get('langPosArr', function (data) { // 'chrome.storage.sync.set' is in options.js
        languagesArray = data.langPosArr;
        if (languagesArray != undefined) {
            fromLanguage = languagesArray[0];
            toLanguage = languagesArray[1];
            traverser = 0;
        }
    });
}
chrome.storage.sync.get('enabled', function (data) {         // On the page loading.  "chrome.storage.sync.set('enabled'..." is in options.js
    if (data.enabled)
        disableExtension = true
    else
        disableExtension = false;
});


//---------------------------------------------------------------------------------------------------
//Languages Chars Table.  Of a STANDARD keyboard
var board = []; // Keys of a sequencial order on the keyboard, for each of the 5 languages    
// The 'base' array contains keycodes in the same order of the letters on the languages strings
board["base"] = [32, 192, 49, 50, 51, 52, 53, 54, 55, 56, 57, 48, 189, 187, 220, 221, 219, 80, 79, 73, 85, 89, 84, 82, 69, 87, 81, 65, 83, 68, 70, 71, 72, 74, 75, 76, 186, 222, 191, 190, 188, 77, 78, 66, 86, 67, 88, 90];
board[0] = " ذ1234567890-=\\دجحخهعغفقثصضشسيبلاتنمكطظزوةىلرؤءئ";      // Arabic   The Visual Studio editor mixes the real order of the chars.  // The right '\' is escaped by the left one
board[1] = " `1234567890-=\\][poiuytrewqasdfghjkl;'/.,mnbvcxz";      // English 
board[2] = " ;1234567890-=\\[]פםןוטארק'/שדגכעיחלךף,.ץתצמנהבסז";     // Hebrew  
board[3] = " ё1234567890-=\\ъхзщшгнекуцйфывапролджэ.юбьтимсчя";      // Russian 
board[4] = " `1234567890-=\\][ποιθυτρες;ασδφγηξκλ΄'/.,μνβωψχζ";      // Greek

///////////////////////////////////////////  "BODY"  ////////////////////////////////////////////////////

//*0   See explanations for the signs in the bottom of the page
//  KeyDown event handler.  Sets and initializes data attributes , sets boolean indicators 
function SetBuffersAndFlagsD(event) {
    (event.target.tagName.toUpperCase() == 'INPUT' || event.target.tagName.toUpperCase() == 'TEXTAREA') ? div = false : div = true; // 'div' is a flag to indicate if the focused (target) element is a kind of div
    (event.target.tagName.toUpperCase() == 'TEXTAREA') ? textArea = true : textArea = false;
    originalText = (div) ? event.target.innerText : event.target.value;   // Div is indicator of the element kind
    if (!$(event.target).data('lamAndAlifPositions'))     // 'lamAndAlifPositions' is an array of the positions of arabic 'لا'(key 'B') in the text, this 'لا' equivalent to 'ل'+'ا'(alif + lam in Arabic) see remark (4)   
        $(event.target).data('lamAndAlifPositions', []);  // Sets the element-attached array-data on the first only keydown 
    if (!$(event.target).data('specialCharsPositions'))   // Array of  the positions in text of chars that are common to some languages , like . , / ; etc, that each language has them in different keys , see remark (1)
        $(event.target).data('specialCharsPositions', []);
    (event.ctrlKey || event.altKey) ? ctrlOrAlt = true : ctrlOrAlt = false;
}
//   --            --            --            --             --            --
//*0  KeyDown event handler.  Mainly to navigate by the converting key
function ConversionOptions(event) {              
    var which = event.keyCode;
    originalText = (div) ? event.target.innerText : event.target.value;   // Div is indicator of the element kind
//    oldText = originalText;                               // We use oldText here for comparing the texts of keydown and of keyup 
        //     -----     ------    -------    short-cuts options    ------    ------     ------
    if (event.ctrlKey && (which == 188 || which == 190 || which == 220) && !disableExtension) {// If ctrl + '<' or '>' or '|' were pressed
        if (!languagesArray || languagesArray.length < 2) {//  If not selected 2 languages in Options page
            if (!languagesArray)
                additionSentenceForAlert = "(In next time of wrong script, the conversion will be better.)" // If the user chose less than 2 languages  , if he types letters that are common  , then , when he choses the more one , the correction might be not perfect
            alert("You should select 2 languages at least from Options page list.\nRight click on the plug-in icon , click \'Extention Options\', then select from list.\n" + additionSentenceForAlert);
            additionSentenceForAlert = "";
            return;
        }
        if (which == 190)                 // If Ctrl+ > were pressed. KeyCode of '>' key equal to 190
            ToggleCaps(event)
        else {
            if (which == 220)             // keyCode of '|' key
                enforceUniformity = true; // If there are two different languages mixed in the text (e.g. hello 'םרךג' , the conversion will be 'hello world' instead of 'יקךךם world')
            ConvertText(event);           // Called if which is 188 or 220
        }
    }
} 
//   --            --            --            --             --            --
//*0   KeyUp event handler. Adding here the code that isn't suitted for keydown event. See remark (0)
function SetGetBuffersU(event) {  
    originalText = (div) ? event.target.innerText : event.target.value;
    oldText = newText;
    newText = originalText;               // We use newText here comparing the texts on keydown and on keyup
    var specialCharsPositions = $(event.target).data('specialCharsPositions');
    var lamAndAlifPositions = $(event.target).data('lamAndAlifPositions');
    var which = event.keyCode;
    if ((languagesArray) && (SpecialCharsInclude(board['base'].indexOf(which))) && !ctrlOrAlt && (specialCharsPositions.length < 10000)) { // If the char position is included in the group of the positions of the special chars
        specialCharsPositions.push({ "positiononkeyboard": board['base'].indexOf(which), "positionintext": (div) ? /*See remark (2)*/ RemoveFromString(event, originalText).length - 1 : originalText.length - 1 }); // Pushes positiononkeyboard and the positionintext of a char that is common to some languages , used to determine the right language , see remark(1)
    }
    if ((event.keyCode == 66) && !ctrlOrAlt && (lamAndAlifPositions.length < 10000))
        if (['ا', 'آ', 'أ', 'إ'].indexOf(originalText[originalText.length - 1]) != -1)  // If the inputted key is 'لا' ('B') so the redundant 'ا' of 'لا' is now the checked char
            lamAndAlifPositions.push((div) ? RemoveFromString(event, originalText).length - 2 : originalText.length - 2) // We insert position of the previous joined 'ل' into lamAndAlifPositions
        else
            lamAndAlifPositions.push((div) ? RemoveFromString(event, originalText).length - 1 : originalText.length - 1); // The position of 'b', 'נ', 'ل' or any char on '66' key
    $(event.target).data('lamAndAlifPositions', lamAndAlifPositions);                   // Storing the array in the attached data attribute of the element
    $(event.target).data('specialCharsPositions', specialCharsPositions);
        //     -----     ------    -------    buffers resets    ------    ------     ------
    if (   newText.length >  oldText.length && GetLastUniqSubString(newText) == GetLastUniqSubString(oldText)// If a letter was added but the last substring remains the same , which means that the user inserted a letter within the existing text
        || newText.length <= oldText.length && newText != oldText) {                    // Or if some of the text removed or changed 
        $(event.target).data('lamAndAlifPositions', []);                                // We reset these buffers to prevent confusion in the converted text
        $(event.target).data('specialCharsPositions', []);
    }
    function SpecialCharsInclude(postiononboard) {//------------ inner function.  Detects Chars like ' , . ; /  that are common to some language lines. See remark (1)
        var specialChars = [14, 15, 16, 25, 26, 36, 37, 38, 39, 40]                     // The positions on board of the special/common chars
        return (specialChars.indexOf(postiononboard) > -1) ? true : false;
    }
}
//   --            --            --            --             --            --
//*1   Called by ConversionOptions function.  Toggles between capital(big) letters and normal letters
function ToggleCaps(event) {
    var positionInBoard = -1;
    if (div)                                                       // Only on div, not on textarea or input element
        originalText = RemoveFromString(event, originalText);      // Removing extra new line chars (\n'). See remark (2)
    newText = originalText;
    //    -----     ------   converting from hebrew to english  (see remark 2.1)   ------     ------
    if ((Array.from(originalText).findIndex(char => "אבגדהוזחטיכלמנסעפצקרשתךםןףץ".indexOf(char)>-1)>-1)) { // If we have an hebrew char in the text then toggle to caps and set 'fromHebrew' to true
        newText = "";
        fromHebrew = true;           // Indicates that the current text is hebrew , so when toggling back from capital it will turn back to hebrew, not to english . If the current text is arabic this will not disturb
        for (var i = 0; i < originalText.length; i++) {            // Converts to English
            positionInBoard = board[2].indexOf(originalText[i].toLowerCase());
            HebrewEnglishCaps(1);    // From hebrew to english
        }
    }
    else//-----     ------          converting back from english to hebrew         ------     ------
        if (originalText == originalText.toUpperCase() && (fromHebrew)){// If the text is english capital that toggled from hebrew
            newText = "";
            for (var i = 0; i < originalText.length; i++) {         // Converts to English 
                positionInBoard = board[1].indexOf(originalText[i].toLowerCase());
                HebrewEnglishCaps(2);// From english to hebrew
            }
        }
        else                         // If the text is not capital                       
            fromHebrew = false;     
    //    -----     ------     ------    set to lower/upper case   ------     ------     ------
    newText = (newText === newText.toUpperCase()) ? newText.toLowerCase() : newText.toUpperCase() // Toggle the text to/from capitals; 
    EditAndDisplay(event);           // Edits the converted text and displays it
    function HebrewEnglishCaps(language) {//------------------ inner function.  Converts to english/hebrew
        if (positionInBoard > -1)    // If the source language is found
            newText += board[language].charAt(positionInBoard)   
        else {                       // If it is arabic or signs like '!','@' etc.
            newText += originalText[i];                // The original char is left as it is
            if (board[0].indexOf(originalText[i]) >-1) // If the char is arabic
                fromHebrew = false;
        }
    }
}
//   --            --            --            --             --            --
//*1   Called by ConversionOptions function. Converts the original text and checks if the text is indeed changed. 
function ConvertText(event) {
    var lamAndAlifPositions = $(event.target).data('lamAndAlifPositions');
    var specialCharsPositions = $(event.target).data('specialCharsPositions');
    if (div)                                                 // Only on div, not on textarea or input element
        originalText = RemoveFromString(event, originalText);// Removing extra new-line chars (\n'). See remark (2)
    newText = "";
    for (var i = 0; i < originalText.length; i++) {          // Looping on the text , char by char
        oldText = newText;                                   // We use oldText for AdjustArraysPositions function 
        newText += ConvertOneChar(originalText[i], i, lamAndAlifPositions, specialCharsPositions);// Builds the string of converted chars
        if (newText != "") 
            AdjustArraysPositions(event);
    }
   EditAndDisplay(event);                                   // Edits the converted text and displays it
    LanguagesTraverser();                                   // This helps to roll on the conversion when enforceUniformity is on.  See example in remark (10)
}
//   --            --            --            --             --            --
//+0   Called by ConvertText function. Re-setting positions arrays after conversion the char of 66 keycode ('لا') from/to arabic.  See remark (5) 
function AdjustArraysPositions(event) { 
    var updatedLamAndAlifPositions = $(event.target).data('lamAndAlifPositions');
    var updatedSpecialCharsPositions = $(event.target).data('specialCharsPositions');
    if (newText.length - oldText.length > 1) {          // If 2 chars were added: lam + alif ('لا') of arabic
        updatedSpecialCharsPositions = updatedSpecialCharsPositions.filter(specialPos => specialPos.positionintext <= newText.length - 1 - 1).concat(updatedSpecialCharsPositions.filter(specialPos => specialPos.positionintext > newText.length - 1 - 1).map(x => ({ ...x, positionintext: x.positionintext + 1 }))); // Filters(creates) array of the positions till the -
        updatedLamAndAlifPositions = updatedLamAndAlifPositions.filter(lamAlifPos => lamAlifPos <= newText.length - 1 - 1).concat(updatedLamAndAlifPositions.filter(lamAlifPos => lamAlifPos > newText.length - 1 - 1).map(lamAlifPos => lamAlifPos + 1));                             // - current position of the converted text , then filters the rest of the array , then -
    }                                                                                                                                                                                    // - (continue from above) increases the positionintext in that part and then concatenates(joins) the two parts anew
    else                  
        if (newText.length == oldText.length) {         // If no char was added because the current char was 'ا' and it was removed in this iteration (see in CaseOfLamAndAlif function)
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
        return ConvertRegularChar( char, positionintext, lamandalifpositions);
}
//   --            --            --            --             --            --
//+1   Called by ConvertOneChar function.  Seeks the language of the char , aided by specialCharsPositions array 
function ConvertSpecialChar(char, positionintext, positiononboard) { // See remark (1) why we need to treat special chars
    var positionLower = -1;              // The (lowercase)char position in the checked language line
    var convertedChar = char;
    var j = 0;
    positionLower = board[fromLanguage].indexOf(char.toLowerCase()); // Tries if checked language contains the char
    if ((positionLower != positiononboard))
        if (!enforceUniformity)          // If not  ctrl + '|' were pressed. See above in ConversionOptions function
            do {                         // Tries again by traversing the languages
                j++;
                LanguagesTraverser();    // Sets the next pair of from-to languages
                positionLower = board[fromLanguage].indexOf(char.toLowerCase()); // Tries the language
                if (positionLower == positiononboard)
                    convertedChar = SetUpperOrLowerCase(char, positionintext, positionLower, true)
                else                     // Try again next language
                    convertedChar = char;// We need this only to prevent "undefined" returned in unexpected case
            } // Continue to seek the language that includes the char in the same position as it is registered in specialcharspositions array
            while ((j < languagesArray.length + 1) && (positionLower != positiononboard))
        else                            // If the char was found in the fromLanguage line
            convertedChar = SetUpperOrLowerCase(char, positionintext, -1, true);
    else                                // If the char was found in the fromLanguage line
        convertedChar = SetUpperOrLowerCase(char, positionintext, positionLower, true);
    return convertedChar;
}
//   --            --            --            --             --            --
//+1   Called by ConvertOneChar function.  Seek the language of the char in order to find its place in the language line
function ConvertRegularChar(char, positionintext, lamandalifpositions) {
    var j = 0;
    var positionLower = -1;
    var convertedChar = char;
    positionLower = board[fromLanguage].indexOf(char.toLowerCase());
    if ((positionLower == -1) && !enforceUniformity) // If the checked language isn't including the checked char even when it is lowered , and the user didn't use Ctrl+'|' in order to enforce uniformity.  . See above in ConversionOptions function
        do {                             // While we didn't find the char's language
            j++;
            LanguagesTraverser();        // Set the next pair of from-to languages
            positionLower = board[fromLanguage].indexOf(char.toLowerCase());
            if (positionLower != -1)     // If original language of the char is found
                convertedChar = SetUpperOrLowerCase(char, positionintext, positionLower, false, lamandalifpositions); // converts and formats the char
            else                         // If the char isn't included not as normal nor as capital form in the current checked language
                convertedChar = char;
        }
        while ((j < languagesArray.length + 1) && (convertedChar == char)) // If converted char is same as the original, that is, the language was not found
    else                                 // If the char was found in the fromLanguage line
        convertedChar = SetUpperOrLowerCase(char, positionintext, positionLower, false, lamandalifpositions);
    return convertedChar;
}
//   --            --            --            --             --            --
//+2   Called by ConvertSpecialChar, ConvertRegularChar functions.  Sets the format of the char while converting it to the destined language
function SetUpperOrLowerCase(char, positionintext, positioninlanguage, isspecialchar, lamandalifpositions) {
    var convertedChar = char;
    if (positioninlanguage != -1) // If fromLanguage is found , else convertedChar = char
            convertedChar = SetTheNewChar();
    return convertedChar;
    function SetTheNewChar() {   //------ inner function.   Checks if arabic is involved  
        if (!isspecialchar && (fromLanguage == 0 || toLanguage == 0))
                convertedChar = CaseOfLamAndAlif(char, positionintext, lamandalifpositions);
            else                // If arabic isn't involved
                convertedChar = SetFormat();
        return convertedChar;
        function SetFormat() {  //------ inner of inner function
            if (char != char.toLowerCase())   // If the char is capital
                convertedChar = board[toLanguage].charAt(positioninlanguage).toUpperCase()
            else                              // If it is not capital
                convertedChar = board[toLanguage].charAt(positioninlanguage); // Converts to the destination language
            return convertedChar;
        }
    }
}
//   --            --            --            --             --            --
//+2   Called by ConvertSpecialChar, ConvertRegularChar functions.  Sets the next to-from languages indexes in the selected-languages array(languagesArray) which contains the positions of the languages in the list (see remark (3))
function LanguagesTraverser() {                // Moving the to-from pairs circularilly
    fromLanguage = languagesArray[traverser];  // The source(original) language
    if (traverser < languagesArray.length - 1)
        traverser++
    else
        traverser = 0;
    toLanguage = languagesArray[traverser];    // The destination language (to which to convert to)
}
//   --            --            --            --             --            --
//+3   Called by SetUpperOrLowerCase function.   Adjusting case of 'لا'. See remark (4)
function CaseOfLamAndAlif(char, positionintext, lamandalifpositions) {  
    var positionInLamAndAlifArray = lamandalifpositions.indexOf(positionintext);
    var convertedChar = char; 
    char = char.toLowerCase();
    if (toLanguage == 0)                                // If we try to convert to arabic
        if (positionInLamAndAlifArray > -1) {// If the position of the char is registered in lamAndAlifPositions array
            convertedChar = 'ل' + 'ا' // = 'لا'
        }
        else                                            // If the char isn't of the 66 keycode key(like 'B' ,  'נ',  'и' etc.)
            convertedChar = board[0][board[fromLanguage].indexOf(char)] // board[arabic][the position of the char in the language line]
//      -----     ------    -------      to convert from arabic         ------    ------     ------
    else                                     
        if (positionInLamAndAlifArray > -1) {// Key 'لا' (of sixty six keycode) was pressed so char='ل'
            isJoinedAlif = true;                        // There is a redundant 'ا' (alif) following the current ('ل')
            convertedChar = board[toLanguage][43];      // The key of keycode 66 (like 'B' etc.) is in the position 43 on the board[language line]
        }
        else {
            if (['ا', 'آ', 'أ', 'إ'].indexOf(char) > -1)// If the char is kind of 'alif'
                if (isJoinedAlif)
                    convertedChar = ""                  // If the alif is redundant of 'لا' then remove it
                else                                    // If it is one of the 'alif's , but was written by kecode 72 key (like 'H' etc.) so it was written deliberately(in intention)
                    convertedChar = board[toLanguage][32]; // The key of keycode 72 keycode (like 'ا','H' etc.) is in the position 32 on the board line
            else                            // If char is not the registered 'ل' nor 'ا'
                if (board[0].indexOf(char) > -1)
                    convertedChar = board[toLanguage][board[0].indexOf(char)]
                else                        // not really needed
                    convertedChar = char;
            isJoinedAlif = false;
        }
    return convertedChar;
}
//   --            --            --            --             --            --
//(***) Called by ConvertText and ToggleCaps.  Formats the whole converted text, displays it and alerts about unsucceeded conversion
async function EditAndDisplay(event) {
//     -----     ------    ------              miscellaneous              ------    ------     ------
    var hostName = window.location.hostname;
    if (hoverDiv)                     // If The hover_window div element exists
        hoverDiv.remove();            // Removing(deleting)  the hovering window.
    hoverDiv = null;
    enforceUniformity = false;
    chrome.storage.sync.set({ popupText: "" }, function () { });       // Reseting data of the textarea in the Popup page
    chrome.storage.sync.set({ records: await SetOriginalTextForStoring() }, function () { }); // Storing data for the textarea in the Options page. See remark (1.1)
    if (newText == originalText)
        NoChangeMade = true           // No change was made in text after trying to convert by all selected languages 
    else
        NoChangeMade = false;
    //     -----     ------          if text was not converted || Facebook/Twitter        ------     ------
    if (/^(www\.)?facebook\.com$/.test(hostName) || /^(www\.)?twitter\.com$/.test(hostName) || NoChangeMade) { // Why to display only Facebook/Twitteer text on pop up ? See remark (11)          
        if (/^(www\.)?facebook\.com$/.test(hostName) || /^(www\.)?twitter\.com$/.test(hostName)) {
            window.getSelection().selectAllChildren(event.target);
            chrome.storage.sync.set({ popupText: newText }, function () { // Stores the converted text from facebook for the textarea in the Popup page\
            });
        }
        SetHoverWindow(event);      // Creates and displays hovering message-window and leaves the text as it is
    }
    //     -----     ------    -------         if text was converted       ------    ------     ------
    else {                          // Displays the converted text after giving it the appropriate pattern. See the end of remark (2)
        if ((Array.from(newText).findIndex(char => "אבגדהוזחטיכלמנסעפצקרשתךםןףץابتثجحخدذرزسشصضطظعغفقكلمنهوي".indexOf(char) > -1) > -1))  // Sets the direction of the text
            $(event.target).css("direction", "rtl");
        else
            $(event.target).css("direction", "ltr");
        NoChangeMade = false;                   
    //     -----     ------    -------     displaying the corrected text    ------    ------     ------
        (div) ? event.target.innerHTML = (GetDivPattern(event) == "linkedin div") ? BuildLinkedInDivHTML(newText) : BuildDivHTML(newText) : event.target.value = newText; // Displays the coverted text. This line is a nested ternary operator
        // Sets the place of the caret(the writing-point marker) to the end of the text
        (div) ? SetCaretPosition(event.target) : event.target.setSelectionRange(newText.length, newText.length);
    }
    async function SetOriginalTextForStoring() {//--------------- inner function. Builds the records set to be displayed in Options page text area
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
                        records = Object.values(data.records);// Converts data.records to array
                    resolve(records);                         // Returns the records only after updating from storage
                });
            })
        } // End of PromiseStorage_Get
    } // End of SetOriginalTextForStoring
} //*** End point of the conversion proccedure chain ***/
//   --            --            --            --             --            --
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
//+0   Called by EditAndDisplay function.   Gives the converted text the appropriate construction before displaying (only for LinkedIn site div).  See end of remark (2), remark (6)
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
function BuildDivHTML(str) {        
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
            if (count > 1)
                html += "<div><br></div>".repeat(count - 1);// <div><br></div> creates new line within the contenteditable div 
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
    let arrayOfNewLineSignsSets = (GetDivPattern(event) == "linkedin div") ? RemoveLinkedInDivExtraNewLineSigns(GetNewLineSignsSetsArray(str)) : RemoveNormalDivExtraNewLineSigns(GetNewLineSignsSetsArray(str)); // The array of  successive '\n' sets after eliminating the extra \n's.  Remark (7)
    let newArray = [];
    for (let i = 0; i < arrayOfLines.length || i < arrayOfNewLineSignsSets.length; i++) {
        if (i < arrayOfLines.length)
            newArray.push(arrayOfLines[i]);            // Add one array
        if (i < arrayOfNewLineSignsSets.length)
            newArray.push(arrayOfNewLineSignsSets[i]); // Add '\n' set
    }
    return newArray.join('');              // Returns string , because join() returns string out of the array
}
//   --            --            --            --             --            --
//+1   Called by RemoveFromString function.   Algorithm to remove the extra '\n' signs in a set of '\n's in text of editable Div of LinkedIn. See remark(8 - same principle)
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
//   --            --            --            --             --            --
//+0    Called  by EditAndDisplay function.   Returns the last unique substring of the text. For example : s='abc' - returns 'c' , s='abbbcb' - returns 'b', s='abcbbbbb' - returns 'bbbbb' , s='سلاملالالالا' - returns 'لالالالا'
function GetLastUniqSubString(s) {
    if (!s || s.length === 0)
        return "";
    let lastUniqSubString = ""; 
    if (s[s.length - 1] == 'ا' && s[s.length - 2] == 'ل') // On case 'لا' (pair joined arabic letters gets out from 66 keycode key)
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
    $(event.target).mousemove(function () { $(hoverDiv).css({ display: "block" }); }); // Displays when hovering the element
    $(event.target).mouseleave(function () { $(hoverDiv).css({ display: "none" }); }); // Hides when the mouse is out of the element
}// On clicking anywhere on the page , the hovering window is removed. See last line in function myCallback() in the header of this page



//////////////////////////////////////////    Remarks    //////////////////////////////////////////////////

//(0) Why keyup ? Why we don't use keydown event only ?
// This is because the keydown handler is performed before the char is displayed, so we can't use line
// like: "originalText = (div) ? event.target.innerText : event.target.value;" because the char isn't appeared yet in the element.

//(01) For example : In LinkedIn there is a shortcut 'shift+@' to tag a member profile. Because we use here ..).off("keydown...
// this will abolish the handler of the shortcut. The namespace (gibb107010021066080661060) which is randomally chosen by me, restricts the
// influence of the event to this contentscript only.

//(02) If the user erased some part from the text it may corrupt the conversion as the positions in these arrays
// become not relevant, so we should reset(empty) the arrays. The same is when the user added some text (somewhere in the middle of the text).

//(1) What is the problem with common chars like "'" , "." , ";" etc. ?
// We cann't decide from which language to convert. Example : if the user writes "'ישא" instead of "what" , when
// we begin to convert the first letter , which is "'" , it can be english or hebrew letter , so "'ישא"
// might be converted to ",hat" instead of "what" or the word ",usv" to "ודה' " instead of "תודה".

//(1.1) We are storing the originalText records in the browser storage for case the user need it. Then the records appear
// in the multyline textbox (textarea) in Options page.  See documentation in options.js.

//(1.2) We need to promise that records are retrieved from storage. 'chrome.storage.sync.get()' is Asynchronous so it doesn't block the next
//  code from continue, thus SetOriginalTextForStoring() will return 'records' before it is retrieved.

//(2) Why to remove the extra '\n' (new line signs) ?
//  In linkedin , for example, for the first 'enter' in a 'div' , the text gets 2 '\n', for 2 enters : 5 '\n' , for 3 enters :- 8 '\n' , for 4 :- 11 and so on.
//  Another occurrence is , that if I try to return the converted text into the element, every single '\n' becomes 3 '\n's.
//  It was easier to remove the extra new lines('\n') , then rebuild the converted text with new html to get the adequate format in return.
//  Why, at all, to rebuild the html format ? Because I wanted to keep the original number of lines and the space (\n)
//  between them instead of getting one long line of the text.

//(2.1) In order to convert hebrew to capital english , we should convert it firstly to simple english
//  letters then , in the end of this function, we set it toUpperCase.

//(3) For example : languagesArray[0]=2, languagesArray[1]=3. Assume that fromLanguage now
//  is 3 (Russian),and it is pointed in the second place in the array ([1] of the array).
//  - Russian is Language no' 3  in the language-list in Options Page and in 'board' array. -
//  toLanguage is 2 (Hebrew) in our example, and it is pointed by [0] position of languagesArray array. After traversing there will be an exchanging between fromLanguage anf toLanguage.

//(4) In arabic there is a problem with the char 'لا' ('B' key). 'لا' is in fact two joined chars : 'ل' and 'ا' (like L and A in English). There are also
//  seperated 'ل'(G key) and 'ا'(H key). If I want to write 'baboon' but wrote mistakingly 'لاشلاخخى' , there are
//  two 'لا's in the word. Now it can be converted to 'baboon' but also to 'ghaghoon'. ( Lam and Alif (ل and ا) are
//  joined automatingly whenever they are appeared in follow (lam, Then alif) ). To solve this we use the buffer lamAndAlifPositions with the positions of 'لا's(keycode 66).

//(5) If we write 'baboon', the positions of the two 'b' are registered as 0 and 2 in lamAndAlifPositions array in SetGetBuffersU function.
//  When it is converted to 'لاشلاخخى' the positions now will be 0 and 3 (the positions of first and second 'ل's in 'لاشلاخخى'.
//  Pay attention that 'لا' are two chars - 'ل' + 'ا' joined). We need to update all the positions in lamAndAlifPositions
//  and in specialCharsPositions arrays from the position of the now added/eliminated 'ا' till the end.

//(5.1)  Example: In wrong text "hb,b]" there are two 'b' , so lamAndAlifPositions contains now the position 1 in index 0
//  and 3 in index 1. When we convert to arabic the first 'b' becomes 'لا'. Now we cut by filtering the sub array 'specialCharsPositions[0]
//  then filtering the rest of the array , then updating the positions  by map() , that is , the second index is now contains 4 instead of 3, then we join
//  two parts by concat(). After conversion we get the word "الاولاد"('the sons') with updated lamAndAlifPositions. Pay attantion: arabic read from right to left, and 'لا' is two chars.

//(5.2) In function CaseOfLamAndAlif we set the flag isJoinedAlif differ between the 'ل' of lam + alif ('لا') and
//  the seperated 'ل' of keycode 71 (key 'g' in english , 'ע' in hebrew etc.). We need to use Code66CharsInclude() for non arabic chars of 66 keycode.

//(6) It is common in sites that the text elements are of type editable 'Div', that contains inner elements.

//(7) For example : if newText="Hello\n\n\n\n\nBig\nAnd\nVery nice\n\nWorld". The array will contain these
//  sets(of string) : ['\n\n\n\n\n','\n','\n','\n\n'].
//  As well, GetLinesArray(str) returns the lines : ['Hello','Big','And','Very nice','World']

//(8) Let's assume the (original) text is : "Hello\n\n\n\n\nBig\n\nWorld" , that is 5 new lines after 'Hello'
//  and 2 new lines after 'Big'. See in remark(2) that editable Div created extra '\n' signs.
//  In this function we eliminate these extra to the real written "Hello\n\nBig\nWorld".

//(9) 'toUpperCase() makes no effect on hebrew/arabic chars , so if the char isn't of hebrew it mustbe capital.

//(10)  When 'enforceUniformity' is true (by pressing Ctrl+'|') , if by chance the source language doesn't fit
//  the char , the text will remain as it is.  By this traversing , if the user makes some trials , the text will be changed.

//(11)  We I don't display the converted text of all sites on pop up ? Why at all to have the converted text
//  in the Options page ?  Two reasons:
//  1. I don't want to display the three last conversions on pop up which was designed for copy-paste.
//  2. I want to direct the user to the Options page and make him remmember to convert more 3 times on
//     secrets , in order to remove the secrets (like password) from the browser storage.

//(12) If the user added a letter within the text, that is, not as usuall at the end of the text, he corrupted by this the
//  coordination between the positions buffers (specialCharsPositions,lamAndAlifPositions) and the text,
//  which makes the converted text confused.
//  Pay attention, here we use oldText value in the keydown handler (ConversionOptions function).





//////////  Legend For The Symbols  ///////////
//  '*'  means this function is a link(joint) in the main process. The number joined is the serial number
//       of this function in the process.
//  '+'  means this function is a auxiliary(helper) function.  The number joined is the hierarchy level.

//  For more explanation try to contact via my LinkedIn profile : https://www.linkedin.com/in/yaakov-whise-1172322b/ , I'll try my best.

//***** Local readMe  ////////
// This application corrects gibberish. For example : typing 'akuo' in English instead of 'שלום' Hebrew.
// Before using, we need to select the languages which we work with , at least 2 languages , from the
// list on the Options Page.
// To correct the gibberish , press ctrl+< or ctrl+ |(of 188 or 220 keyCode). To toggle between capital to normal letters press ctrl+ > (190 keyCode).
// See more details in OPTIONS.html file.


