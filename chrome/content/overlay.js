var searchSwitcher = {
    engineList: new Array(),
	stringsBundle: null,

	/* wikipedia */
	hasWiki: false,

    onLoad: function() {

        /* find search keywords on page load */
        var appcontent = document.getElementById("appcontent");
        appcontent.addEventListener("DOMContentLoaded", this.onPageLoad, true);

        var browserSearchService = Components.classes["@mozilla.org/browser/search-service;1"].getService(Components.interfaces.nsIBrowserSearchService);
        var engineList = browserSearchService.getVisibleEngines([]);

        this.converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
            

        if(engineList.length > 0){
            var searchSwitcherPop = document.getElementById("searchSwitcherPopSet");
            this.statusBar = document.getElementById("searchSwitcher");
            var d = document.createElement("popup");
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
                        this.engineList[j].URLReg = this.createURLPattern(searchURI.uri.prePath);
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

    search: function(i){
        var keywords  =  this.keywords;
        //alert(keywords);
        var searchuri =  this.engineList[i].engine.getSubmission(keywords, null);
        var searchurl =  searchuri.uri.prePath +  searchuri.uri.path;
        //alert("searchuri generated is: " + searchuri.uri.spec);
        openUILinkIn(searchurl, "current");
    },

    getKeywords: function(){
        var keywords = null;

        var pageURL = window.content.location.href;
        
        /* wikipedia is different */
		if(this.hasWiki){
			if(/^http:\/\/\w+\.wikipedia\.org\/w\w+?\/([^\?]+)$/.test(pageURL) || 
			   /^http:\/\/\w+\.wikipedia\.org\/w\w+?\/Special:Search\?.*search=(.+?)(?:$|&)/.test(pageURL) 
			   ){
				this.keywords = keywords = decodeURI(RegExp.$1);
				return keywords;
			}
		}

        for(var i=0; i < this.engineList.length; i++){
            //alert(this.engineList[i].URLReg);
            if(this.engineList[i].URLReg.test(pageURL)){
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
                    break;
                }
            }
        }
        this.keywords = keywords;
        return keywords;
    },
    
    onPageLoad: function(){
        searchSwitcher.updateBar();
    },

    /* on page load, disable popup when no keywords found */
    updateBar: function(){
		var keywords = this.getKeywords();
        if(typeof(keywords) == 'string' && keywords.length > 0){
            this.statusBar.setAttribute("context", "searchSwitcherPop");
			var tip = this.stringsBundle.getString('hasKeywordsTip').replace(/KEYWORDS/, keywords);
            this.statusBar.setAttribute("tooltiptext", tip);
        }else{
            this.statusBar.setAttribute("context", "searchSwitcherPopPoPElse");
            var tip = this.stringsBundle.getString('noKeywordsTip');
            this.statusBar.setAttribute("tooltiptext", tip);
        }
    },

    /* Search sites have different ULR forms */
    createURLPattern: function (URL){
        if(URL.indexOf('http://www.google.com') == 0){
            return /^http:\/\/www\.google\.com/;
        }
        if(URL.indexOf('http://union.dangdang.com') == 0){
            return /^http:\/\/search\.dangdang\.com/;
        }
        if(URL.indexOf('http://search8.taobao.com') == 0){
            return /^http:\/\/s.*\.taobao\.com/;
        }
		if(/^http:\/\/\w+.bing.com/.test(URL)){
			return /^http:\/\/\w+\.bing\.com/;
		}

		if(/^http:\/\/\w+.wikipedia.org/.test(URL)){
			this.hasWiki = true;
		}
        return new RegExp("^" + URL);
    },
};


window.addEventListener("load", function(){ searchSwitcher.onLoad(); }, false);
