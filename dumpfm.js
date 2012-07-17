
function onRequest(request, sender, sendResponse) {
    if (request.action == 'dump_into') {
        $("#msgInput").val( $("#msgInput").val() + " " + request.url + " " ); 
		$("#msgInput").trigger('input'); 
		$("#msgInput").focus(); 		$("#msgInput").blur(); 		$("#msgInput").focus(); 	
		sendResponse({status: 'Pasted ' + request.url});
	} 
	//else if (request.action == 'get_dump_tab') {
	//		sendResponse({dumptab: 'Pasted ' + });
	//}
}
chrome.extension.onRequest.addListener(onRequest);


function getScript(url,success) {

	var head = document.getElementsByTagName("head")[0], done = false;
        var script = document.createElement("script");
        script.src = url;
  
	// Attach handlers for all browsers
	script.onload = script.onreadystatechange = function() {
	    if (!done && (!this.readyState ||
			   this.readyState == "loaded" || this.readyState == "complete")) {
                done = true;
		success();
            }
        };
  
        head.appendChild(script);
    }


// load jquery UI
getScript('https://ajax.googleapis.com/ajax/libs/jqueryui/1.8.16/jquery-ui.min.js', function(){});


// remove userlist!
//$('#userList').hide();


// add url to saved images on shift-leftclick
// (You can make this work on all pages by adding this to all.js and
// putting 
//    {
//     "matches": ["http://*/*"],
//     "js": ["jquery-1.6.1.js", "all.js"]
//   },
// into the "content_scripts" section of manifest.json

$(document).click(function(e) {
if (e.shiftKey) {
        //alert("shift+click: " + e.target.keys())
		if(e.target.nodeName=='IMG') {
			//console.log(e.target.src);   
			chrome.extension.sendRequest({type: "add_url", url: e.target.src}, function(response) {
				console.log(response.status);
			});
		}
		return false;
	}
});


// key handling
document.onkeyup = KeyCheck;       
function KeyCheck(e) {

   var k = e.keyCode;
   switch(k) {

   case 9:   //tab
	   $('#msgInput').focus();
	   break;

   case 192: // tilde/quote
	   //if(e.target.id != 'msgInput') {
	   $('#palette-button').click();
	   e.stopPropagation();
	   e.preventDefault();
	   //$('#palette-thumbs img').each(function(){ this.onclick='';})
	   break;
   }
}



// add preview panel to page
$("<div id=\"preview\" style=\"position: absolute; left: 6px; bottom: 70px; width: auto; height: 120; padding: 6px 40px 6px 6px; background-color: white; z-index: 1000; display: none;  overflow-y: hidden; box-shadow: 3px 4px 4px #c8cbce; border:1px solid #000; color: black; float: left\"><ul id=\"preview_sortable\" style=\"list-style-type: none; margin: 0; padding: 0; \"></ul></div>").appendTo('body');


// inject into web page context!! awesome! 
// no newlines allowed! must use backslash to escape newline for multi-line code!

// replace the favourite click/paste function with one that does not close the favourites panel
var pc = " function paletteToChat(img){ var chatText = $('#msgInput').val();  if (chatText.length && chatText[chatText.length - 1] != ' ') chatText += ' ';  chatText += $(img).attr('src') + ' ';  $('#msgInput').val(chatText);  $('#msgInput').focus().val($('#msgInput').val()); $('#msgInput').trigger('input'); } ";

// use Esc to close favourites panel
var pc2 = '$(document).keydown(function(e){ \
switch(e.keyCode) {\
case 27:  /* escape */ \
  if($("#search-results-images").is(":visible")) { \
    Search.resultsClear(); \
    Search.closed = true; \
    Search.$container.css("display", "none"); \
    $("#search-controls").css("display", "none") \
  } else if ($("#palette").is(":visible")) { \
   paletteHide(); \
  } else if ($("#preview").is(":visible")) { \
    $("#preview").hide(); \
    return false; \
  } \
  break; \
case 9:   /* tab to focus chat text input */ \
  $("#msgInput").focus();\
 e.stopPropagation(); \
 e.preventDefault(); \
 return false;	\
  break;\
}});';


