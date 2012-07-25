
var new_manual_html = '\
<div class="mm" style="float: left">\
  <span class="menuicon" style="background-image: url(https://confluence.atlassian.com/download/attachments/218269032/gh-icon-cog-dropdown.png); background-repeat: no-repeat; background-size: 20px 12px; width: 30px; height: 30px; position: absolute; display: none; z-index: 100; opacity: 0.7">\
  <ul class="mymenu" style="display: none; background-color: #FFF; top: 13px; position: relative; border: 1px solid #ccc; min-width: 40px; width: auto">\
    <li onclick="javascript:shownameinput(this);"><div class="namelabel" style="font-style:italic;">longer name</div><div class="namein" style="display:none"><input type="text" style="width:80px; font-size: 10pt; border: 1px gray; color; black; margin-right: 2px;" class="nameinput" value="longer name"></div></li>\
    <li onclick="javascript:showtaginput(this);"><div>tags </div></li>\
    <li onclick="javascript:delfav(this);">del</li>\
  </ul>\
<div class="tagin" style="border: 1px solid #ccc; width: 140px; height: 50px; display: none; position: relative; background-color: #eee; top: 13px; left: 0px; padding: 4px;">tags:<br><input type="text" style="width:130px; font-size: 10pt; border: 1px solid #000;" class="taginput"><!--<input type="button" value="ok" onclick="javascript:add_tags($(this).prev())" class="addtagbutton">--></div>\
</span>';



// escape quotes, for insertion into manualPaletteBuildImageThumbs_redefine var below,
// which is itself escaped, for script injection (Inception, anyone? WE NEED TO GO DEEPER)
new_manual_html = new_manual_html.replace(/"/g,'\\"');




var new_manual_js = '\
        var test_tags = ["dogs", "text", "funny", "disturbing"];\
\
		$(".taginput").autocomplete({ \
				source: test_tags, \
				open: function(){\
					$(this).autocomplete("widget").css({"z-index": "55555555555", "background-color": "#EFF5FB", "width": "128px"});\
                  return false;\
                }\
		});\
\
	    $(".taginput").blur(function(e){ if(!$(".ui-autocomplete").is(":visible") ) { $(e.target).parent().hide(); $(e.target).parents("mm").children(".menuicon").hide();   } }); \
		\
 	    $(".taginput").keypress(function(e) { if(e.charCode == 13) { add_tags(e.target); return false; } }); \
\
		$(".nameinput").keypress(function(e){ if(e.charCode==13){ \
					$(this).hide();\
					$(this).parent().prev().html($(this).val())\
					$(this).parent().prev().show();\
				}\
			}).focus(function(){ $(this).select(); });\
\
\
        $(".mm").hover(\
             function(){ $(this).children(".menuicon").show(); },\
             function(){ \
                 if(!$(this).children(".menuicon").children(".tagin").is(":visible")) { \
                    $(this).children(".menuicon").hide(); \
                 } \
         });\
\
        $(".menuicon").hover(\
          function(){ \
			  if(!$(this).children(".tagin").is(":visible")) { \
				 $(this).css("opacity", "1.0"); \
				 $(this).children(".mymenu").slideDown(100);\
			  }\
          },\
          function(){ \
			  if(!$(this).children(".tagin").is(":visible")) { \
				  $(this).css("opacity", "0.7"); \
			      $(this).children(".tagin").hide();\
                  $(this).children(".mymenu").slideUp(100);\
			  }\
          }\
        );                                \
        \
        $("<style> .mymenu li:hover{ color: green;}</style>").appendTo("head");\
       \
        $(".mymenu li").css({\
          "background-color": "#eee",\
          "margin": "1px",\
          "padding-left": "2px",\
          "cursor": "pointer",\
          "font-size": "10pt"\
        });\
';

// don't need this replace for the JS we're quoting, as opposed HTML going into .append()
//new_manual_js = new_manual_js.replace(/"/g,'\\"');



var manualPaletteBuildImageThumbs_redefine = '\
\
function manualPaletteBuildImageThumbs() {\
    var imgs = JSON.parse(localStorage.manual_favs);\
    if (imgs && imgs.length != 0) {\
        for (var i = 0; i < imgs.length; i++) {\
            $("#manual-palette-thumbs").append("' + new_manual_html + '<img onclick=\'paletteToChat(this)\' src=\'" + imgs[i] + "\'></div>");'  +   new_manual_js   + '\
        }\
    }\
}\
\
\
\
function shownameinput(e){\
	$(e).children(".namelabel").hide(); \
    $(e).children(".namein").show(); \
	$(e).children(".namein").children(".nameinput").focus(); \
}\
function showtaginput(e) {\
 $(e).parent().hide();\
  $(e).parent().next().show();\
  $(e).parent().next().children(".taginput").focus();\
}\
function delfav(e) {\
 console.log($(e).parents(".mm").children("img").attr("src"));\
 removeManualFav($(e).parents(".mm").children("img").attr("src"));\
}\
function add_tags(e) {\
  $(e).parent().hide();\
  console.log("tags: " + $(e).val() + "(for: " + $(e).parents(".mm").children("img").attr("src") + ")");\
}\
';

/* injectScriptSimple(manualPaletteBuildImageThumbs_redefine);  */

function getParameterByName(name)
{
  name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
  var regexS = "[\\?&]" + name + "=([^&#]*)";
  var regex = new RegExp(regexS);
  var results = regex.exec(window.location.search);
  if(results == null)
    return "";
  else
    return decodeURIComponent(results[1].replace(/\+/g, " "));
}


var scriptarg = getParameterByName('js');

if(scriptarg.length) {
  console.log(scriptarg);
  if(scriptarg.indexOf("http") == 0) 
    getScript(scriptarg, function(){});
}

