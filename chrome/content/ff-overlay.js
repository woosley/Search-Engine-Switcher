searchSwitcher.onFirefoxLoad = function(event) {
  document.getElementById("contentAreaContextMenu")
          .addEventListener("popupshowing", function (e){ searchSwitcher.showFirefoxContextMenu(e); }, false);
};

searchSwitcher.showFirefoxContextMenu = function(event) {
  // show or hide the menuitem based on what the context menu is on
  document.getElementById("context-searchSwitcher").hidden = gContextMenu.onImage;
};

window.addEventListener("load", function () { searchSwitcher.onFirefoxLoad(); }, false);