var live_onclick_replace = '\
$(".content").die("click").live("click", function(e) {\
  if(!e.ctrlKey && !e.shiftKey){\
      if(typeof e.target.src == "undefined") \
        return false; \
	  $("#msgInput").val( $("#msgInput").val() + " " + e.target.src + " " );\
	  $("#msgInput").focus();\
      $("#msgInput").trigger("input"); \
	  return false;\
  } else if(!e.shiftKey){\
	var tagName = e.target.tagName;\
	if (tagName == "A" || tagName == "EMBED" || $(e.target).hasClass("youtube-thumb")) {\
            return true;\
	}\
	var msg = $(this).parent(".msgDiv");\
	var wasFavorited = msg.hasClass("favorite");\
	var button = msg.find(".chat-thumb");\
	if (wasFavorited) {\
            $(button).attr("src", Imgs.chatThumbOff);\
	} else {\
            $(button).attr("src", Imgs.chatThumbBig);\
            $(button).stop().animate(Anim.chatThumbBig, "fast").animate(Anim.chatThumb, "fast", "swing");\
	}\
	Tag.favorite(button);\
	return false;\
    }\
  }\
);';


var prevdef = "\
var prevfn = function() {   \n\
    var msgval = $('#msgInput').val(); \n\
    if(!msgval.length || (msgval.indexOf('http://') == -1 && msgval.indexOf('https://') == -1) ) {   \n\
      $('#preview').hide();  \n\
      return;   \n\
    }  \n\
	$('#preview').show();   \n\
	var s = msgval.split(/\\s+/);  \n\
    var news = '<ul id=\"preview_sortable\" style=\"list-style-type: none; margin: 0; padding: 0; \">';  \n\
    var total_width = 0; \n\
	for (var i = 0, item; i < s.length; i++) {  \n\
      if(!s[i].length) continue; \n\
      item = s[i];  \n\
	  if(item.indexOf('http://') == 0) {  \n\
        var urlWithoutParams = item.replace(/\\?.*$/i, \"\"); \n\
        if (urlWithoutParams.match(/\\.(jpg|jpeg|png|gif|bmp|svg|fid)$/i)) {   \n\
 	      news += '<li id=\"pitem-' + i + '\" style=\"margin: 3px 3px 3px 0; padding: 1px; float: left; max-width: 120px; height: 120px; border: 0px;\"  class=\"pitem\"><img id=\"pitem-' + i + '-img\" src=\"' + item + '\"  / style=\"max-width: 120px; max-height: 120px;\" /></li> ';  \n \
          total_width += 120; \n\
        }  \n\
	  } else {  \n\
		news += item + ' ';   \n\
	  }  \n\
	}  \n\
    news += '</ul><div style=\"position: absolute; top: 0; right: 40px; color: #999; cursor: pointer\" onclick=\"clear_preview()\">[clear]</div><div style=\"position: absolute; top: 0; right: 4px; color: #999; cursor: pointer\" onclick=\"close_preview()\"> [hide]</div>';  \n\
	$('#preview').html(news);  \n\
    console.log(total_width, $('#preview').width()); \n\
    if(total_width > $('#preview').width() && total_width+50 < $(window).width()) {  \n\
      $('#preview').width(total_width + 50); \n\
    }  \n\
var sortableIn = 0; \
  $( '#preview_sortable' ).sortable({ containment: '#preview', axis: 'x', cursor: 'col-resize', tolerance: 'pointer'});    \n\
  $( '#preview_sortable' ).disableSelection();    \n\
  $( '#preview_sortable' ).sortable({    \n\
    stop: function(event, ui) {  \n\
       var imgorder = $('#preview_sortable').sortable('toArray');  \n\
       var newimgstr = '';    \n\
       for(var i=0; i < imgorder.length; i++) { \n\
         newimgstr += $('#' + imgorder[i] + '-img').attr('src') + ' ';  \n\
       }   \n\
       console.log(newimgstr); \n\
       $('#msgInput').val(newimgstr); \n\
  }, receive: function(event, ui){ sortableIn = 1; }, over: function(event, ui){sortableIn = 1;},	out: function(event, ui){ sortableIn = 0; }, beforeStop: function(event, ui)	{if (sortableIn == 0){	ui.item.remove();	}	} });   \n\
};  \n\
$('#msgInput').bind('input', prevfn);   \n\
$('#msgInput').bind('focus', prevfn);   \n\
function close_preview(){ $('#preview').hide(); }\
function clear_preview(){ $('#msgInput').val(''); prevfn(); }\
function prev_delimg(id){ \
  $('#msgInput').val(  $('#msgInput').val().replace($('#pitem-' + id + '-img').attr('src'), '') ) ; \
  $('#pitem-' + id).remove();  \
  console.log('#item-' + id); \
  prevfn(); } \
";


