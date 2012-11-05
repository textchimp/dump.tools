/****************************************************

====== Manual Favs window dropdown menu code =========
       (now also Photoblaster integration)

ISSUES:

- images disappearing off end of palette, need smarter resizing or scrolling

- menu disappears off end of palette when activated on rightmost images, and when
  tag or name input is open

- should load localStorage (& parse JSON) once at start, keep temp vars up to date,
  and save when necessary, instead of loading & de-JSONify-ing from localStorage
  every time we want to access the manualFavs data... too inefficient, probably will
  become noticable as saved fav lists get longer

- autocomplete lists used for tags & names should be updated on tag/name change

- tag input field remembers entered value, even if not 'saved' by clicking enter, i.e.
  if you make it go away by focusing elsewhere. So it might show tags that are entered
  but not actually saved. I think autocomplete is doing this, preserving the new typed value...

- not completely deleting tag from tag pool when last image with that tag is removed?

- preview window does not move images nicely on drag-n-drop (sometimes images are
  temporarily shifted below the lower edge of the preview window); they should all
  only slide left-right

TODO:

 - make editor iframes separate and show/hide rather than reload over each other, 
   so when switching between them, they save their state/place (needs reload button)

- use canvas for gifs in palettes, with animated mouseover, much faster

- extension: for 'Dump it!' menu item, test whether called from iframe whose
  parent is dump, & if so, dump to that parent, not the stored dump tab
  (also need a way to dump to all chat tabs that are open, not just the main one? 
  - for when clicking 'Dump it!' from other normal tab)

====================================================================================
 Some JS HTML5 image manipulation libraries to investigate, for in-browser image FX
====================================================================================

This one has the most filters, but costs $12:
http://codecanyon.net/item/jsmanipulate-jquery-image-manipulation-plugin/428234

http://www.pixastic.com/lib/

http://camanjs.com/

Roll your own:
http://www.html5rocks.com/en/tutorials/canvas/imagefilters/

- we want something easy to extend, to add our own glitch/fuckup effects

- also want to do layers, for adding text/overlays etc
  JS canvas layers: http://calebevans.me/projects/jcanvas/
  (need better layer blending support?)
  - Blending extension to Pixastic lib: http://blog.nihilogic.dk/2009/01/photoshop-blend-modes-with-pixastic.html

  - WebGL-based blending: http://www.andersriggelsen.dk/glblendfunc.php


- animated GIF support? want to be able to pull apart by frame, reorder, etc...
  possible in pure JS? Looks like it: http://slbkbs.org/jsgif/
  Also this lib: https://github.com/antimatter15/jsgif

- should we just plug into GIMP batch-mode or something on the server?
- how to save a canvas/DataURL to a remote image hosting server? 
    - easy, with Ajax, could use i.e. imgur.com API? 
      http://stackoverflow.com/questions/9695586/cross-domain-xhr-uploading-via-javascript

- NEXT LEVEL: WebGL-based fast effects: see http://www.iquilezles.org/apps/shadertoy/

******************************************************/


// insert JQuery UI, for drag n drop																	  
// (fast to load Google version (cached), but better to load our own custom, minimal version from dump?)

//TODO: ok to leave this commented out? 
//$('<script src="https://ajax.googleapis.com/ajax/libs/jqueryui/1.8.21/jquery-ui.min.js"></script>').appendTo('head');

// insert custom CSS
$('<link rel="stylesheet" type="text/css" href="http://textlabs.alwaysdata.net/js/dump.css">') .appendTo('head');

var img_thumb_max_width = 150;

var debug = 1;
function dbg(e) {
	if(!debug) return;
	console.log(arguments.callee.caller.name + '(): ', arguments);
}


function pickRandomProperty(obj) {
    var result;
    var count = 0;
    for (var prop in obj)
        if (Math.random() < 1/++count)
           result = prop;
    return result;
}

// because keys() is not always defined?!
function getKeys(obj){
   var keys = [];
   for(var key in obj){
	   if (obj.hasOwnProperty(key)) {
		   keys.push(key);
	   }
   }
   return keys;
}

function tsplit( val ) {
  return val.split(/\s*,+\s*/);  //split( /,\s*/ );
}

function extractLast( term ) {
  return tsplit( term ).pop().toLowerCase(); // note, this means all tags are case-insensitive
}

function shownameinput(e){
	// e is the <li>
  $(e).children('div.namelabel').hide(); 
  $(e).children('div.namein').show(); 

  $(e).children('div.namein').children('input.nameinput').blur(function(){
		  console.log('shownameinput blur HIDE');
    hidenameinput(this);
  })
  .focus(); 
}

function hidenameinput(e){
  $(e).unbind('blur'); // stop weird blur behaviour
  $(e).parent().hide();
  $(e).parent().prev().show();
}


function hidetaginput(e) {
  // e is the input itself
  $(e).unbind('blur'); // stop weird blur behaviour
  $(e).parent().hide(); 
  $(e).parent().prev().show();

  // hide any open autocomplete
  $(this).autocomplete("close");

  // hide tag filter list
  $('#manual-palette-taglist-summary').show();
  $('#manual-palette-taglist').fadeOut(200);
   
}

