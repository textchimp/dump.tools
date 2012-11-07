var dump_tab = -1;

// find dump.fm tab if existing
  chrome.windows.getCurrent(function(w) {
    chrome.tabs.getAllInWindow(w.id, function(tabs) {
        for(var i = 0; i < tabs.length; i++) {
           if(tabs[i].url.indexOf('http://dump.fm/chat')==0) {
              dump_tab = tabs[i].id;
              break;
		   }
        } 
    });
  });

function get_dump_tab(){ 
  return dump_tab; 
}

var date = new Date();

chrome.extension.onConnect.addListener(function(port) {
  console.assert(port.name == "dump");
  port.onMessage.addListener(function(msg) {
    if (msg.cmd == "get_dump_tab")
      port.postMessage({dumptab: dump_tab});
    else if (msg.cmd == "send_to_dump_tab") {
      console.log("send", msg);
      chrome.tabs.executeScript(dump_tab, { code: 'document.getElementById("msgInput").value = document.getElementById("msgInput").value + " " + "' + msg.url + '"; $("#msgInput").trigger("click"); '});

      }
  });
});

chrome.extension.onRequest.addListener(
  function(request, sender, sendResponse) {
    console.log(request);
    console.log(sender.tab ?
                "from a content script:" + sender.tab.url :
                "from the extension", request);


    if (request.type=='add_url') {
      sendResponse({status: request.url});
      //alert(request.url);

	  var a = {tags: "", date: date.getTime()};
	  
	  localStorage[request.url] = JSON.stringify(a);

      console.log('added to faves: ' + request.url, localStorage[request.url]);

	  //var data = JSON.parse(localStorage[request.url]);
	  //for (var key in localStorage){
	  //  console.log(key)
	  //}

    }
    else if (request.type=='add_manual_fav') {
      sendResponse({url: request.url});
          chrome.tabs.executeScript(dump_tab, { code: 'document.getElementById("msgInput").value += " ' + request.url + '"; $("#msgInput").trigger("click");  '});

    }
    else if (request.type==get_dump_tab) {
      sendResponse({dumptab: dump_tab});
    }
    else
      sendResponse({}); // snub them.
  });



	  chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){
	    if(tab.url.indexOf('http://dump.fm/chat') == 0
           && changeInfo.status == "complete"
           && dump_tab == -1){       // don't reassign to new dump tab while old is open
	      dump_tab = tabId;
	    }
	  });

	  chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
         if(tabId == dump_tab) {
           dump_tab = -1;
         }
	  });


function getParameterByNameFromString(name, url)
{
  name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
  var regexS = "[\\?&]" + name + "=([^&#]*)";
  var regex = new RegExp(regexS);
  var results = regex.exec(url);
  if(results == null)
    return "";
  else
    return decodeURIComponent(results[1].replace(/\+/g, " "));
}

	  function SendImgURLToDump() {
        return function(info, tab) {
        if(dump_tab != -1) {
  	      var url;
  	      console.log(info, tab);
   

  	      if (info.mediaType === "image") {
            url = info.srcUrl;
          } else if (info.linkUrl) {
            url = info.linkUrl;
          }

          // google image get URL
          var is_imgsearch = getParameterByNameFromString('tbm', window.location.search);
		   console.log(is_imgsearch);
          if(is_imgsearch.length && is_imgsearch == "isch") {
            console.log(url);
             url = getParameterByNameFromString('imgurl', url);
            console.log(url);
          }

  
  	      // send to dump.fm msgInput
          chrome.tabs.executeScript(dump_tab, { code: 'document.getElementById("msgInput").value = document.getElementById("msgInput").value + " " + "' + url + '"; $("#msgInput").trigger("click"); '});
        }
	  };
   };


/************** example of how to tell what was clicked
var clickHandler = function(e) {
    var url = e.pageUrl;
    var buzzPostUrl = "http://www.google.com/buzz/post?";

    if (e.selectionText) {
        // The user selected some text, put this in the message.
        buzzPostUrl += "message=" + encodeURI(e.selectionText) + "&";
    }

    if (e.mediaType === "image") {
        buzzPostUrl += "imageurl=" + encodeURI(e.srcUrl) + "&";
    }

    if (e.linkUrl) {
        // The user wants to buzz a link.
        url = e.linkUrl;
    }

    buzzPostUrl += "url=" + encodeURI(url);

    // Open the page up.
    chrome.tabs.create(
          {"url" : buzzPostUrl });
};


function imageSearchHandler() {
  return function(info, tab) {

     //alert(info.selectionText);
     //var saved = (localStorage["savedSelections"] == 'undefined' ? '' : localStorage["savedSelections"]);
     //localStorage["savedSelections"] = saved + ';;' + info.selectionText;
     //alert(localStorage["savedSelections"]);

     var searchUrl = 'http://images.google.com/search?tbm=isch&hl=en&source=hp&q=' + encodeURIComponent(info.selectionText);
     chrome.tabs.create({url: searchUrl, index: tab.index+1});
 };    

};

      /**
       * Create a context menu which will only show up for images.
       */
      chrome.contextMenus.create({
        "title" : "Dump it!",
        "type" : "normal",
        "contexts" : ["image", "link"],
        "onclick" : SendImgURLToDump()
      });
