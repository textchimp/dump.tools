
## Dump.tools Chrome extension (version 0.1Beta)


Tested on:
- Chromium 18.0.1025.151 (Developer Build 130497) on Ubuntu 10.04
- Chrome 22.0.1229.94 on Max OS X 10.7.3


### Installation:

Uninstall or disable old versions of the extension from the Extensions settings
page  first (Tools > Extensions).

Download the CRX extension file from http://textchimp.github.com/dump.tools/dump.tools.crx

Chrome should automatically ask you if you want to install it.

__If you get an error telling you extensions can only be installed from the Chrome
Store (i.e. OS X users)__:
Open the Extensions page in Chrome (Tools > Extensions),
and drag&drop the downloaded dump.tools.crx file to it from Finder.

__Unpacked Extension method (developers only)__:
  - Clone the project with git, or download the ZIP from here:
  https://github.com/textchimp/dump.tools/archive/master.zip
  - In the 'Extensions' settings page of Chrome, click 'Developer mode' on the top
  right to bring up a few extra buttons, and then click 'Load unpacked extension';
  you'll be asked to select the extension directory (which is wherever you downloaded
  or checked out the extension).


### Keyboard bindings


- `tab`: show preview panel
- `esc`: close preview window (also close Favourites panel if open, close Search results if Open)
  ``  ` ``: show/hide permanent Favourites panel
- ``shift + ` ``: show/hide old Favs panel
- `1`: show/hide Edit/web panel
- `enter`: submit Dump
- `ctrl + shift + z`: toggle between white/black background


### Mouse bindings:

- `ctrl + left-click`:  copy image to preview panel (i.e., no longer favs)
- `shift + left-click`: copy image to permanent favourites
- `right-click`: on any image in any tab and select 'Dump it!' from context menu to copy image URL to text
input/preview panel.



### Issues:

- Images in  preview window are top-aligned rather than bottom aligned, and probably
  not shown in proportion relative to each other... hopefully just a bit of CSS
  tweaking needed here

- Any text (not image URLs) typed in main text input always shows on the right of all
  images in the preview panel, no matter where it's actually typed relative to the
  URLS... more CSS float tweaking

- Manual favs palette: tag entry popup window disappears beyond right edge of palette
  window for images which are at the right of the palette (tag popup needs to have position
  tested and be re-positioned flush with right edge when necessary)

- Current maximum of 5Mb storage for chrome extensions limits number of permanent
  favourites, as thumbnails are stored using DataURLs. Would be nice to have a way
  around this, or a better way to cache thumbnails, that doesn't slow everything
  down (see below).

- The layout in the permanent favourites popup is a bit messy and chaotic, needs a
  cleanup. Also no way currently to delete items from the favourites, and (though
  there is a structure for tags in the localStorage data) no way to limit popup
  contents by tags. The popup will also get progressively slower to load as more
  favourites are added, even though the thubnails are locally cached...

- Canvas caching in the permanent favs list might not make sense for the new
  features of loading random images from dump, etc - too much mem & time used,
  not enough subsequent cache hits to justify it

- OS X: right click / ctrl-click issue