function showtaginput(e) {
	$(e).children('div.taglabel').hide();
	$(e).children('div.tagin').show();

	$(e).find('div.tagin > input.taginput')
    .blur(function(e){ 
       if(!$('.ui-autocomplete').is(':visible') ) { 
		   //console.log('hide from .taginput blur', this); 
	     hidetaginput(this);
       }
	   //console.log('hidden from tagin blur');
       $(this).parents('span.menuicon').hide(); 
    })
    .focus();

	// show tag filter list, to help with naming new tags
	$('#manual-palette-taglist-summary').hide();
	$('#manual-palette-taglist').fadeIn(100);

	//old_tag_input = $(e).find('div.tagin > input.taginput').val();


	if($(e).children('div.tagin').attr('ac-loaded') === undefined) {

	   // attach autocomplete only when tag input is first used 

 		$(e).find('div.tagin > input.taginput')
       // don't navigate away from the field on tab when selecting an item
         .bind( "keydown", function( event ) {

           if ( event.keyCode === $.ui.keyCode.TAB &&
       	     $( this ).data( "autocomplete" ).menu.active ) {
       		  event.preventDefault();

       	   } else if (event.keyCode === $.ui.keyCode.ENTER) {
			   
		     if($( this ).data( "autocomplete" ).menu.active) {
			   // don't do anything else if enter was pressed on autocomplete menu
			   return true; 
			 }

			 $(this).autocomplete("close"); // just in case it's still around
		     hidetaginput(this);

			 $(this).val( setManualFavTags($(this).parents("div.mm").find("img").attr("src"), $(this).val()) );

       	   } else if (event.keyCode === $.ui.keyCode.ESCAPE && !$('.ui-autocomplete').is(':visible')) {
		     // cancel tag entry
			 //console.log('setting from' + $(this).val() + ' to ' + old_tag_input);
			 // can't reset the old value from here!
			 hidetaginput(this);
		   }
         })


         .autocomplete({
           minLength: 1,
					 /*
       	   source: function( request, response ) {
       	   // delegate back to autocomplete, but extract the last term
       	   response( $.ui.autocomplete.filter(
       		 autocomplete_tags, extractLast( request.term ) ) );
       	   },
					 */

            source: function( request, response ) {
		    // show only tags starting with the typed letter
	        // (also make sure to complete last item in list, i.e. after last comma (using 
            // extractLast() instead of just request.term
            // from http://forum.jquery.com/topic/select-only-items-that-start-with-jquery-ui-autocomplete
            var matches = $.map( autocomplete_tags, function(tag) {
               if ( tag.toUpperCase().indexOf(extractLast( request.term ).toUpperCase()) === 0 ) {
                 return tag;
               }
           });
           response(matches);
		   },
       	   focus: function() {
       	     // prevent value inserted on focus
       	     return false;
       	   },
           open: function(){
       	     // fix layer visibility and set colour, also stop widget from obscuring text input
			 var newtop = $(this).parent().parent().next().offset().top + 12 + 'px';
			 var newleft = $(this).offset().left + 'px';
			 $(this).autocomplete('widget').css({'z-index': '55555555555', 'background-color': '#EFE', 'width': '128px', 'top':newtop, 'left':newleft});
       	     return false;
          },
		  search: function( event, ui ) {
		    //make sure a few letters were typed since last comma
		    //console.log(this.value, $(this).autocomplete('widget').css('top'));
			var terms = tsplit( this.value );
			// get the current input
			var t = terms.pop();
			if(t.length < 1) return false; // don't search unless term has started
 		  },
       	  select: function( event, ui ) {
       	    var terms = tsplit( this.value );
       	    // remove the current input
       	    terms.pop();
       	    // add the selected item
       	    terms.push( ui.item.value );
       	    // add placeholder to get the comma-and-space at the end
       	    terms.push( "" );
       	    this.value = terms.join( ", " );
       	    return false;
       	}
       });
       //end input.taginput handlers

	  //dbg('autocomplet ATTACHED', $(e).children('.taginput'));
 	  $(e).children('.tagin').attr('ac-loaded', 'true')
	}
}


/* command line */
function eval_cmd(){
	var cmd = $("#msgInput").val().substring(1);
	eval(cmd);
	$("#msgInput").val('');
}

var oldsubmit = submitMessage;
var newsubmit = function(){ 
	//console.log($("#msgInput").val()); 
	if($("#msgInput").val().indexOf("!") == 0) { 
      eval_cmd(); 
    } else { 
	  close_preview();
      oldsubmit(); 
    } 
};

/*
function test_input(e) {
	console.log($(e.target).val(), e);
    if(e.keyCode == 91) {  // '['
      
	}
}
//$("#msgInput").keypress(test_input);
*/

$("#msgInput").unbind("keyup");
$("#msgInput").keyup(ifEnter(newsubmit)); 


