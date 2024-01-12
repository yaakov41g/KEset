//@@@@@@@@@@@@@@@@@@@@@@@@@ 12/01/2024 the now version
//@@@@@@@@@@@@@@@@@@@@@@@@@ The code here is copied to contentscriptCopy24_04.js , and it is based on contentscriptCopy24_0.js

//@@@@@@@@@@@@@@@@@@@@@@@@@ In line 153 I added "toLowerCase()"


///  This content is injected to the web page.
///  We check an input or any editable element and correct its gibberish.

///  Additional explanation remarks are appeared in the bottom.


var fromHebrew = false;    // Indicates to change capital letters to hebrew , not to english
var languagesArray = [];   // Array of selected-languages positions in the languages list(or in the table)
var toLanguage = -1;       // The position of the target language
var fromLanguage = -1;     // The position of the original language
var previousFromLanguage = fromLanguage; // Used to remmeber the last fromLanguage
var originalText = "";     // The text we need to convert
var previousOriginalText = "";
var newText = "";          // The new text
var traverser = 0;         // Iterator of languages
var traverserCounter = 0;
var specialCharsPositions = [];// Array of the positions of common chars in some languages , like ',' , that each language has them in different key , see remark (1)
var alifAndLam = [];           // Array of the positions of arabic 'لا'(key 'B') in the text, this equivalents to 'ل'+'ا'(alif +lam in Arabic) see remark (4)
var alif66 = 0;                // Used to elimenate extra position indexes of 'لا'
var keysCounter = -1;          // A keys presses counter , used for alifAndLam buffer
var alifAndLamCounter = 0;
var div = false;               // Indicates if the (focused) element is of kind div or input(or textarea) element
var linkedinDiv = false;       // Indicates if the (focused) element is of kind linkedin div
var additionSentenceForAlert = ""; // Used for alert message
var enforceUniformity = false;  // Used to indicate that Ctrl + '|' were pressed to enforce uniform of language
var feedbackNoChangeMade = true;// Used to set up the little hovering description-window 
var hoverDiv = null;            // The hovering window.    It appears when the user try to convert when the language was not selected 

const intervalID = setInterval(myCallback, 1000);   // This is the srart point, We need to renew the elements' listener -
// - for cases that new element was loaded after the page's loading (like search-element)
function myCallback() {   // Listeners to handle the user presses and clicks. We need the 'off' operation to prevent multiple listeners while the function is called on every second
    $("input,textarea").off("keydown.gibberishyak11"); // We need to add a namespace in order to avoid abolishing other keyup listeners on the web. See remark (01)
    $("input,textarea").on("keydown.gibberishyak11", function (event) { ConvertOptions(event); });
    $("input,textarea").off("keyup.gibberishyak11");   // Prevents multiple event registrations by every calling of function myCallback()
    $("input,textarea").on("keyup.gibberishyak11", function (event) { CheckPressedKeys(event); }); // Why I use keyup ? See remark (0)
    $('div[contenteditable = "true"]').on("click.gibberishyak11", function (event) { setTimeout(function () { event.target.focus(); }, 0); });  // Enables to keep focus on div editable element(and its included)
    $("div").off("keydown.gibberishyak11");
    $("div").on("keydown.gibberishyak11", function (event) { ConvertOptions(event); });
    $("div").off("keyup.gibberishyak11");
    $('div[contenteditable="true"]').on("keyup.gibberishyak11", function (event) { CheckPressedKeys(event); });
    $(document.body).on("click.gibberishyak11", function () { $(hoverDiv).remove(); }); // Removing the hovering window by click. It appears when the user try to convert when the language was not selected
}

// Gets the message from background.js , on activation
chrome.runtime.onMessage.addListener(function (request, sender, sendresponse) {
    if (request.arrgo == 'selectedLanguages')
        GetSelectedLanguages();
});

GetSelectedLanguages();
function GetSelectedLanguages() {
    chrome.storage.sync.get('langPosArr', function (data) {  // 'chrome.storage.sync.set' is in options.js
        // Here we get the array of languages we want to treat.
        languagesArray = data.langPosArr;
        if (languagesArray != undefined) {
            fromLanguage = languagesArray[0];
            toLanguage = languagesArray[1];
        }
    });
}

