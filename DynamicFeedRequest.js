
// JSONCrossDomainRequest -- a class for accessing Cross Domain JSON Objects
// using dynamically generated script tags and JSON
//
//
// A SECURITY WARNING:
// The dynamic <script> tag hack allows a page to access data from any server in the web. 
// The data is returned in the form of a script. That script 
// can deliver the data, but it runs with the same authority as scripts on 
// the base page, so it is able to steal cookies or misuse the authorization 
// of the user with the server.
//
// So, we should be extremely cautious in the use of this script.
//

// Constructor -- pass the request URL to the constructor
//
function JSONCrossDomainRequest(scriptUrl) {
    // Request path
    this.scriptUrl = scriptUrl; 
    // Keep IE from caching requests
    this.noCache = '&amp;noCache=' + (new Date()).getTime();
    // Get the DOM location to put the script tag
    this.headLocation = document.getElementsByTagName('head').item(0);
    // Generate a unique script tag id
    this.scriptID = 'JCDScriptID' + JSONCrossDomainRequest.scriptNumber++;
}

// Static script ID counter
JSONCrossDomainRequest.scriptNumber = 1;

// createScriptTag method
//
JSONCrossDomainRequest.prototype.createScriptTag = function () {

    // Create the script tag
    this.scriptObj = document.createElement('script');
    
    // Add script object attributes
    this.scriptObj.setAttribute('type', 'text/javascript');
    this.scriptObj.setAttribute('src', this.scriptUrl + this.noCache);
    this.scriptObj.setAttribute('id', this.scriptID);
}
 
// removeScriptTag method
// 
JSONCrossDomainRequest.prototype.removeScriptTag = function () {
    // Remove the script tag
    this.headLocation.removeChild(this.scriptObj);  
}

// appendScriptTag method
//
JSONCrossDomainRequest.prototype.appendScriptTag = function () {
    // Appends the script tag to the document
    this.headLocation.appendChild(this.scriptObj);
}

// DynamicFeedRequest -- a class that uses JSONCrossDomainRequest for accessing 
// Cross Domain JSON Objects of the dynamic xml feeds
// using dynamically generated script tags and JSON
//

// Constructor -- pass the feed URL and the target element ID to the constructor
//
function DynamicFeedRequest(feedUrl, feedID) {
    // Feed path
    this.feedUrl = feedUrl; 
    // Feed ID
    this.feedID = feedID; 
//    // The full request path
    if (this.feedUrl.indexOf('?') == -1)
    {
        var tempPath = '?FeedID=' + this.feedID;
        if (DynamicFeedRequest.endsWith(this.feedUrl, '.com') || DynamicFeedRequest.endsWith(this.feedUrl, '.co.uk'))
        {
            this.fullPath = this.feedUrl + '/' + tempPath;
        }
        else
        {
            this.fullPath = this.feedUrl + tempPath;
        }
    }
    else
    {
        this.fullPath = this.feedUrl + '&FeedID=' + this.feedID ;
    }
    
    // The JSONCrossDomainRequest object instance
    this.requestObj = new JSONCrossDomainRequest(this.fullPath);
    
    // Save request for later use
    DynamicFeedRequest.jrequests[this.feedID] = this.requestObj;
}

// Static handlers array
DynamicFeedRequest.handlers = new FunctionPointersArray();

// Static xslt's array
DynamicFeedRequest.xslts = new Array();

// Static json requests array
DynamicFeedRequest.jrequests = new Array();

// Static disposers array
DynamicFeedRequest.disposers = new Array();

// getData method
//
DynamicFeedRequest.prototype.getData = function (handler, xsltfile) {
    // Save handler for later use
    DynamicFeedRequest.handlers.add(this.feedID, handler);
    
    // Save xslt file for later use
    DynamicFeedRequest.xslts[this.feedID] = xsltfile;
    
    this.requestObj.createScriptTag(); // Build the script tag
    this.requestObj.appendScriptTag(); // Execute (add) the script tag
}

// dispose method
//
DynamicFeedRequest.prototype.dispose = function () {
    DynamicFeedRequest.disposers[this.feedID] = true;
}

// Static xml loading function
DynamicFeedRequest.loadXML = function (xml, fromstring) {
    var xmlDoc = null;

    // code for IE
    if (window.ActiveXObject)
    {
        xmlDoc = new ActiveXObject('Microsoft.XMLDOM');
        xmlDoc.async = false;

        if (fromstring)
            xmlDoc.loadXML(xml);
        else
            xmlDoc.load(xml);
    }
    // code for Mozilla, Firefox, Opera, etc.
    else if (document.implementation &&
    document.implementation.createDocument)
    {
        var parser = new DOMParser();
        if (fromstring)
        {
            xmlDoc = parser.parseFromString(xml, 'text/xml');
            xmlDoc.async = false;
        } 
        else 
        {
            xmlDoc = parser.parseFromString('', 'text/xml');
            xmlDoc.async = false;
            //gianluca's fix
            var xmlhttp = false;
            xmlhttp = new XMLHttpRequest();
            xmlhttp.open("GET",xml,false);
            xmlhttp.send();
            xmlDoc=xmlhttp.responseXML; 
            //xmlDoc.load(xml);
            //end gianluca's fix
        }
    }
    else
    {
        // Your browser cannot handle this script
    }
      
    return xmlDoc;
}