/* end command line */

var img_store = new Object();

var canvas_store = new Object();

var filterview_store = new Object();

var autocomplete_tags = getKeys(getManualFavesAllTags());

function manualPaletteBuildImageThumbs() {
    $("#manual-palette-thumbs").html("");
	var count = 0;
    var divcount = 0;
	var debug_urls = '';
    var imgs = getManualFavesImages(); //JSON.parse(localStorage.tc_manual_favs_image
	dbg('Build (tag: ' + filter_tag + '):', imgs);
    if (imgs && imgs.length != 0) {
		var name, tags;
		var filter_tag = getManualFavesCurrentDisplayTag();
        dbg('Build (tag: ' + filter_tag + '):', imgs);

		/*
		if(filter_tag.length && typeof filterview_store[filter_tag] != "undefined" ) {
				$('#manual-palette-thumbs').replaceWith( filterview_store[filter_tag] );
				console.log('used store thumbs div', filter_tag, filterview_store[filter_tag]);
				return;
		}
		*/

		/* sorting tests
		var sorted = [];
		for(var i in imgs) {
			sorted.push({date:imgs[i].date, key:i});
		}		
		console.log(sorted);

		sorted.sort(function(a, b) { return a.date - b.date } );

		console.log(sorted);
		*/
		var show_reverse = true;
		var keys = new Array();
		var rand_display_count = 20;

		// sort keys of main image array, to show in the correct order
		// (also perform tag filtering here)

		if(show_reverse) {
		  // most-recent-first order
			
		    if(filter_tag.length && filter_tag == '(random)') {

				for(var i=0; i < rand_display_count; i++) {
					var rimg_key = pickRandomProperty(imgs);
					// we will sometimes end up with less than 20 random results,
					// since this code just moves on if the image is already in our random group
					if($.inArray(rimg_key, keys) == -1)
						keys.unshift(rimg_key);
				}

			} else {
				
				for (var k in imgs) {
					// apply tag filter
					if(filter_tag.length && filter_tag == '(untagged)' && imgs[k].tags.length) {
						continue; //skip
					} else if(filter_tag.length && (filter_tag != '(all)' && filter_tag != '(untagged)') && $.inArray(filter_tag, imgs[k].tags) == -1) {
						continue; //skip
					}
					keys.unshift(k);
				}
			}

		} else {
		  // earliest-first order
		  for (var k in imgs) {
		    if(filter_tag.length && filter_tag == '(untagged)' && imgs[k].tags.length) {
			  continue; //skip
		    } else if(filter_tag.length && (filter_tag != '(all)' && filter_tag != '(untagged)') && $.inArray(filter_tag, imgs[k].tags) == -1) {
		      continue; //skip
		    }
			keys.push(k);
		  }
		}

		//console.log(keys);

		for(var j=0; j < keys.length; j++) {
			
		  var url = keys[j];
		  var img = imgs[url];	

		  name = img.name.length ? img.name : 'name';
		  tags = img.tags.join(', ');

		  divcount++;
		  var canvasdiv = ''
				
			  debug_urls += url + '\n';
  
		  if(parseUri(url)["file"].toLowerCase().substr(-3) == "gif") {
			// handle as animated gif, make canvas
			canvasdiv = '<div class="canvas_wrap animated" url="' + url + '" id="cw-' + divcount + '"></div>';
		  $("#manual-palette-thumbs").append('\
<div class="mm" style="float: left" id="mm-' + divcount + '">\
  <span class="menuicon" >\
  <ul class="mymenu">\
    <li onclick="javascript:shownameinput(this);" class="nameli"><div class="namelabel" style="font-style:italic;">' + name + '</div><div class="namein" style="display:none"><input type="text" class="nameinput" value="' + name + '"></div></li> \
    <li onclick="javascript:showtaginput(this);" class="tagli"><div class="taglabel">tags</div><div class="tagin" style="display: none;"><input type="text" class="taginput" value="' + tags + '"></div></li> \
    <li onclick="javascript:removeManualFav(this);">del</li> \
  </ul>\
</span>\
' + canvasdiv + '\
</div>');

			if(typeof canvas_store[url] == "undefined") {

              var img = new Image();
			  img.src = url;
			  img.div_count = divcount;
			  img.onload = function(){
			    //count++;
			    img_store[this.src] = this;
			  
			    // create canvas image, no animation
			    var c = document.createElement("canvas");
			    c.width = this.width;
			    c.height = this.height;
			    c.id = "c" + $(this).attr('div_count');
			    c.href = this.src;
			    c.class = 'cnv';
			    //console.log('set image width to ' + this.width + 'x' + this.height + ', canvas to ' + c.width + 'x' + c.height);
			    var ctx = c.getContext('2d');
			    ctx.drawImage(this, 0, 0, c.width, c.height);
			  
			    canvas_store[this.src] = c;
		      	
			    $('#cw-' + $(this).attr('div_count')).append(c); //.addClass(anim)
		      } // end onload fn
			
			} else {
				$('#cw-' + divcount).append(canvas_store[url]);
			}

		  } else {
			canvasdiv = '<div class="canvas_wrap" url="' + url + '" id="cw-' + divcount + '"><img title="\'' + (name == 'name' ? '(no name)' : name) + '\'\ntags: ' + tags + '" src="' + url + '"></div>';

		  $("#manual-palette-thumbs").append('\
<div class="mm" style="float: left" id="mm-' + divcount + '">\
  <span class="menuicon" >\
  <ul class="mymenu">\
    <li onclick="javascript:shownameinput(this);" class="nameli"><div class="namelabel" style="font-style:italic;">' + name + '</div><div class="namein" style="display:none"><input type="text" class="nameinput" value="' + name + '"></div></li> \
    <li onclick="javascript:showtaginput(this);" class="tagli"><div class="taglabel">tags</div><div class="tagin" style="display: none;"><input type="text" class="taginput" value="' + tags + '"></div></li> \
    <li onclick="javascript:removeManualFav(this);">del</li> \
  </ul>\
</span>\
' + canvasdiv + '\
</div>');


		  }
		  
		} // end thumbnail loop



// give img onloads a chance to append canvases etc... actually
// will need to wait until all canvases are loaded & trigger somehow
// -- but all the above only on first canvas draw
/*
setTimeout(function(){
		console.log('saved to filterview_store: ', filter_tag, $('#manual-palette-thumbs'));
		filterview_store[filter_tag] = $('#manual-palette-thumbs');
}, 1000);
*/ 


		//dbg('urls in tag "' + filter_tag + '": ' + debug_urls);

		// move these event handlers out of this fn, and use .live() to make them stick?

		$('.nameinput')
        .keypress(function(e){ 
          if(e.charCode==13){ 
		    $(this).parent().prev().html($(this).val())
		    setManualFavName($(this).parents("div.mm").children("img").attr("src"), $(this).val());
		    hidenameinput(this);
		  }
		 })
         .focus(function(){ 
            $(this).select(); 
		 })
         .blur(function(){ 
				 console.log('hide from nameinput blur');
			hidenameinput(this);           
		    $(this).parents('span.menuicon').hide(); 
         });
    }
} // end fn manualPaletteBuildImageThumbs()



