if(typeof define !== 'function')
	var define = require('amdefine')(module);

define(["require", "deepjs"],function (require, deep)
{
	var http = require('http');
	/**
	* @param options see http://nodejs.org/api/http.html#http_http_request_options_callback
	* @param datas optional body to send with request
	*/
	var request = function(options, datas){

		var def = deep.Deferred();

		var response = {
			status:null,
			body:null,
			headers:null
		};
		//console.log("elastic : ", options, JSON.stringify(datas));
		try{
		var req = http.request(options, function(res) {
			//console.log("http req : response : ", res);
			response.status = res.statusCode;
			response.headers = res.headers;
			response.body = '';
			res.setEncoding('utf8');
			var er = false;
			res.on('data', function (chunk)
			{
				response.body += chunk.toString();
			});
			res.on("end", function ()
			{
				if(er)
					return;
				response.body = deep.utils.parseBody(response.body, response.headers);
				//console.log("elastic repsonse : ", response.body);
				if(response.body.error)
					return def.reject(response.body.error);
					var tempArray = [];
				if(response.body.hits)
				{
					response.body.totalCount = response.body.hits.total;
					for (var i = 0; i < response.body.hits.hits.length; i++)
						tempArray.push(response.body.hits.hits[i]._source);
				}
				var output = deep.utils.createRangeObject(datas.from, datas.from+datas.size, response.body.totalCount, tempArray.length, tempArray);
				def.resolve(output);
			});
			res.on('error', function(e)
			{
				er = e;
				console.log("deep-elastic : error : ", e);
				if(!def.rejected)
					def.reject(e);
			});
		});

		req.on('error', function(e) {
			if(!def.rejected)
				def.reject(e);
		});

		if(datas)
			req.write(JSON.stringify(datas));
		req.end();

		}
		catch(e){
			console.log("catched error in deep-elastic : ", e);
			if(!def.rejected)
				def.reject(e);
		}
		return def.promise();
	};


	deep.store.Elastic = deep.compose.Classes(deep.Store, function(protocole, options){
		if(arguments.length == 1)
			options = protocole;
		if(options)
			deep.utils.up(options, this);
	},
	{
		/**
		 * get a query 
		 * @param  {[type]} id      [description]
		 * @param  {[type]} options [description]
		 * @return {[type]}         [description]
		 */
		get:function(id, options){
			//console.log("elastic.get : ", id);
			if(id == "?" || !id)
				return deep.when(deep.utils.createRangeObject(0, 0, 0, 0, []));
			options = options || this.defaultOptions || {};
			if((!options.path && !this.path) || !(options.fields || this.fields))
				return deep.when(deep.errors.Internal("store hasn't been configured yet. aborting."));
			var searchParam = { query: null };
			options.range = options.range || {};
			var self = this;
			deep(options.fields || this.fields).query("./*?_schema.type=string").interpret(options);
			if(options.filter || this.filter)
			{
				searchParam.query = {
					"filtered" : {
                        "query":{
                            "fuzzy_like_this":{
                                "fields":options.fields || this.fields,
                                "like_text": encodeURIComponent(id),
                                "max_query_terms":12,
                                "min_similarity":options.fuzzy || self.fuzzy || 0.6
                            }
                        },
                        "filter" : {
                            "term" : options.filter || this.filter
                        }
                    }
				};
			}
			else
				searchParam.query = {
                    "fuzzy_like_this":{
                        "fields": options.fields || this.fields || [],
                        "like_text": encodeURIComponent(id),
                        "max_query_terms":12,
                        "min_similarity":options.fuzzy || self.fuzzy || 0.6
                    }
                };

			if(options.range)
			{
				searchParam.from =  (options.range.start || 0);
				searchParam.size = ((options.range.end || 9) - (options.range.start || 0))+1;
			}

			var opt = {
				host: options.host || this.host || 'localhost',
				port: options.port || this.port || 9200,
				path: options.path || this.path,
				method:"POST"
			};
			opt.headers = {
				"Accept" : "application/json; charset=utf-8"
			};
			return deep.when(request(opt, searchParam));
		}
	});

	deep.store.Elastic.create = function(protocole, options){
		return new deep.store.Elastic(protocole, options);
	};

	/**
	 * @example
	 * 
	 * deep.store.Elastic.create("search-fiche", {
	 *		host:"10.211.55.10",  // optional : default = 'localhost'
	 *		port:9200, // optional : default = 9200
	 *		path:'smartrep-fiches/_search',
	 *		fields:["content.{ language }.title","content.{ language }.description"],  
	 *		filter:{ "status":"published" }, // optional : default = {}
	 *		fuzzy:0.99	// optional : default = 0.99,
	 *		defaultOptions:{ language:"fr" }
	 * });
	 *
	 *
	 * deep.store("search-fiche").get("github").log();
	 * 
	 */


	return deep.store.Elastic;
});
