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
//  ===========================================================================================
// Selecting languages , displaying them in the list and making it works for the text elements conversion
$(function () { //on ready
    $('option').on("click", function () {      // When one of the languages is clicked in the languages list
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
    chrome.storage.sync.get('version', data => {
        if (data.version/* != undefined*/)
            if (data.version == 'old')
                $('#version').text("Get to new version")
            else
                $('#version').text("Get to old version")
    });
    $('#version').on("click", function () {
        if ($('#version').text() == "Get to old version") {
            chrome.storage.sync.set({ version: 'old' }, function () { });  
            $('#version').text("Get to new version");
        }
        else {
            chrome.storage.sync.set({ version: 'new' }, function () { });  
            $('#version').text("Get to old version");
        }
    });
}); //ready

// On loading the options page, we need the records to show in text area
chrome.storage.sync.get('records', function (data) {             // to display the original text in text area
    var textRecords = [];
    for (var i = 0; i < Object.values(data.records).length; i++)
        textRecords[i] = i + 1 + '  ' + Object.values(data.records)[i]; 
    document.getElementById("ta").value = textRecords.join("");
});
chrome.storage.sync.get('selectedLanguagesList', function (data) {// To display the selected-languages list
    var list1 = data.selectedLanguagesList;
    $('#selectedlanguages').html(list1);
});