$('span.menuicon').live('hover', function(e){ 

  if (e.type == 'mouseover') {

	  //console.log('.menuicon hover in');
    $(this).css('opacity', '1.0'); 
    $(this).children('.mymenu').slideDown(100);
  } else {

	  //console.log('.menuicon hover out');
    if(!$(this).find('ul.mymenu > li.tagli > div.tagin').is(':visible') &&
       !$(this).find('ul.mymenu > li.nameli > div.namein').is(':visible') ) { 
      $(this).css('opacity', '0.7'); 
      $(this).children('ul.mymenu').slideUp(100);

    }
  }
});


$("#manual-palette-thumbs canvas").live('click', function(e){
  paletteToChat($(this).next("img"));
  return false;
});
$("#manual-palette-thumbs img").live('click', function(e){
  paletteToChat(this);
  return false;
});


$('div.mm').live('hover', function(e){

  if (e.type == 'mouseover') {

	  //console.log('.canvas_wrap hover in');

	  if($(this).find('canvas').length) {
		// animate
		if($(this).find('img').length) {
		  $(this).find('canvas').hide();
		  $(this).find('img').show();
		} else {
		  var i =  img_store[ $(this).children("div.canvas_wrap").attr('url') ] //new Image();
		  $(i).addClass('anim8'); //make img visible
		  $(this).find('canvas').hide();
		  $(this).append(i);
		}

  	  }

	  // show menuicon stuff
	   if(!$('div.tagin').is(':visible') && !$('div.namein').is(':visible')) {
		 // close other menus and open this one, only if other tag/name inputs not visible

	     $("span.menuicon").not($(this).children("span.menuicon")).hide(); 
		 $(this).children("span.menuicon").show(); 
	   }

   } else {

	  //console.log('.canvas_wrap hover out');

	  if($(this).find('canvas').length) {
		$(this).find('img').hide();
	    $(this).find('canvas').show();
	  }

	  // hide menuicon stuff
	  //console.log('.mm hover out');
      if(!$(this).find('span.menuicon > ul.mymenu > li.tagli > div.tagin').is(':visible') &&
        !$(this).find('span.menuicon > ul.mymenu > li.nameli > div.namein').is(':visible')) { 

		  //$(this).prev("span.menuicon").children('ul.mymenu').hide(); 
		$(this).children("span.menuicon").hide(); 	
	  }
   }
});


// tag list beneath thumbs

//$('#manual-palette-thumbs').wrap('<div id="manual-palette-scrollable">');
//$('#manual-add-url-txt').remove();
//$('#manual-palette').append('<div id="manual-palette-widgets"><div id="manual-palette-taglist-summary" class="dtest" ></div><div id="manual-palette-taglist" class="dtest"></div><input id="manual-add-url-txt" type="text"></div>');
$('#manual-palette').append('<div id="manual-palette-widgets"><div id="manual-palette-taglist-summary" class="dtest" ></div><div id="manual-palette-taglist" class="dtest"></div></div>');

