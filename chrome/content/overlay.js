var searchSwitcher = {
    engineList: new Array(),

    onLoad: function() {
        this.initialized = true;
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

            var testRegexp = /(?:\?|&)(\w+)=xxxxxxxx(?:$|&)/;
            for(var i=0,j=0; i<engineList.length;i++){

                    /* try to find the query param for this engine*/
                    var searchURI =  engineList[i].getSubmission("xxxxxxxx", null);
                    var searchURL =  searchURI.uri.prePath +  searchURI.uri.path;
                    if(testRegexp.test(searchURL)){
                        /* save engine list*/
                        this.engineList[j] = {};
                        this.engineList[j].qParam = RegExp.$1;
                        this.engineList[j].URL = this.uniformEngineURL(searchURI.uri.prePath);
                        this.engineList[j].engine = engineList[i];
                        
                        /* append to pupup menu*/
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
        
        for(var i=0; i < this.engineList.length; i++){
            //alert(this.engineList[i].URL);
            if(pageURL.indexOf(this.engineList[i].URL) == 0){
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
        if(typeof(searchSwitcher.getKeywords()) != 'string'){
            searchSwitcher.statusBar.setAttribute("context", "searchSwitcherPoPElse");
        }else{
            searchSwitcher.statusBar.setAttribute("context", "searchSwitcherPop");
        }
    },

    uniformEngineURL: function (URL){
        if(URL.indexOf('http://www.google.com') == 0){
            return 'http://www.google.com';
        }
        if(URL.indexOf('http://union.dangdang.com') == 0){
            return "http://search.dangdang.com";
        }
        if(URL.indexOf('http://search8.taobao.com') == 0){
            return "http://s8.taobao.com"
        }
        return URL;
    },
};


window.addEventListener("load", function () { searchSwitcher.onLoad(); }, false);
