//
////**** Here we manage the Options window, handling the languages selection of the user and displaying original text in textarea
//**  Old version of the conversion functions commented and not erased


var langFrom = 0;      // Index of the language that we want to convert. The index is the position of of the languages in the list.
var langTo = 0;        // Index of the language to which we want to convert.
var txt = "";          // String of the text to convert/converted 
var langArray = [];    // Array of the positions of selected languages in the list ('Choose languages' list).
var langArrayIndx = 0;
var langArrayNext = 1;
var toCaps = false;    // Indicates if to exchange between capital to regular letters or to convert between languages.
// var positionsArr = [];

// Old version of the table
// Table of languages letters as they are arranged on standard keyboard
//var board = [];
//board[0] = " ذ1234567890-=\\دجحخهعغفقثصضشسيبلاتنمكطظزوةىلرؤءئ";      // Arabic //posision 4 at the full list
//board[1000] = " ذ1234567890-=\\دجحخهعغفقثصضشسيبلاتنمكطظزوةىلرؤءئ";   // capital Arabic (pseudo)
//board[1] = " `1234567890-=\\][poiuytrewqasdfghjkl;'/.,mnbvcxz";      // English //posision 26 at the full list
//board[1001] = " `1234567890-=\\][POIUYTREWQASDFGHJKL;'/.,MNBVCXZ";   // capital English
//board[2] = " ;1234567890-=\\[]פםןוטארק'/שדגכעיחלךף,.ץתצמנהבסז";     // Hebrew //posision 55 at the full list
//board[1002] = " `1234567890-=\\][POIUYTREWQASDFGHJKL;'/.,MNBVCXZ";   // capital Hebrew
//board[3] = " ё1234567890-=\\ъхзщшгнекуцйфывапролджэ.юбьтимсчя";      // Russian //posision 101 at the full list
//board[1003] = " Ё1234567890-=\\ЪХЗЩШГНЕКУЦЙФЫВАПРОЛДЖЭ.ЮБЬТИМСЧЯ";   // capital Russian
//board[4] = " `1234567890-=\\][ποιθυτρες;ασδφγηξκλ΄'/.,μνβωψχζ";      // Greek //posision 50 at the full list
//board[1004] = " `1234567890-=\\][ΠΟΙΘΥΤΡΕς;ΑΣΔΦΓΗΞΚΛ΄'/.,ΜΝΒΩΨΧΖ";   // capital Greek 
//board[5] = " ՝:ձյ՛,-.«»օռժ'ջչպոիըետրէւխասդֆքհճկլթփծղշմնբվգցզ";           // Armenian              
//board[1005] = " ՜1ՁՅ349և()ՕՌԺ՞ՋՉՊՈԻԸԵՏՐԷՒԽԱՍԴՖՔՀՃԿԼԹՓԾՂՇՄՆԲՎԳՑԶ";// capital Armenian


//  ===========================================================================================
// Selecting languages , displaying them in the list and making it works for the text elements conversion
$(document).ready(function () {
    $('option').click(function () {      // When one of the languages is clicked in the languages list
        var positionsArr = [];
        var e = null;
        var alList = null;
        var indx = 0;
        $('ul li').remove();            // Removing all the selected-languages list
        $('option').each(function () {  //  Each time the user clicks on an option(language), the whole selected list is rebuilt
            indx++;
            if ($(this).is(':selected')) {
                e = $('<li style="font:normal 12px;color:black;width:300px;">' + indx + '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' + this.innerText + '</li>');
                e.appendTo($('ul'));    // Appending the new created line to the selected-languages list
                positionsArr.push(indx - 1);
            }
        });
        alList = $('#selectedlanguages').html();
        chrome.storage.sync.set({ langPosArr: positionsArr }, function () { });  // We need to store the selected languages positions for the conversion in the text area
        //if (positionsArr.length > 1) {    // We must select 2 languages at least.
        //    langArray = positionsArr;
        //    langFrom = langArray[0];
        //    langTo = langArray[1];
        //    langArrayIndx = 0;
        //    langArrayNext = 1;
        //} 

        // Storing the selected languages list (to set in the list of selected languages when the page is loaded)
        chrome.storage.sync.set({ selectedLanguagesList: alList }, function () { });
    });//click

    //  ======================== Gets the original text of the last 3 conversions ========================

    // On activating (this options page), it gets a message from background.js
    chrome.runtime.onMessage.addListener(function (request, sender, sendresponse) {
        if (request.originText == 'theOriginalText')
            chrome.storage.sync.get('records', function (data) {
                var textRecords = [];
                for (var i = 0; i < Object.values(data.records).length; i++)
                    textRecords[i] = i + 1 + '  ' + Object.values(data.records)[i]; // records contains the pure(without the serial) last 3 original-texts while textRecords contains the serial number as well 
                document.getElementById("ta").value = textRecords.join("");
            });
    }); //chrome.runtime.
}); //ready