function buildManualFavTagListDisplay(){
	var alltags = getManualFavesAllTags();
	var alltagkeys = getKeys(alltags);
	alltagkeys.sort();
	alltagkeys.unshift('(random)');
	alltagkeys.unshift('(untagged)');
	alltagkeys.unshift('(all)');
	var tmp = [];
	var tmp_hi;
	for(var j = 0; j < alltagkeys.length; j++) {

		var tag_item_count = getKeys(alltags[ alltagkeys[j] ]).length;
		var tag = alltagkeys[j];

		if(getManualFavesCurrentDisplayTag() == alltagkeys[j]) {
			tmp_hi = ' style="font-weight: bold; font-size: 10pt" ';
		} else {
			tmp_hi = ' style="font-size: 10pt; color: #666" ';
		}

		tmp.push('<a href="#" onclick="javascript:return setManualFavTagFilter(this);" title="' + (tag_item_count > 1 ? tag_item_count + ' images' : tag_item_count + ' image') + '" ' + tmp_hi + '>' +  tag + '</a>');
	}
	$('#manual-palette-taglist').html('tag filter: ' + tmp.join(', &nbsp;'));
	$('#manual-palette-taglist-summary').html('tag filter: <span style="color: black">' + (getManualFavesCurrentDisplayTag().length ? getManualFavesCurrentDisplayTag() : '(all)') +  '</span>');
}

$('#manual-palette-taglist-summary').hover(
	function(){
		$(this).hide();
		$('#manual-palette-taglist').fadeIn(100);
	}
);

$('#manual-palette-taglist').mouseleave(
  function(){	
	  $('#manual-palette-taglist-summary').show();
	  $(this).fadeOut(200);
  });


buildManualFavTagListDisplay();


function setManualFavTagFilter(e) {
	if(hasLocalStorage()) {
		var clicked = $(e).html();
		setManualFavesCurrentDisplayTag(clicked);
		dbg("set filter tag to:", getManualFavesCurrentDisplayTag());
	}
	//$('#manual-palette').css('width', '313px');
	buildManualFavTagListDisplay();
	manualPaletteBuildImageThumbs();
	return false;
}



function setManualFavName(url, name) {
    if (!url) return;
	var mfavs = getManualFavesImages();
	if(mfavs[url]) {
		dbg('set: ', name, url);
		mfavs[url].name = name;
		setManualFavesImages(mfavs);
	}
}

function get_clean_tags(tstr) {
   var t = tstr.split(/\s*,+\s*/);
   var a = Array();
   for(var i = 0; i < t.length; i++) {
	   t[i] = $.trim(t[i]);
	   if(t[i].length) {
		   a.push(t[i].toLowerCase());
	   }
   }
   return a;
}

function setManualFavTags(url, tags) {
    if (!url) return;
	var mfavs = getManualFavesImages();
	if(mfavs[url]) {

		var old_tags = mfavs[url].tags;
		var new_tags = get_clean_tags(tags);
		var all_tags = getManualFavesAllTags();

		if(!new_tags.length) {
			dbg('empty tag array ');
		}
		dbg('set: ', new_tags, url);

		mfavs[url].tags = new_tags;
		setManualFavesImages(mfavs);

		//remove old tags from tag pool
		for(var i = 0; i < old_tags.length; i++) {
			if(all_tags[ old_tags[i] ] !== undefined) {
				delete all_tags[ old_tags[i] ][ url ];
				if( getKeys(all_tags[ old_tags[i] ]).length == 0) {
					delete all_tags[ old_tags[i] ];
					console.log('del empty tag from pool: ' + old_tags[i]);
				}
			}
		}

		// add new tags to tag pool
		for(var i = 0; i < new_tags.length; i++) {

			if(all_tags[ new_tags[i] ] === undefined) {
				all_tags[ new_tags[i] ] = new Object;
			}
			all_tags[ new_tags[i] ][ url ] = true;
			console.log('add to tag pool: ' + new_tags[i] + '(' + url + ')');
		}

		setManualFavesAllTags(all_tags)
		buildManualFavTagListDisplay();
	}

	return new_tags.join(', ');
}


function addManualFav(url) {
    if (!url) return;
	dbg(url, getManualFavesImages());
    if (hasLocalStorage()) {
        if (manPaletteIsEmpty())
            $("#manual-palette-thumbs").html("");
        var mfavs = getManualFavesImages();
        if (!mfavs[url] || typeof mfavs[url] == "undefined") {
			var date = new Date();
            mfavs[url] = {name: "", tags: [], date: date.getTime() };
            setManualFavesImages(mfavs);
			var current_tag_filter = getManualFavesCurrentDisplayTag()
				if(manPaletteOpen && (!current_tag_filter.length || (current_tag_filter == '(all)') || current_tag_filter == '(untagged)'))
				manualPaletteBuildImageThumbs();
            // $("#manual-palette-thumbs").append("<img onclick='paletteToChat(this)' src='" + url + "'>");
        }
    }
};