//Languages Letters Table.  Of a STANDARD keyboard
var board = []; // Sequencial order of keys on keyboard for each of the 5 languages    
// The 'base' line is of keycodes suited to the letters on the language lines , in the same order
board["base"] = [32, 192, 49, 50, 51, 52, 53, 54, 55, 56, 57, 48, 189, 187, 220, 221, 219, 80, 79, 73, 85, 89, 84, 82, 69, 87, 81, 65, 83, 68, 70, 71, 72, 74, 75, 76, 186, 222, 191, 190, 188, 77, 78, 66, 86, 67, 88, 90];
board[0] = " ذ1234567890-=\\دجحخهعغفقثصضشسيبلاتنمكطظزوةىلرؤءئ";      // Arabic  //posision 4 at the full list.  // The visual studio editor mixes the real order of the chars.  // The right '\' is escaped by the left one
board[1] = " `1234567890-=\\][poiuytrewqasdfghjkl;'/.,mnbvcxz";      // English //posision 26 at the full list
board[2] = " ;1234567890-=\\[]פםןוטארק'/שדגכעיחלךף,.ץתצמנהבסז";     // Hebrew  //posision 55 at the full list
board[3] = " ё1234567890-=\\ъхзщшгнекуцйфывапролджэ.юбьтимсчя";      // Russian //posision 101 at the full list
board[4] = " `1234567890-=\\][ποιθυτρες;ασδφγηξκλ΄'/.,μνβωψχζ";      // Greek

//---------------------------------------------------------------------------------------------------
function ConvertOptions(event) {         // Keydown handler , mainly to navigate according the converting key 
    var which = event.keyCode;
    if (event.ctrlKey && (which == 188 || which == 190 || which == 220)) { // If ctrl + '<' or '>' or '|' were pressed
        if (alifAndLamCounter == 0) // Only when the text was inputted
            alifAndLamCounter = originalText.length - (keysCounter+1)/* - 1*/; // keysCounter is initialized to -1
        if (hoverDiv)                    // The hover_window div element
            hoverDiv.remove();           // Removing(deleting)  the hovering window. See remark(9)
        hoverDiv = null;
        if (originalText != "")
            chrome.storage.sync.set({ originText: originalText }, function () { }); // Storing for the textarea in the Options page.
        if (languagesArray == undefined || languagesArray.length < 2) { //  If not selected 2 languages in Options page
            alert("You should select 2 languages at least from options page list.\nRight click on the plug-in icon , click \'Extention Options\', then select from list." + additionSentenceForAlert);
            additionSentenceForAlert = "";
            return;
        } // If Ctrl+ > were pressed
        if (which == 190)                 // KeyCode of '>' key equal to 190
            ToggleCaps(event)
        else {
            if (which == 220)             // keyCode of '|' key
                enforceUniformity = true; // If there is two different languages in the text (e.g. hello 'םרךג' , the conversion will be 'hello world' instead of 'יקךךם world')
            ConvertText(event);           // The next function in the sequential proccedure , called if which=188 or 220
            enforceUniformity = false;
        }
    }
}
//---------------------------------------------------------------------------------------------------
function CheckPressedKeys(event) {       // The keyup handler , to accomplish code that isn't suitted for keydown event. See remark (0)
    var which = event.keyCode;
    originalText = (div) ? event.target.innerText : event.target.value;
    if (originalText.length == 0) {
        keysCounter = -1; // keysCounter is resetted on first key pressing in the empty element
        alifAndLamCounter = 0; // alifAndLamCounter is resetted on first key pressing in the empty element
    }
    if ((board["base"].indexOf(which) != -1) && (!event.ctrlKey))
        keysCounter++;                   // To set positions in alifAndLam buffer 
    (event.target.tagName.toUpperCase() == 'INPUT' || event.target.tagName.toUpperCase() == 'TEXTAREA') ? div = false : div = true;
    originalText = (div) ? event.target.innerText : event.target.value;
    previousOriginalText = originalText; // originalText's value will be changed
    if (([221, 219, 81, 87, 186, 222, 191, 190, 188].indexOf(event.keyCode) != -1) && ((languagesArray != undefined)) && (GetSpecialChars().indexOf(event.key) != -1) && !(event.ctrlKey) && (specialCharsPositions.length < 10000))
        specialCharsPositions.push({ "key": which, "position": (div) ? /*See remark (2)*/ RemoveFromString(event, originalText).length - 1 : originalText.length - 1 }); // Pushes key and position of char that is common to some languages , used to determine the right language , see remark(1)
    if (([81, 87, 186, 222, 191, 190, 188].indexOf(event.keyCode) != -1) && (languagesArray == undefined || languagesArray.length < 2) && !(event.ctrlKey || event.shiftKey))
        additionSentenceForAlert = "In next time of wrong script, the convertion will be better." // If the user chose less than 2 languages  , if he types letters that are common  , then , when he choses the more one , the correction might be not perfect
    if (([66].indexOf(event.keyCode) != -1) && !(event.ctrlKey || event.shiftKey || event.altKey) && (alifAndLam.length < 10000))
        alifAndLam.push(keysCounter);    // If the code of the pressed key is 66 ,that is 'لا' in arabic ('B') , pushes the position of this char/s in the buffer , see remark (4)
}
//   --            --            --            --             --            --
//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ There is an unchecked change i line 153 @@@@@@@@@@@@@@@@@@@@@@@@
//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ There is an unchecked change i line 225 @@@@@@@@@@@@@@@@@@@@@@@@
//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ to change manifest to 24_0 @@@@@@@@@@@@@@@@@@@@@@@@@@@@@
function ToggleCaps(event) {    // Toggles between capital(big) letters and normal letters. Called by ConvertOptions function
    var positionInBoard = -1;
    if ((originalText != originalText.toLowerCase())) {      // If the text is of big letters
        originalText = originalText.toLowerCase();
        if (fromHebrew) {                                    // if current text was toggled from hebrew
            newText = "";
            for (var i = 0; i < originalText.length; i++) {  // After lowering the text , converting to hebrew
                positionInBoard = board[1].indexOf(originalText[i]);
                if (positionInBoard != -1)
                    newText += board[2].charAt(positionInBoard); // Converts to the english capital
            }
        }
    }
    else // If normal(not capital) letters
        if (!UpperCaseLanguage(originalText)) {               // If the text is of hebrew (arabic isn't relevant here).  // If the char is capital or shifted. See remark (9) about hebrew/arabic
            newText = "";
            for (var i = 0; i < originalText.length; i++) {
                positionInBoard = board[2].indexOf(originalText[i]); // Tries if text is hebrew 
                if (positionInBoard != -1)
                    newText += board[1].charAt(positionInBoard)// Converts to english
                else
                    newText += originalText[i];                // We leaves the char as it is 
            }
            fromHebrew = true;   // Indicates that the current text is hebrew , so when toggling back from capital it will turn to hebrew ,not english
        }
        else
            fromHebrew = false;  // Then toggling back to english
    if (!fromHebrew) // We can't get back the hebrew text , it will not get uppercase. See what happens in next lines. See remark (10)
        // Text is initialized to 0 till now , so we need to set it to the value in the element
        newText = (event.target.tagName.toUpperCase() == 'INPUT' || event.target.tagName.toUpperCase() == 'TEXTAREA') ? event.target.value : event.target.innerText;
    newText = (newText === newText.toUpperCase()) ? newText.toLowerCase() : newText.toUpperCase(); // Toggling, not works for hebrew
    EditAndDisplay(event);                   // Edits the converted text and displays it
}

