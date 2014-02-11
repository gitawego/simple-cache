simple-cache
============

a simple cache system for nodejs

Usage
=============
```
var SimpleCache = require('simple-cache');
var cache = new Cache({
    namespace:'mynamespace',
    cacheFolder:'../cache/'
});
var myfilename = 'minify.js';
cache.expiration(myfilename,function(res){
    if(!res.expired){
        cache.get(res.record,function(err,data){
           if(err){throw new Error('can find');}
           //do sth with data

        },{encoding:'utf8'});
        return
    }
    //get data to cache .....
    cache.cache(res.record,dataToBeCached,{
        filename:myfilename,
        expiration:"30D"
    },function(err){
       //do
    });

});

```