function removeManualFav(li) {

	var url = $(li).parents('span.menuicon').next('div.canvas_wrap').attr('url');
	if(typeof url == "undefined") return;

    if (hasLocalStorage()) {
        var mfavs = getManualFavesImages();
		if(mfavs[url]) {
			var del_tags = mfavs[url].tags;
			delete mfavs[url];
			dbg('removed ', url);
            setManualFaves(mfavs);

			// remove url from tags in tag pool
			var all_tags = getManualFavesAllTags();
			var dbg_str = ''
			for(var i = 0; i < del_tags.length; i++) {
				all_tags[ del_tags[i] ][ url ] = true;
				dbg_str += del_tags[i];
				// delete tag from pool if now empty
				if( getKeys(all_tags[ del_tags[i] ]).length == 0) {
					delete all_tags[ del_tags[i] ];
					dbg_str += ' (deleted from pool)';
				}
				dbg_str += ', ';
			}
			setManualFavesAllTags(all_tags)
            manualPaletteBuildImageThumbs();
			dbg('removed from tags: ', dbg_str);
        }
    }
};

function manPaletteIsEmpty() {
    return localStorage.tc_manual_favs_images === undefined || typeof JSON.parse(localStorage.tc_manual_favs_images) != "object";
};

function getManualFavesImages() {
	if(!hasLocalStorage()) return;
	if(manPaletteIsEmpty()) {
		// first run, no localStorage variable defined yet
		return new Object;
	}
	var img_hash = JSON.parse(localStorage.tc_manual_favs_images);
	if(typeof img_hash != "object") {
		// should also check for keys(img_hash).length above, but keys() not always defined?!!
		dbg('no such storage', img_hash)
		img_hash = new Object;
	}
	dbg('loading:', img_hash);
    return img_hash;
};

function getManualFavesCurrentDisplayTag(){
  if(hasLocalStorage() && localStorage.manual_favs_current_display_tag !== undefined) {
    return localStorage.manual_favs_current_display_tag;
  } else {
	return '';
  }
}

function setManualFavesCurrentDisplayTag(tag){
	if(hasLocalStorage()){
  	  localStorage.manual_favs_current_display_tag = tag;
  } 
}


function setManualFaves(mfavs) {
	//    localStorage.manual_favs = JSON.stringify(mfavs);
	dbg('saving:', mfavs);
    localStorage.tc_manual_favs_images = JSON.stringify(mfavs);

};

function setManualFavesImages(mfavs) {
	dbg('saving:', mfavs);
    localStorage.tc_manual_favs_images = JSON.stringify(mfavs);
};

function getManualFavesAllTags() {
	if(manPaletteIsEmpty()) {
		return false;
	}

	var tags;
    if (localStorage.tc_manual_favs_tags === undefined || typeof JSON.parse(localStorage.tc_manual_favs_images) != "object") {
		tags = new Object;
	} else {
		tags = JSON.parse(localStorage.tc_manual_favs_tags);
		if(typeof tags != "object") {
			tags = new Object;
		}
	}
	dbg(tags);
	return tags;
}

function setManualFavesAllTags(tags) {
	if(manPaletteIsEmpty()) {
		// first run, no localStorage variable defined yet
		dbg('no manualpalette!');
		return false;
	}

    if (localStorage.tc_manual_favs_tags === undefined || typeof JSON.parse(localStorage.tc_manual_favs_images) != "object") {
		//tags = new Object;
		dbg("EMPTY tag pool");
	} 

	if(typeof tags != "object") {
		dbg('bad tags, not saved', tags);
		return false;
	}

	localStorage.tc_manual_favs_tags = JSON.stringify(tags);	
	dbg(tags);
}



function getManualFavesAllNames(){
  var favs = getManualFavesImages();
  var names = [];
  for(var url in favs) {
	  names.push(favs[url].name);
  }
  dbg(names);
  return names;
}

		
var manual_fav_img_names = getManualFavesAllNames();

$('#manual-add-url-txt').unbind();
$('#manual-add-url-txt').keypress(function(e){
	var txt = $('#manual-add-url-txt').val();
    if(txt.indexOf('http') == 0) {
		if(e.charCode == 13) {
			addManualFav($('#manual-add-url-txt').val().trim());
			$('#manual-add-url-txt').val("");
		} 
	} else {
		// handle other stuff like commands
		var found_name = false;
		if(e.charCode == 13) {
			var favs = getManualFavesImages();
			for (var url in favs) {
				//console.log(favs[url].name, txt, url.toString());
				if(favs[url].name == txt) {
					$('#msgInput').val($('#msgInput').val() + ' ' + url); 
					$('#manual-add-url-txt').val("");
					prevfn();
					found_name = true;
					break;
				}
			}
			if(!found_name) {
				// other commands
			}
		}
	}
});


