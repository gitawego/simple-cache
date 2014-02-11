simple-cache
============

a simple cache system for nodejs

Usage
=============
```js
var SimpleCache = require('simple-cache');
var cache = new Cache({
    namespace:'mynamespace',
    cacheFolder:'../cache/'
});
var myfilename = 'minify.js';
cache.expiration(myfilename,function(res){
    if(!res.expired){
        cache.get(res.record,function(err,data){
           if(err){throw new Error(err);}
           //do sth with data

        },{encoding:'utf8'});
        return;
    }
    //get data to cache .....
    cache.cache(res.record,dataToBeCached,{
        filename:myfilename,
        expiration:"30D"
    },function(err){
       if(err){throw new Error(err);}
    });

});

```

###filename format

cached filename format is [[createdTime]][[timezone]]_[[expiration]].[[myFilename]],

such as ``1392127591530+1_7D.minify.js``

###expiration format

expiration could be D (day), M (month) or Y (year)
