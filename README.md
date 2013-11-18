deep-elastic
============

elasticsearch client (store) for deepjs


## example

```javascript
require("deep-elastic");

deep.store.Elastic.create("search-fiche", {
	host:"10.211.55.10",  // optional : default = 'localhost'
	port:9200, // optional : default = 9200
	path:'smartrep-fiches/_search',
	fields:["content.{ language }.title","content.{ language }.description"],  
	filter:{ "status":"published" }, // optional : default = {}
	fuzzy:0.99	// optional : default = 0.99,
	defaultOptions:{ language:"fr" }
});

deep.store("search-fiche").get("github").log();
```