//console.log('loaded dump.js from alwaysdata.net');


$('img').live('click', function(e) {
		if (e.shiftKey) {
			// use new manual fav palette instead of extension Popup
			addManualFav(e.target.src);	 
		}
});

// redef of this fn to focus() input
function manPaletteShow() {
		if (manPaletteOpen) return;
		manPaletteOpen = true;
    $("#manual-palette").show();
    if (! hasLocalStorage()) {
        $('#manual-palette-localstorage-error').show()
    } else if (manPaletteIsEmpty()) {
        $('#manual-palette-thumbs-empty').show();
    } else {
        manualPaletteBuildImageThumbs();
        $('#manual-add-url-txt').focus();
    }
};

/* Test Photoblaster integration */
function togglePBPalette(){
  if($('#pb-palette').is(':visible')) {
    $('#pb-palette').hide();
  } else {
    $('#pb-palette').show();

	if($('#pbframe').attr('src') === undefined) {
      $('#pbframe').attr('src', pb_src);
     }
  }
}



$('<div id="pb-palette" class="pb-palette resizable"><iframe id="pbframe"></iframe></div>')
.insertAfter("#manual-palette")

// selector to choose editor? Photoblaster / Glitter text / etc?
$('#pb-palette').append('<span id="seteditor"><select id="seteditor-select">\
<option value="http://asdf.us/im" oldval="http://asdf.us/im">Photoblaster</option>\
<option value="http://asdf.us/imbreak/">Photoblaster Fotofucker</option>\
<option value="http://asdf.us/imgradient/">Photoblaster Gradient Generator</option>\
<option value="http://asdf.us/imgrid/">Photoblaster Grid Generator</option>\
<option value="http://asdf.us/im/gallery/">Photoblaster Galley</option>\
<option value="http://www.familylobby.com/create-glitter-text-graphics.asp">Glitter text</option>\
<option value="http://tmv.proto.jp/">Tumblr Mosaic Viewer</option>\
<option value="http://imgur.com/gallery">Imgur Gallery</option>\
<option value="http://www.lunapic.com/editor/">Lunapic Editor</option>\
<option value="http://ffffound.com/">FFFfound!</option>\
</select>\
</span>');


var pb_src = $('#seteditor-select option:selected').val() + '#http://' + window.location.host + '/';

$('#seteditor-select').change(function(){
  pb_src = this.options[this.selectedIndex].value + '#http://' + window.location.host + '/';
  $('#pbframe').attr('src', this.options[this.selectedIndex].value);
});





/* 
alterations to PB CSS to make it fit better:
label{
width: 86px;
font-size: 9pt;
}
.shim{
height: 2px;
}
 */

$('<button id="photoblaster-button" title="Photoblaster image tricks" />').insertAfter('#manual-palette-button');

$('#photoblaster-button')
.click(function(e){
        togglePBPalette();
        e.stopPropagation();
		return false;
});

/*
// keep track of what's hovered over
var last_hover;
$('img').live('mouseenter', function(e) {
		last_hover = e.target;
}).live('mouseleave', function(e) {
        last_hover = 0;
});
*/

/*
 * jQuery postMessage - v0.5 - 9/11/2009
 * http://benalman.com/projects/jquery-postmessage-plugin/
 * 
 * Copyright (c) 2009 "Cowboy" Ben Alman
 * Dual licensed under the MIT and GPL licenses.
 * http://benalman.com/about/license/
 */