// On loading the options page, we need the records to show in text area
chrome.storage.sync.get('records', function (data) {             // to display the original text in text area
    var textRecords = [];
    for (var i = 0; i < Object.values(data.records).length; i++)
        textRecords[i] = i + 1 + '  ' + Object.values(data.records)[i]; 
    document.getElementById("ta").value = textRecords.join("");
});
//chrome.storage.sync.get('langPosArr', function (data) {        // to convert languages in text area
//    langArray = data.langPosArr;
//    if (langArray = length > 1) {
//        langFrom = langArray[0];
//        langTo = langArray[1];
//        langArrayIndx = 0;
//        langArrayNext = 1;
//    }
//});
chrome.storage.sync.get('selectedLanguagesList', function (data) {// To display the selected-languages list
    var list1 = data.selectedLanguagesList;
    $('#selectedlanguages').html(list1);
});
//}
//  ===========================================================================================
//This is an old version of the code for conversion
// Checking which keys were pressed
//function checkKeys(event) {
//    var ew = event.which;  // The key code
//    if (event.ctrlKey && (ew == 188 || ew == 190)) {
//        langFrom = langArray[langArrayIndx];
//        langTo = langArray[langArrayNext];
//        (ew == 190) ? toCaps = true : toCaps = false;
//        Invert(event);
//    } 
//}
////   --            --            --            --             --            --
//// Converting the wrong text to a correct one
//function Invert(event) {
//    var etTxt = (event.target.tagName.toUpperCase() == 'INPUT' || event.target.tagName.toUpperCase() == 'TEXTAREA') ? event.target.value : event.target.textContent;
//    for (i = 0; i < etTxt.length; i++) // etTxt is the original text
//        txt += convert(etTxt[i]);
//    // Here the new text appears. (Input and Textarea have different text attribute the Div)
//    (event.target.tagName.toUpperCase() == 'INPUT' || event.target.tagName.toUpperCase() == 'TEXTAREA') ? event.target.value = txt : event.target.textContent = txt;
//    console.log('txt= ' + txt);

//    txt = "";  // Resetting the buffer after inverting
//}  
////   --            --            --            --             --            --
//// Converting one char
//function convert(letter) {
//    var indx = getLetterIndex(letter);
//    return (board[langTo][indx] || letter);  // When letter doesn't exist in the table , like '!' for example , then return the original letter as is.
//} 
////   --            --            --            --             --            --
//// Return the index of the checked letter on the original-language line (line in table)
//function getLetterIndex(lettr) {
//    if (toCaps) { // if ctrl + > were pressed
//        var capsIndex = correctCaps(lettr);
//        return capsIndex;
//    }
//    else {
//        for (j = 0; j < langArray.length; j++) { // Iterating the languages
//            var index = 0;
//            while ((!(lettr == board[langFrom][index])) && (index < board[langFrom].length)) // Iterating the line of the languge
//                index++;
//            if (index < board[langFrom].length) {
//                break;
//            } // if
//            langPosArrTraverse(); // traversing 'to' and 'from' languages 
//            langFrom = langArray[langArrayIndx];
//            langTo = langArray[langArrayNext];
//        } // for 
//    } // else 
//    return index;                 // if index=48 (which exceedes the length of the line) then function convert() will return the original char.
//}
////   --            --            --            --             --            --
//// Traversing to the next pair of 'to' and 'from' languages
//function langPosArrTraverse() {
//    if (langArrayNext == 0)
//        langArrayIndx = -1;
//    langArrayIndx++;
//    langArrayNext = langArrayIndx + 1;
//    if (langArrayIndx == langArray.length - 1) {
//        langArrayNext = 0;
//    }
//}
////   --            --            --            --             --            --
//// Exchanging between capital and regular
//function correctCaps(ltr) {
//    for (k = 0; k < langArray.length; k++) {
//        var indxx = 0;
//        while ((!((ltr == board[langArray[langArrayIndx]][indxx]) || (ltr == board[langArray[langArrayIndx] + 1000][indxx]))) && (indxx < board[langFrom].length))
//            indxx++; // The loop is stopped while the letter was found either in the regular line either in the capital line
//        if (indxx < board[0].length) {     // If the letter is in the table line
//            if (ltr == board[langArray[langArrayIndx] + 1000][indxx]) {// if it is in the capitals
//                langFrom = langArray[langArrayIndx] + 1000;            // Change letter from capital- 
//                langTo = langArray[langArrayIndx];                     // -to regular
//            }
//            else {
//                langFrom = langArray[langArrayIndx];      // Change letter from regular- 
//                langTo = langArray[langArrayIndx] + 1000; // -to capital
//            }
//            break;
//        } 
//        langPosArrTraverse(); // Traversing languages until one contains the letter.
//        langFrom = langArray[langArrayIndx];
//        langTo = langArray[langArrayNext];
//    } 
//    return indxx; // if index=48 (which exceedes the length of the line) then function convert() will return the original char.
//}