//   --            --            --            --             --            --
function ConvertText(event) { // Converts the original text and checks if the text is indeed changed. Called by ConvertOptions function
    alif66 = 0;
    traverserCounter = 0;     // Used to stop loop when we have gone through all of the selected languages
    var stop = false;         // To stop the 'while' loop
    originalText = RemoveFromString(event, originalText); // Removing extra new line chars (\n')
    var text_Origin = (div) ? originalText : previousOriginalText;
    newText = text_Origin; 
    // Trying again if there was not a change after convertion; by the conditions
    while ((newText == text_Origin)/* && (isHebrewOrArabic)) || ((newText == text_Origin) && (!isHebrewOrArabic)) && ((text_Origin != text_Origin.toUpperCase()) || (text_Origin != text_Origin.toLowerCase())))*//*in case of caps chars)*//* */&& (!stop)/* || (newText == ""))in the first time newText="" */) { //synchronizing between toLang and the text
        traverserCounter++;
        LanguagesTraverser();  // Gets the next pair of 'to' and 'from' languages
        newText = "";
        for (var i = 0; i < text_Origin.length; i++) {                         // Looping on the text
            newText += ConvertOneChar(text_Origin[i], i); // Adds the converted char
        } 
        if ((traverserCounter >= languagesArray.length + 1) || (newText == "")) { // If we have gone through all selected languages
            if (newText != "")
                feedbackNoChangeMade = true; // No change in text after trying convertion by all selected languages 
            stop = true;                     // Stop 'while' loop
        } 
        else
            feedbackNoChangeMade = false;
        previousFromLanguage = fromLanguage; // We need this to overcome  case of common keys  , like hebrew-russiun dot('.') or english-russian 'c'
    } 
    EditAndDisplay(event);                   // Edits the converted text and displays it
}
//   --            --            --            --             --            --
function ConvertOneChar(char, positionInText) { // Converts a char by searc
    var positionLower = -1;
    var positionInBase = -1; // Position in board[base]
    var convertedChar = "";
    positionInText = AdjustPosition(positionInText);
    if ((GetSpecialChars().indexOf(char) != -1) && (languagesArray.length >= 2)) { // See remark (1) 
        for (var i = specialCharsPositions.length - 1; i >= 0; i--)         // Searches 'specialChars' buffer for char position(in text) and char keycode
            if (positionInText == specialCharsPositions[i].position) {
                positionInBase = board["base"].indexOf(specialCharsPositions[i].key); // We get the position of char in the language line (e.g. board[fromLanguage]) by the position of its keycode in board[base] which are parallel
                var j = 0;
                if ((board[fromLanguage].indexOf(char.toLowerCase()) != positionInBase)) // Trys to find the language of the char
                    do {
                        j++;
                        LanguagesTraverser();  // Set the next pair of from-to languages
                        if (fromLanguage == 0 || toLanguage == 0) // If arabic is involved
                            convertedChar = CaseOfLamAndAlif(char, positionInText);
                    } // Do while the current checked language isn't including the char in the specific position
                    while ((j < languagesArray.length) && (board[fromLanguage].indexOf(char.toLowerCase()) != positionInBase))
                else  // If suitted language was found
                    if (fromLanguage == 0 || toLanguage == 0) // If arabic is involved
                        convertedChar = CaseOfLamAndAlif(char, positionInText)
                    else
                        CheckUpperOrLowerCase();
                convertedChar = board[toLanguage].charAt(positionInBase);    // After language was found(or not) in 'while' loop , we get here
                return convertedChar;
            }
    }
    else {// If char is regular , that is , not of special chars
        var j = 0;
        positionLower = board[fromLanguage].indexOf(char.toLowerCase());
        if ((positionLower == -1)) {           // If the checked language isn't including the checked char even when it is lowered.
            if (!enforceUniformity) {          // If not  ctrl + '|' 
                do { // While we don't find the char's language
                    j++;
                    LanguagesTraverser();      // Set the next pair of from-to languages
                    positionLower = board[fromLanguage].indexOf(char.toLowerCase());
                    if (positionLower != -1)   // If original language of the char is found
                        if (fromLanguage == 0 || toLanguage == 0) // If arabic is involved
                            convertedChar = CaseOfLamAndAlif(char, positionInText);
                        else
                            CheckUpperOrLowerCase();
                    else     // If the char isn't included not as normal nor as capital form in the current checked language
                        convertedChar = char;
                }
                while ((j < languagesArray.length) && (char == convertedChar)) // If converted char is same as the original , that is we couldn't find char in current language  
            }                                                                  // then try next language
            else            // If Ctrl + '|' were pressed
                convertedChar = char; // if we use ctrl + '|' we shouldn't change the letter that belongs to other language
        }
        else                // If the char was found in the fromLanguage line
            if (fromLanguage == 0 || toLanguage == 0) // If arabic is involved
                convertedChar = CaseOfLamAndAlif(char, positionInText);
            else
                CheckUpperOrLowerCase();
        return convertedChar;
    }
    return char; // In case the 'for' loop was not executed. (a rare case (hebrew+english selected): W(big W)-> w-> '-> undefined , caused by the 'Shift key')
    function CheckUpperOrLowerCase() {    // Inner function to decide if to convert to upper or lower case
        if (char.toUpperCase() == char)   // If the char is capital (or of a non capital language , like hebrew)
            if (UpperCaseLanguage(char)) // That is , the char is of capital indeed , because it isn't hebrew'. See remark (9)
                convertedChar = board[toLanguage].charAt(positionLower).toUpperCase()
            else    // If it is not capital , like hebrew char
                convertedChar = board[toLanguage].charAt(positionLower); // Converts by the destination language line (board[line])
        else        // If it is a non capital char which is in an upperCase language like english
            convertedChar = board[toLanguage].charAt(positionLower)
    }
}
//   --            --            --            --             --            --
function LanguagesTraverser() { // Sets the next to-from positions in the selected-languages array(languagesArray) which contain the positions on the languages list (see remark 3)
    fromLanguage = languagesArray[traverser];              // moving them circularilly
    if (traverser < languagesArray.length - 1)
        traverser++
    else
        traverser = 0;
    toLanguage = languagesArray[traverser];
}
//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ To continue from here  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
//   --            --            --            --             --            --
function AdjustPosition(positionintext) {
    var alif_Indexes = 0; // alifAndLam.length - alifAndLam.reverse().findIndex(obj => obj.position < positioninintext);
    var foundIndex = 0;
    foundIndex = alifAndLam.reverse().findIndex(position => position < positionintext);
    alifAndLam.reverse();
    if (foundIndex != -1)
        alif_Indexes = alifAndLam.length - foundIndex; // The indexes of lam ('ل') or lamAlif ('لا'). It is also the length of alifAndLam till alif_Indexes
    if (alifAndLamCounter > 0) {  //!!! // If current originaltext is longer (arabic with added 'لا' included) after reconverting to arabic
        if (originalText.length == keysCounter + 1/* + alifAndLam.length*/)   // If current text is with the spare alif's. Pay attention that keysCounter was initialized to -1
            if (alif_Indexes != -1)
                positionintext += alif_Indexes;
        }
    else
        if (originalText.length > keysCounter + 1/* + alifAndLam.length*/)   // If current text is with the spare alif's. Pay attention that keysCounter was initialized to -1

            positionintext -= alif_Indexes;

    return positionintext;
}
//   --            --            --            --             --            --
//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ To continue from here  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ There is an unchecked change i line 153 @@@@@@@@@@@@@@@@@@@@@@@@
//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ There is an unchecked change i line 225 @@@@@@@@@@@@@@@@@@@@@@@@
//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ to change manifest to 24_0 @@@@@@@@@@@@@@@@@@@@@@@@@@@@@
//function ToggleCaps(event) {    // Toggles between capital(big) letters and normal letters. Called by ConvertOptions function
//    var positionInBoard = -1;
//    if ((originalText != originalText.toLowerCase())) {      // If the text is of big letters
//        originalText = originalText.toLowerCase();
//        if (fromHebrew) {                                    // if current text was toggled from hebrew
//            newText = "";
//            for (var i = 0; i < originalText.length; i++) {  // After lowering the text , converting to hebrew
//                positionInBoard = board[1].indexOf(originalText[i]);
//                if (positionInBoard != -1)
//                newText += board[2].charAt(positionInBoard); // Converts to the english capital
//            }
//        }
//    }
//    else // If normal(not capital) letters
//        if (!UpperCaseLanguage(originalText)) {               // If the text is of hebrew (arabic isn't relevant here).  // If the char is capital or shifted. See remark (9) about hebrew/arabic
//            newText = "";
//            for (var i = 0; i < originalText.length; i++) {
//                positionInBoard = board[2].indexOf(originalText[i]); // Tries if text is hebrew
//                if (positionInBoard != -1)
//                    newText += board[1].charAt(positionInBoard)// Converts to english
//                else
//                    newText += originalText[i];                // We leaves the char as it is
//            }
//            fromHebrew = true;   // Indicates that the current text is hebrew , so when toggling back from capital it will turn to hebrew ,not english
//        }
//        else
//            fromHebrew = false;  // Then toggling back to english
//    if (!fromHebrew) // We can't get back the hebrew text , it will not get uppercase. See what happens in next lines. See remark (10)
//        // Text is initialized to 0 till now , so we need to set it to the value in the element
//        newText = (event.target.tagName.toUpperCase() == 'INPUT' || event.target.tagName.toUpperCase() == 'TEXTAREA') ? event.target.value : event.target.innerText;
//    newText = (newText === newText.toUpperCase()) ? newText.toLowerCase() : newText.toUpperCase(); // Toggling, not works for hebrew
//    EditAndDisplay(event);                   // Edits the converted text and displays it
//}
//   --            --            --            --             --            --
function UpperCaseLanguage(txt) {               // Decides if txt is in hebrew or arabic and the like, which can't be turned to UpperCase
    if (txt.toUpperCase() == txt.toLowerCase()) // If the text can't be manipulated to UpperCase 
        return false                            // (I hope there is no situation of capital letter that can't be lowered)
    else
        return true;
}
//   --            --            --            --             --            --
function CaseOfLamAndAlif(char, position) {              // Called by ConvertOneChar function. See remark (4)
    if (toLanguage == 0)                                 // If we try to convert to arabic
        if ((alifAndLam.indexOf(position) != -1))        // If the position of the char is registered in alifAndLam array
            if (board[fromLanguage].indexOf(char) != -1) // If the char is in the table (key of keyCode 66)
                return 'ل' + 'ا'
            else             // If the char is not in the 'from' language (like capital or from a languages that is not selected)
                return char; // The original
        else {               // If char is regular , that is , not of 66 key code
            if (board[fromLanguage].indexOf(char) != -1)
                return board[0][board[fromLanguage].indexOf(char)] // The convertion to the arabic char
            else
                return char;
        }
    else {                                      // If fromLanguage = 0 , that is , from arabic
        //position -= alif66;                     // Offsetting the position of the char in the text. See remark (5)
        if (alifAndLam.indexOf(position) != -1) // Key 'لا' (sixty six) was pressed
            if (char == 'ل') {                  // 'char' can be either 'ل' either 'ا'
             //   alif66++;   // Counts how many 'لا' there are till now , in order to ommit the positions of the extra 'ا's , see remark (5)
                return board[toLanguage][board['base'].indexOf(66)];//
            }
            else
                if (char == 'ا') // Redundant char
                    return ""
                else             // If not arabic char
                    return char;
        else {                   // In case of a key other than 'لا'                
            if (board[0].indexOf(char) != -1) // If the letter is included in arabic line on the table board[]
                return board[toLanguage][board[0].indexOf(char)]
            else
                return char;
        }
    }
}
//   --            --            --            --             --            --
//(+)
function GetSpecialChars() {     // Like ',.;/  that are common to some language lines. See remark (1)
    var specialChars = "";
    for (var i = 0; i < languagesArray.length; i++)
        specialChars += board[languagesArray[i]].slice(15, 17) + board[languagesArray[i]].slice(25, 27) + board[languagesArray[i]].slice(36, 41) + (board[languagesArray[i]].slice(15, 17) + board[languagesArray[i]].slice(25, 27) + board[languagesArray[i]].slice(36, 41)).toUpperCase();
    return specialChars;
}
//   --            --            --            --             --            --
//(*) Called by ConvertText and ToggleCaps
function EditAndDisplay(event) { // Prepares the converted text before displaying and displays it
    if (feedbackNoChangeMade) {  // If the text was not converted because the user didn't select the language or used left arrow key for toggling capital letters
        SetHoverWindow(event);   // Creates and displays hovering message-window and leaves the text as it is.
    }
    else {  // Displays the converted text after giving it the appropriate pattern. (The next line is a nested ternary operator). See the end of remark (2)
        (div) ? event.target.innerHTML = (GetDivPattern(event) == "linkedin div") ? BuildLinkedInHTML(newText) : BuildDivHTML(newText) : event.target.value = newText;
        if (!UpperCaseLanguage(newText)) { // Sets the direction typing in the element , in hebrew  e.g. from right to left
            $(event.target).css("direction", "rtl");
        }
        else {
            $(event.target).css("direction", "ltr");
        }   // Sets the placee of the caret(the writing-point marker) to the end of the text
        (div) ? setCaretPosition(event.target) : event.target.setSelectionRange(newText.length, newText.length);
        feedbackNoChangeMade = false;
        newText = "";
    } //*** End point of the convertion proccedures chain ***/
}
//   --            --            --            --             --            --
function GetDivPattern(event) { // Returns the kind of a Div element by its inner pattern
    if (event.target.lastElementChild)
        if (event.target.lastElementChild.nodeName == 'DIV')
            return "normal div"
        else
            if (event.target.lastElementChild.nodeName == 'P')
                return "linkedin div";
}
//   --            --            --            --             --            --
//(+) Called by EditAndDisplay function
function BuildLinkedInHTML(str) { // Only for LinkedIn site. Gives the converted text the appropriate construction before displaying. Based on 'Bing AI' answer. See remark (6)
    let html = "";
    for (let line of str.split("\n")) {
        if (line) {
            html += "<p>" + line + "</p>";
        } else {
            html += "<p><br></p>";
        }
    }
    return html;
}
//   --            --            --            --             --            --
//(+) Called by EditAndDisplay function
function BuildDivHTML(str) {               // For sites except LinkedIn. Gives the converted text the appropriate construction before displaying. See remark (6)
    let html = "";
    let arrayOfLines = GetLinesArray(str); // Array of the lines in the converted text
    let arrayOfNewLineSignsSets = GetNewLineSignsSetsArray(str); // Array of '\n' sets in the converted text (after extra \n's had been eliminated , see remark (8)). See remark (7)
    for (let i = 0; i < arrayOfLines.length || i < arrayOfNewLineSignsSets.length; i++) {
        if (i < arrayOfLines.length)       // Based on Bing AI
            if (i == 0)                    // Add the line
                html += arrayOfLines[i]
            else
                html += "<div>" + arrayOfLines[i] + "</div>";
        if (i < arrayOfNewLineSignsSets.length) { // Then add the html for new line sign(s) , repeating according to the number of '\n's in the set
            let count = arrayOfNewLineSignsSets[i].length;
            if (count > 1)
                html += "<div><br></div>".repeat(count - 1);
        }
    }
    return html;
}
//   --            --            --            --             --            --
//(+) Called by BuildDivHTML function
function GetLinesArray(str) {              // Returns an array of pure lines (without '\n' signs) from the text. From Bing AI
    let newStr = str.replace(/\n+/g, '|'); // Replaces all the '\n' signs br '|'
    let substrings = newStr.split('|');    // Gets the splitted lines into the array
    return substrings;                     // Returns the array
}
//   --            --            --            --             --            --
//(+) Called by BuildDivHTML function
function GetNewLineSignsSetsArray(str) {   // Returns an array of sets of successive '\n's from the text. From AI (Bing) , see remark (7)
    var array = [];
    array = str.split(/[^\n]+/).filter(substring => substring !== '');
    return array;                          // Array of '\n' series
}
//   --            --            --            --             --            --
//(+) Called by CheckPressedKeys and by ConvertText functions
function RemoveFromString(event, str) {    // Removing the extra \n's from the text. Based on Bing AI. See remark (2)
    let arrayOfLines = GetLinesArray(str); // Divides the text into an array of regular lines (witout '\n')
    let arrayOfNewLineSignsSets = (GetDivPattern(event) == "linkedin div") ? RemoveLinkedInDivExtraNewLineSigns(GetNewLineSignsSetsArray(str)) : RemoveNormalDivExtraNewLineSigns(GetNewLineSignsSetsArray(str)); // The array of  successive '\n' sets after eliminating the extra \n's, See remark (7,8)
    let newArray = [];
    for (let i = 0; i < arrayOfLines.length || i < arrayOfNewLineSignsSets.length; i++) {
        if (i < arrayOfLines.length) {
            newArray.push(arrayOfLines[i]);            // Add one array
        }
        if (i < arrayOfNewLineSignsSets.length) {
            newArray.push(arrayOfNewLineSignsSets[i]); // Add '\n' set
        }
    }
    return newArray.join('');   // Returns string , because join() returns string out of the array
}
//   --            --            --            --             --            --
//(+) Called by RemoveFromString function
function RemoveLinkedInDivExtraNewLineSigns(aray) {    // Algorithm to remove the extra '\n' signs in a set of '\n's in text of editable Div of LinkedIn. See remark(8 - same principle)
        for (let i = 0; i < aray.length; i++) {
            let count = Math.floor((aray[i].length - 5) / 3) + 2;
            aray[i] = '\n'.repeat(count);
        }
        return aray;
}
//   --            --            --            --             --            --
//(+) Called by RemoveFromString function
function RemoveNormalDivExtraNewLineSigns(aray) { // Algorithm to remove the extra '\n' signs in a set of '\n's  in text of editable Div. See remark(8)
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
//(+) Called by EditAndDisplay function
function setCaretPosition(el) { // From Bing AI , mimics clicking on END key in order to set the caret on the end of text
    var range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
}
//   --            --            --            --             --            --
//(+) Called by EditAndDisplay function
function SetHoverWindow(event) { // Sets and manipulates a hovering message-window. Displays it only while hovering the focused element
    if (!hoverDiv)  // If hoverDiv is null (hoverDiv is of type Object-element) , then create the element
        hoverDiv = $('<div>You should use the keys as recommended (<,> or |),<br>Check also that you selected the right languages</div>').addClass("hoveringWindow");
    $(document.body).append(hoverDiv); 
    $(event.target).mousemove(function () { $(hoverDiv).css({ display: "block" }); }); // Displays when hovering the element
    $(event.target).mouseleave(function () { $(hoverDiv).css({ display: "none" }); }); // Hides when the mouse is out of the element
}// On clicking anywhere on the page , the hovering window is removed. See last line in function myCallback() , above



/////////////////////////////////////////    Remarks    //////////////////////////////////////////

//(0) Why keyup ? Whe we don't use keydown event only ?
// This is because the handler of the event is performed before the char is displayed, so we can't use line
// like: "originalText = (div) ? event.target.innerText : event.target.value;" because the last char isn't appeared yet.

//(01) For example : In LinkedIn there is a shortcut 'shift+@' to tag a member. Because we use here ..).off("keydown...
//  this will abolish the shortcut. The namespace (gibberishyak11) which is randomally chosen by me restricts the
//  influence of the event to this contentscript only.

//(1) What is the problem with common chars like "'","." etc. ?
// We cann't decide from which language to convert. Example : if the user writes "'ישא" instead of "what" , when
// we begin to convert the first letter , which is "'" , it can be or english or hebrew letter , so "'ישא"
// might be converted to ",hat" instead of "what" or the word ",usv" to "ודה," instead of "תודה".

//(2) Why to remove the extra '\n' (new line signs) ?
//  In linkedin , for example, for the first 'enter' in a 'div' , the text gets 2 '\n', for 2 enters : 5 '\n' , for 3 enters :- 8 '\n' , for 4 :- 11 and so on.
//  The problem is , that if I try to return the converted text , every one '\n' becomes 3 '\n's.
//  Therefore it was easier to remove the extra new lines('\n') then rebuild the converted text with new html.
//  to get the adequate format in return.
//  Why ,at all, to rebuild the html format ? Because I wanted to keep the original number of lines and the space (\n)
//  between them instead of getting one long line of the text.

//(3) For example : languagesArray[0]=2, languagesArray[1]=3. Assume that fromLanguage now
//  is 3 (Russian),and it is pointed in the second place in the array ([1] of the array).
//  - Russian is Language no' 3  in the language-list in Options Page and in 'board' array -
//  toLanguage is 2 (Hebrew) in our example and it is pointed by [0] position of languagesArray array.

//(4) In arabic there is a problem with the key 'لا' (B). In 'لا' there are two joined letters : 'ل' and 'ا' (like A and L in English). There are also
//  seperated 'ل'(G key) and 'ا'(H key). If I want to write 'baboon' but wrote 'لاشلاخخى' , there are
//  two 'لا's in the word, now it can be converted to 'baboon' but also to 'ghaghoon', because Lam and Alif (ل and ا) are
//  joined whenever they are following (lam, Then alif), hence 'لاشلاخخى' can be also 'ghaghoon'. To solve this we use the buffer with the positions.

//(5) Assume we wanted to write 'baboon' , but instead - a gibberish of 'لاشلاخخى'. We have two indexes in 'alifAndLam[]' : 0 and 2 ,
//  pointing to places of 'لا' in the word. When we check the second 'لا', the parameter 'position' is 3 (for the 'ل' of 'لا'),
//  but the 'ا' of the first 'لا' was not counted in 'alifAndLam[]' so the position there is 2 , therefore we should eliminate these 'ا's places from 'position'.

//(6) It is common in sites that text elements are of type editable 'Div' that contains inner elements.

//(7) For example : text="Hello\n\n\n\n\nBig\nAnd\nVery nice\n\nWorld". The array will contain these
//  sets(of string) : ['\n\n\n\n\n','\n','\n','\n\n'].
//  As well, GetLinesArray(str) returns the lines : ['Hello','Big','And','Very nice','World']

//(8) Let's assume the (original) text is : "Hello\n\n\n\n\nBig\n\nWorld" , that is 5 new lines after 'Hello'
//  and 2 new lines after 'Big'. See in remark(2) that editable Div creates extra '\n' signs.  In this
//  function we eliminate these extra's to the real "Hello\n\nBig\nWorld" (in common Div).

//(9) 'toUpperCase()' makes no effect on hebrew/arabic chars , so it can be or capital or hebrew
//  this why we check if the char is of 'UpperCaseLanguage' or not.

//(10) Let's assume the element_text is 'ש' and we try toggle it to 'A'. Now 'newText' = 'a' after it was converted above from 'ש',
//  so we shouldn't place the 'ש' into 'newText' now (hebrew is non upperCased).
//  Only for non hebrew we put the text into 'newText' and upperCase it. But why we need at all to put element_value into 'newText' ?
//  Because if the text_value is non-hebrew-text, then , in this case 'newText' is still "" (enmpty) , as it is initialized in its definition ,
//  so before upperCasing it we need to put the element_text ('a') into 'newText'.




//***** Local readMe  ////////
// This application corrects gibberish. For example : typing 'akuo' in English instead of 'שלום' Hebrew.
// Before using, we need to select the languages which we work with , at least 2 languages , from the
// list on the Options Page.
// To correct the gibberish , press ctrl+< or ctrl+ | , to toggle between capital to
// normal letters ,  press ctrl+ >.
// See more details in OPTIONS.html file.