(function($){var g,d,j=1,a,b=this,f=!1,h="postMessage",e="addEventListener",c,i=b[h]&&!$.browser.opera;$[h]=function(k,l,m){if(!l){return}k=typeof k==="string"?k:$.param(k);m=m||parent;if(i){m[h](k,l.replace(/([^:]+:\/\/[^\/]+).*/,"$1"))}else{if(l){m.location=l.replace(/#.*$/,"")+"#"+(+new Date)+(j++)+"&"+k}}};$.receiveMessage=c=function(l,m,k){if(i){if(l){a&&c();a=function(n){if((typeof m==="string"&&n.origin!==m)||($.isFunction(m)&&m(n.origin)===f)){return f}l(n)}}if(b[e]){b[l?e:"removeEventListener"]("message",a,f)}else{b[l?"attachEvent":"detachEvent"]("onmessage",a)}}else{g&&clearInterval(g);g=null;if(l){k=typeof m==="number"?m:typeof k==="number"?k:100;g=setInterval(function(){var o=document.location.hash,n=/^#?\d+&/;if(o!==d&&n.test(o)){d=o;l({data:o.replace(n,"")})}},k)}}}})(jQuery);



$.receiveMessage(function(e){
  console.log('got message from iframe:', e);
  var data;
  try{
  	data = JSON.parse(e.data);
	if ( data.command == 'paste_url_to_dump_msginput' ) {
		$("#msgInput").val($("#msgInput").val() + ' ' + data.url);
		prevfn();
    } 

  }catch(e){
  	console.log('receiveMessage (parent): JSON parse error');
  }  
});

var last_drag_half = '';

var last_drag_target = 0;

$('img:not(.preview)')
.live("mouseover", function() { 
  if (!$(this).data("init")) { 
    $(this).data("init", true); 

    $(this).draggable({ 
    iframeFix: true,
			//    revert: true,
			//    revertDuration: 200,
    helper: "clone",
    cursor: "move",
    drag: function(event, ui) {
 	  if($('#pb-palette').is(':visible')) {
        var ibottom = $('#pbframe').offset().top + $('#pbframe').height();
        var iright = $('#pbframe').offset().left + $('#pbframe').width();
        if(ui.offset.top > $('#pbframe').offset().top && ui.offset.top < ibottom &&
           ui.offset.left > $('#pbframe').offset().left && ui.offset.top < iright) {
    
     	  var ihalfway_height = $('#pbframe').offset().top + ($('#pbframe').height() / 2);
    	  if(ui.offset.top < ihalfway_height) {
    	    if(last_drag_half != 'top') {
    	      $.postMessage(JSON.stringify({'command':'img_drag'}), pb_src, $('#pbframe').get(0).contentWindow );
    	      last_drag_half = 'top';
    	    }			   
    	  } else {
    	    if(last_drag_half != 'bottom') {
    	      $.postMessage(JSON.stringify({'command':'background_drag'}), pb_src, $('#pbframe').get(0).contentWindow );
     	      last_drag_half = 'bottom';
     		}			   
    	  }
    	}// end within-iframe test
      }
    },
	stop: function(event, ui) { 
				console.log('draggable: stop:', event, 'to: ', $(event.srcElement).attr('id'), event.srcElement, ui, ui.offset.top, ui.offset.left);
				last_drag_target = event.srcElement;
			//if($(event.srcElement.id).parents('#manual-palette').length) console.log('MAN ADD');

//	  console.log('iframe:', $('#pbframe').offset().top, $('#pbframe').offset().left);
      if($('#pb-palette').is(':visible')) {
  	   
        var ibottom = $('#pbframe').offset().top + $('#pbframe').height();
        var iright = $('#pbframe').offset().left + $('#pbframe').width();
        if(ui.offset.top > $('#pbframe').offset().top && ui.offset.top < ibottom &&
           ui.offset.left > $('#pbframe').offset().left && ui.offset.top < iright) {

 	      // dropped within iframe! now, top half or bottom half?
	      var ihalfway_height = $('#pbframe').offset().top + ($('#pbframe').height() / 2);
	      if(ui.offset.top < ihalfway_height) {
		    console.log('dropped in iframe: top half', event.target.src);
		    $.postMessage(JSON.stringify({'command':'image_url','url':event.target.src}), pb_src, $('#pbframe').get(0).contentWindow );
	      } else {
		    console.log('dropped in iframe: bottom half', event.target.src);
		    $.postMessage(JSON.stringify({'command':'background_url','url':event.target.src}), pb_src, $('#pbframe').get(0).contentWindow );
	      }
       }
       last_drag_half = '';
	  } 
  }
  });

  }
}); // end img mouseover draggable stuff

// fix dropping into manual palette to add
/*
$("#manual-palette *") 
.droppable({
	accept: 'img',
	drop: function( event, ui ) {
 	  console.log('droppable DROPPED', this, event, $(ui.draggable).attr('src'));
	  addManualFav($(ui.draggable).attr('src'));
    }
});
*/

function send_to_pb_img(url) {
  if(!$('#pb-palette').is(':visible')) togglePBPalette();
  $.postMessage(JSON.stringify({'command':'image_url','url':url}), pb_src, $('#pbframe').get(0).contentWindow );
}

function send_to_pb_img_bg(url) {
  if(!$('#pb-palette').is(':visible')) togglePBPalette();
  $.postMessage(JSON.stringify({'command':'background_url','url':url}), pb_src, $('#pbframe').get(0).contentWindow );
}

$("img").live('click', function(e){
  //console.log('manfav', e.shiftKey);
  if(e.shiftKey) {
   addManualFav(e.target.src);
   return false;
  }
 });

// We seem to need to wait a few seconds before loading the stuff requiring jquery UI,
// as the UI script is loaded in the dumpfm.js extension and injected into the main dump.fm page
setTimeout(function(){
  
  $( "#manual-palette").resizable({handles: "nw, se, ne, sw"});
  $( "#pb-palette").resizable({
    handles: "nw, se, ne, sw",
    stop: function(event, ui){
      $("#pbframe").css('width', ui.size.width + 'px').css('height', ui.size.height + 'px');
    }
  });
  
  
  $('#manual-add-url-txt').autocomplete({ 
  		source: manual_fav_img_names,
  		open: function(){
  			// style the popup
  			$(this).autocomplete('widget').css({'z-index': '55555555555', 'background-color': '#EFF5FB', 'width': '128px'});
  			return false;
  		}
  });
  
  
}, 3000);

//, div.resizable" ).resizable();
//manPaletteToggle();

//togglePBPalette();