// Static transformation function
DynamicFeedRequest.transformFeed = function (xml, xsltfile) {
    var reply = '';
    
    try 
    {
        var xml = DynamicFeedRequest.loadXML(xml, true);
        var xsl = DynamicFeedRequest.loadXML(xsltfile, false);
    
        // code for IE
        if (window.ActiveXObject)
        {
            reply = xml.transformNode(xsl);
        }
        // code for Mozilla, Firefox, Opera, etc.
        else if (document.implementation 
        && document.implementation.createDocument)
        {
            xsltProcessor = new XSLTProcessor();
            xsltProcessor.importStylesheet(xsl);
            reply = xsltProcessor.transformToFragment(xml, document);
            reply = DynamicFeedRequest.convertXmlToString(reply);
        }
    } catch (e) { }
    
    return reply;
}

// Static convert function
DynamicFeedRequest.convertXmlToString = function (xmlNode) {
    var text;
    
    try 
    {
        // Serialization to string DOM Browser
        var serializer = new XMLSerializer();
        text = serializer.serializeToString(xmlNode);
    } catch (e) {
        // Serialization of an XML to String (IE only)
        text = xmlNode.xml;
    }
    
    return text;
}

// Static checking function
DynamicFeedRequest.endsWith = function (testString, endingString) {
      if(endingString.length > testString.length) return false;
      return testString.indexOf(endingString) == (testString.length - endingString.length);
}

// Static function to get the reply feed data
DynamicFeedRequest.FeedReply = function (data) {
    if(data != null && typeof(data.feedID) != 'undefined' && data.feedID != null)
    {
        if (typeof(data.xml) != 'undefined' && data.xml != null)
        {
            var result = data.xml;
            
            try 
            {
                if (typeof(DynamicFeedRequest.xslts[data.feedID]) == 'string')
                    result = DynamicFeedRequest.transformFeed(result, DynamicFeedRequest.xslts[data.feedID]);
            } catch (e) { }
               
            DynamicFeedRequest.handlers.execute(data.feedID, data, result);
            
            try 
            {
                // Clean previous data from the static members
                DynamicFeedRequest.handlers.remove(this.feedID);
                DynamicFeedRequest.xslts[this.feedID] = null;
                
                if (DynamicFeedRequest.disposers[this.feedID] == true)
                {
                    DynamicFeedRequest.disposers[this.feedID] = null;
                    DynamicFeedRequest.jrequests[this.feedID].removeScriptTag(); // Remove the script tag
                }
            } catch (e) { }
        }
    }
}

// DynamicFeedRequestQueryString -- a class for parsing the querystring parameters sent to the script
//

// Constructor - pass the querystring to the constructor
//
function DynamicFeedRequestQueryString(querystring){ 
    // Create regular expression object to retrieve the qs part 
    var qsReg = new RegExp("[?][^#]*","i"); 
    var hRef = unescape(querystring); 
    var qsMatch = hRef.match(qsReg); 
 
    // Removes the question mark from the url 
    qsMatch = new String(qsMatch); 
    qsMatch = qsMatch.substr(1, qsMatch.length -1); 
 
    // Split it up 
    var rootArr = qsMatch.split("&"); 
    for (var i = 0; i < rootArr.length; i++){
        var tempArr = rootArr[i].split("="); 
        if (tempArr.length == 2){ 
            tempArr[0] = unescape(tempArr[0]); 
            tempArr[1] = unescape(tempArr[1]); 
 
            this[tempArr[0].toLowerCase()] = tempArr[1]; 
        } 
    } 
}

// FunctionPointersArray -- a class for holding pointers to array of functions
//

// Constructor
//
function FunctionPointersArray() {     
    this.funcs = new Array; 
} 

// add method
//
FunctionPointersArray.prototype.add = function(key, func) {     
    if (typeof(func) != 'function')     
    {         
        func = new Function(func);     
    }     
    
    this.funcs[key] = func; 
} 

// remove method
//
FunctionPointersArray.prototype.remove = function(key) {     
    this.funcs[key] = null; 
} 

// execute method
//
FunctionPointersArray.prototype.execute = function(key, object) {  
    var args = []; // empty array
    
    // arguments[0] == key
    // arguments[1] == object
    
    // Copy all other arguments we want to "pass through" 
    for (var i = 2; i < arguments.length; i++)
    {
        args.push(arguments[i]);
    }
    
    this.funcs[key].apply(object, args);
}