var new_submit_handlers = "\
$('#msgInput').keyup(function(e){ if(e.keyCode==13) { $('#preview').hide(); $('#palette').hide(); }}); \
$('#msgSubmit').click(function(){ $('#preview').hide(); $('#palette').hide(); }); \
";


// perform injection of all the above code snippets
injectScriptSimple(pc + pc2 + live_onclick_replace + prevdef + new_submit_handlers);


function injectScriptSimple(source)
{
    var elem = document.createElement("script");
    elem.type = "text/javascript";
    elem.innerHTML = source;
    return document.head.appendChild(elem);
}

//////////////////////////////////////////////////////////////////////////////////////////////
// Copyright(C) 2010 Abdullah Ali, voodooattack@hotmail.com                                 //
//////////////////////////////////////////////////////////////////////////////////////////////
// Licensed under the MIT license: http://www.opensource.org/licenses/mit-license.php       //
//////////////////////////////////////////////////////////////////////////////////////////////
 
// Injects a script into the DOM, the new script gets executed in the original page's
// context instead of the active content-script context.
//
//    Parameters:
//            source: [string/function]
//            (2..n): Function arguments if a function was passed as the first parameter.
 
 
function injectScript(source, img)
{
     
    // Utilities
    var isFunction = function (arg) { 
        return (Object.prototype.toString.call(arg) == "[object Function]"); 
    };
     
    var jsEscape = function (str) { 
        // Replaces quotes with numerical escape sequences to
        // avoid single-quote-double-quote-hell, also helps by escaping HTML special chars.
        if (!str || !str.length) return str;
        // use \W in the square brackets if you have trouble with any values.
        var r = /['"<>\/]/g, result = "", l = 0, c; 
        do{    c = r.exec(str);
            result += (c ? (str.substring(l, r.lastIndex-1) + "\\x" + 
                c[0].charCodeAt(0).toString(16)) : (str.substring(l)));
        } while (c && ((l = r.lastIndex) > 0))
        return (result.length ? result : str);
    };
 
    var bFunction = isFunction(source);
    var elem = document.createElement("script");    // create the new script element.
    var script, ret, id = "";
 
    if (bFunction)
    {
        // We're dealing with a function, prepare the arguments.
        var args = [];
 
        for (var i = 1; i < arguments.length; i++)
        {
            var raw = arguments[i];
            var arg;
 
            if (isFunction(raw))    // argument is a function.
                arg = "eval(\"" + jsEscape("(" + raw.toString() + ")") + "\")";
            else if (Object.prototype.toString.call(raw) == '[object Date]') // Date
                arg = "(new Date(" + raw.getTime().toString() + "))";
            else if (Object.prototype.toString.call(raw) == '[object RegExp]') // RegExp
                arg = "(new RegExp(" + raw.toString() + "))";
            else if (typeof raw === 'string' || typeof raw === 'object') // String or another object
                arg = "JSON.parse(\"" + jsEscape(JSON.stringify(raw)) + "\")";
            else
                arg = raw.toString(); // Anything else number/boolean
 
            args.push(arg);    // push the new argument on the list
        }
 
        // generate a random id string for the script block
        while (id.length < 16) id += String.fromCharCode(((!id.length || Math.random() > 0.5) ?
            0x61 + Math.floor(Math.random() * 0x19) : 0x30 + Math.floor(Math.random() * 0x9 )));
 
        // build the final script string, wrapping the original in a boot-strapper/proxy:
        script = "(function(){var value={callResult: null, throwValue: false};try{value.callResult=(("+
            source.toString()+")("+args.join()+"));}catch(e){value.throwValue=true;value.callResult=e;};"+
            "document.getElementById('"+id+"').innerText=JSON.stringify(value);})();";
 
        elem.id = id;
    }
    else // plain string, just copy it over.
    {
        script = source;
    }
 
    elem.type = "text/javascript";
    elem.innerHTML = script;
 
    // insert the element into the DOM (it starts to execute instantly)
    document.head.appendChild(elem);
 
    if (bFunction)
    {
        // get the return value from our function:
        ret = JSON.parse(elem.innerText);
 
        // remove the now-useless clutter.
        elem.parentNode.removeChild(elem);
 
        // make sure the garbage collector picks it instantly. (and hope it does)
        delete (elem);
 
        // see if our returned value was thrown or not
        if (ret.throwValue)
            throw (ret.callResult);
        else
            return (ret.callResult);
    }
    else // plain text insertion, return the new script element.
        return (elem);
}



