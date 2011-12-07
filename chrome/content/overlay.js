var searchSwitcher = {
    engineList: new Array(),
    stringsBundle: null,
    isEngine: false,
    
    /* wikipedia */
    hasWiki: false,
    
    /* install button somewhere */
    installButton: function installButton(toolbarId, id, afterId) {  
        if (!document.getElementById(id)) {  
            var toolbar = document.getElementById(toolbarId);  
            var before = toolbar.firstChild;  
            if (afterId) {  
                elem = document.getElementById(afterId);  
                if (elem && elem.parentNode == toolbar)  
                    before = elem.nextElementSibling;  
            }  
            toolbar.insertItem(id, before);  
            toolbar.setAttribute("currentset", toolbar.currentSet);  
            document.persist(toolbar.id, "currentset");  
  
            if (toolbarId == "addon-bar")  
                toolbar.collapsed = false;  
        }  
    },

    /* function to call when the addons is loaded */
    onLoad: function() {
        
        /* watch preference change */
        this.prefs = Components.classes["@mozilla.org/preferences-service;1"]  
            .getService(Components.interfaces.nsIPrefService)  
    	    .getBranch("extensions.searchSwitcher.");  
        this.prefs.QueryInterface(Components.interfaces.nsIPrefBranch2); 
        this.prefs.addObserver("", this, false);
        this.tabOpen = this.prefs.getBoolPref("tabOpen");
        this.firstRun = this.prefs.getBoolPref('firstRun');

        /* move button to addon bar*/
        if(this.firstRun){
            this.prefs.setBoolPref('firstRun', false);
            this.installButton('addon-bar', 'searchSwitcher');
        }else{
            this.prefs.setBoolPref('firstRun', true);
        }

        /* add a event, so find search keywords on page load */
        var appcontent = document.getElementById("appcontent");
        appcontent.addEventListener("DOMContentLoaded", this.onPageLoad, true);

        var container = gBrowser.tabContainer;
        container.addEventListener("TabSelect", this.onTabSelect, false);

        var browserSearchService = Components.classes["@mozilla.org/browser/search-service;1"]
    	    .getService(Components.interfaces.nsIBrowserSearchService);
        var engineList = browserSearchService.getVisibleEngines([]);

        this.converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
    		.createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
        this.ioService = Components.classes["@mozilla.org/network/io-service;1"]  
            .getService(Components.interfaces.nsIIOService); 

    
        if(engineList.length > 0){
            var searchSwitcherPop = document.getElementById("mainPopupSet");
            this.addonSES = document.getElementById("searchSwitcher");
            var d = document.createElement("menupopup");
            d.setAttribute("id", "searchSwitcherPop");
            d.setAttribute("position", "after_start");
    		
    	    /* save stringsBundle */
    	    this.stringsBundle = document.getElementById("searchSwitcher-strings");

            var testRegexp = /(?:\?|&)(\w+)=xxxxxxxx(?:$|&)/;
            for(var i=0,j=0; i<engineList.length;i++){

                /* try to find the query param for this engine*/
                var searchURI =  engineList[i].getSubmission("xxxxxxxx", null);
                var searchURL =  searchURI.uri.prePath +  searchURI.uri.path;
                if(testRegexp.test(searchURL)){
                    /* save engine list*/
                    this.engineList[j] = {};
                    this.engineList[j].qParam = RegExp.$1;
                    this.engineList[j].host = searchURI.uri.host;
                    this.engineList[j].engine = engineList[i];
                    
                    /* append engine to pupup menu*/
                    var item = document.createElement('menuitem');
                    item.setAttribute("label", engineList[i].name);
                    item.setAttribute("oncommand", "searchSwitcher.search("+j+")");
                    d.appendChild(item);
    
                    j++;
                }else{
                    /* if can not find the query param, this engine is skipped*/
                    continue;
                }
            }
    		/* append popup */
            searchSwitcherPop.appendChild(d);
        }
    },

    /* preference change observer */
    observe: function(subject, topic, data){
        if(topic != "nsPref:changed"){
            return;
        }
        switch(data){
            case "tabOpen":
                this.tabOpen = this.prefs.getBoolPref("tabOpen");
                break;
        }
    },

    shutdown: function(){
        this.prefs.removeObserver("", this);
    },

    search: function(i){
        var keywords  =  this.keywords;
        //alert(keywords);
        var searchUri =  this.engineList[i].engine.getSubmission(keywords, null);
        var searchUrl =  searchUri.uri.prePath +  searchUri.uri.path;
        //alert("searchUri generated is: " + searchUri.uri.spec);
        openUILinkIn(searchUrl, this.tabOpen ? "tab" : "current");
    },
    
    getKeywords: function(){
        var keywords = null;
        this.keywords = null;
    
        var pageURL = window.content.location.href;
        
        var uri = this.ioService.newURI(pageURL, null, null);
        /* wikipedia is different */
    	if(this.hasWiki){
    		if(/^https?:\/\/\w+\.wikipedia\.org\/w\w+?\/([^\?]+)$/.test(pageURL) || 
    		   /^https?:\/\/\w+\.wikipedia\.org\/w\w+?\/Special:Search\?.*search=(.+?)(?:$|&)/.test(pageURL) 
    		   ){
    		    this.keywords = keywords = decodeURI(RegExp.$1);
		    this.isEngine = true;
    		    return keywords;
		}
    	}
    
        for(var i=0; i < this.engineList.length; i++){
            if(this.engineList[i].host == uri.host){
                this.isEngine = true;
                var regString   = '(?:\\?|&)' + this.engineList[i].qParam +'=(.+?)(?:$|&)';
                var paramRegexp = new RegExp(regString);
                if(paramRegexp.test(pageURL)){
                    keywords = RegExp.$1.split('+').join(" ");
                    //alert("raw: " + keywords);
                    try {
                        keywords = decodeURI(keywords);
                    }catch(e){
                        this.converter.charset = window.content.document.characterSet;
                        keywords = this.converter.ConvertToUnicode(unescape(keywords));
                    }
                }
                break;
            }
        }
        this.keywords = keywords;
        return keywords;
    },
    
    onPageLoad: function(){
        searchSwitcher.updateBar();
    },
    
    onTabSelect: function(event){

        var pageURL = window.content.location.href;
        if(/^https?:/.test(pageURL)){
            searchSwitcher.updateBar();
        }else{
            this.addonSES.setAttribute("contextmenu", "searchSwitcherPopPoPElse");
            var tip = this.stringsBundle.getString('notEngine');
            this.addonSES.setAttribute("tooltiptext", tip);
        }
    },

    /* on page load, disable popup when no keywords found */
    updateBar: function(){
        this.isEngine = false;
    	var keywords = this.getKeywords();
        if(this.isEngine == true){
            if(typeof(keywords) == 'string' && keywords.length > 0){
                this.addonSES.setAttribute("contextmenu", "searchSwitcherPop");
                var tip = this.stringsBundle.getString('hasKeywordsTip').replace(/KEYWORDS/, keywords);
                this.addonSES.setAttribute("tooltiptext", tip);
            }else{
                this.addonSES.setAttribute("contextmenu", "searchSwitcherPopPoPElse");
                var tip = this.stringsBundle.getString('noKeywordsTip');
                this.addonSES.setAttribute("tooltiptext", tip);
            }
        }else{
            this.addonSES.setAttribute("contextmenu", "searchSwitcherPopPoPElse");
            var tip = this.stringsBundle.getString('notEngine');
            this.addonSES.setAttribute("tooltiptext", tip);
        }
    },
    
    /* Search sites have different ULR forms
    createURLPattern: function (URL){
        if(URL.indexOf('https?://www.google.com') == 0){
            return /^https?:\/\/www\.google\.com/;
        }
        if(URL.indexOf('https?://union.dangdang.com') == 0){
            return /^http:\/\/search\.dangdang\.com/;
        }
        if(URL.indexOf('https?://search8.taobao.com') == 0){
            return /^https?:\/\/s.*\.taobao\.com/;
        }
    	if(/^https?:\/\/\w+.bing.com/.test(URL)){
    		return /^https?:\/\/\w+\.bing\.com/;
    	}
    
    	if(/^https?:\/\/\w+.wikipedia.org/.test(URL)){
    		this.hasWiki = true;
    	}
        return new RegExp("^" + URL);
    },
    */
};


/* add addons load function */
window.addEventListener("load", function(e){ searchSwitcher.onLoad(); }, false);
window.addEventListener("unload", function(e){ searchSwitcher.shutdown(); }, false);
