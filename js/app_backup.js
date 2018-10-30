$(document).ready (function () {

/*
	get
	Load data from the server using a HTTP GET request.

	getJSON
	Load JSON-encoded data from the server using a GET HTTP request.

	getScript
	Load a JavaScript file from the server using a GET HTTP request, then execute it.

	post
	Load data from the server using a HTTP POST request.

	load
	Load data from the server and place the returned HTML into the matched element.
*/
window.dynamuno = {
	view: (function (self)
	{
		Backbone.View = (function (View)
		{
			return View.extend (
			{
				constructor: function ()
				{
					console.log (Array.prototype.slice.call (arguments));

					if (typeof t === "string")
						console.log (t);
					else
						View.apply (this, Array.prototype.slice.call (arguments));
				}
			});
		})
		(self);
	}), // (Backbone.View),
	commitments: {},
	commit: function (i, l)
	{
		try
		{
			// Declarations
			var self = this,
				recursively = arguments.callee;

			// Cursor
			if (i === undefined) i = 0;

			// Element
			if (l === undefined) l = this.__scripts[this.cid] || [];

			if (_.has (self.commitments, self.cid) === false)
				self.commitments[self.cid] = $.Deferred ();

			// Ordering
			if (l.length > 0) {
				// commitment = this.commitments.length;
				// commitment = 0;
				// self.smartCommitments[self.cid] = $.Deferred ();

			} else if (l.length === 0) {
				// commitment = 0;
				// self.smartCommitments[self.cid] = $.Deferred ();
				throw new Error ('Nothing to do.');

			} else {

			}

			// Loop
			this.__getScript (l[i]).then (function () {
				if (i + 1 < l.length) {
					// Recursively
					recursively.call (self, i + 1, l);

				} else {
					// Callback
					self.__scripts[self.cid].splice (0, self.__scripts[self.cid].length);
					// Return
					self.commitments[self.cid].resolve ();

				}
			});
		}
		catch (thrown)
		{
			if (thrown.name === 'Error')
				// Emptiness
				self.commitments[self.cid].resolve ();
			else
				// Unpreviously error
				self.commitments[self.cid].reject ();
		}
		finally
		{
			// Promise Object
			return self.commitments[self.cid].promise ();
		}
	},
	__scripts: {},
	getScript: function (filename, filetype, name)
	{
		/* /\.[a-z]+$/i */
		if (typeof filename === "string")
		{
			if (this.__scripts[this.cid] === undefined)
				this.__scripts[this.cid] = [];

			if (name === undefined)
				name = "";

			this.__scripts[this.cid].push ([filename, filetype, name]);
		}

		return this;
	},
	__getScript: function (parameters)
	{
		try
		{
			var filename = parameters[0],
				filetype = parameters[1],
				name = parameters[2];

			var deferred = $.Deferred (),
				attribute = filetype === "js" ? "src" : "href";

			// this.snakes.push (deferred.promise ());

			if (name === undefined)
				// Generate
				name = filename.replace (/[\W]/g, '');
			else if (typeof name === "string" && name.length === 0)
				name = filename.replace (/[\W]/g, '');
			else
				// Sanitize
				name = name.toString ().replace (/[\W]/g, '');

			if (document.getElementById (name) === null)
				// Insertion
				delete parameters;
			else if (document.getElementById (name).getAttribute (attribute) !== filename)
				// Replacement
				console.log ('Replacement of', name);
			else
				// Try
				throw new Error ('Found.');

			if (filetype === "js")
			{
				var fileref = document.createElement ('script');
					fileref.setAttribute ("type", "text/javascript");
					fileref.setAttribute ("src", filename);
					fileref.setAttribute ("id", name);
			}
			else if (filetype === "css")
			{
				var fileref = document.createElement ("link");
					fileref.setAttribute ("id", name);
					fileref.setAttribute ("rel", "stylesheet");
					fileref.setAttribute ("type", "text/css");
					fileref.setAttribute ("href", filename);
			}
			if (typeof fileref === 'object')
			{
				fileref.addEventListener ('load', deferred.resolve);
				fileref.addEventListener ('error', deferred.reject);

				if (document.getElementById (name) && document.getElementById (name).getAttribute (attribute) !== filename)
					document.getElementById (name).parentNode.replaceChild (fileref, document.getElementById (name));
				else
					Array.from (document.getElementsByTagName ("head")).shift ().appendChild (fileref);
			}
		}
		catch (thrown)
		{
			if (thrown.name === "Error")
				deferred.resolve ();
			else
				deferred.reject (thrown.message);
		}
		finally
		{
			return deferred.promise ();
		}
	},
	"getJSON": function (url, data, success)
	{
		try {
			var self = this,
				vars = {};

			if (_.isUndefined(success) && _.isFunction(data)) {
				success = data;
				data = "";

			} else if (_.isUndefined(data) && _.isUndefined(success)) {
				success = function success () {};
				data = "";

			} else {
				//
			}
			if (_.isString(url) === false) {
				throw "";

			}
			vars.variableFrom = url.replace(/[^a-z]/gi,"").substr(-32);
			vars.variableTemp = sessionStorage.getItem(vars.variableFrom);
			vars.variableName = url.split("/").pop();
			vars.variableType = function detection (entry) {
				var detected;

				if (_.isArray(entry)) {
					detected = "Col";

				} else if (_.isObject(entry)) {
					var values = _.values(entry);

					if (_.isArray(_.first(values))) {
						detected = "MOC";

					} else {
						detected = "MOD";

					}
				} else {
					detected = "NUL";

				}
				return detected;
			};

			if ("sessionStorage" in window && vars.variableTemp) {
				_(JSON.parse (vars.variableTemp)).each (function (value, key) {
					if (_.isArray (value)) {
						this.model.set (key, (new Backbone.Collection(value)));

					} else if (_.isObject (value)) {
						this.model.set (key, value);

					} else {
						//
					}
					
				}, this);
				throw "Cached";
			}

			vars.request = $.ajax({"dataType": "json", "url": url, "data": data}).
			done(success).
			then(function(data, textStatus, jqXHR) {
				if (_.isObject(data.model) === true && _.isEmpty(data.model) === false) {
					self.model.set(data.model);

				}
				if (_.isObject(data.collection) === true && _.isEmpty(data.collection) === false) {
					var type = vars.variableType(data.collection),
						name = [vars.variableName, type].join('');

					if (type === "Col") {
						if (self.model.has(name)) {
							self.model[name].reset(data.collection);

						} else {
							var collection = new Backbone.Collection(data.collection);
							self.model.set (name, collection);
						}

					} else if (type === "MOD") {
						self.model.set(data.collection);

					} else {
						//
					}
				}
				sessionStorage.setItem(vars.variableFrom, JSON.stringify(self.model.changedAttributes()));
			});

			if (self.loadings[self.cid] === undefined) {
				self.loadings[self.cid] = [];
			}

			self.loadings[self.cid].push(vars.request);

		} catch (caughtException) {
			console.error(caughtException);

		} finally {
			return this;

		}
	},
	summon: function ()
	{
		try
		{
			var self = this,
				locals = [],
				loadings = this.loadings[this.cid] || [];
				locals.debug = false;

			if (self.model.has ("asynchronous") === false)
				self.model.set ("asynchronous", $.Deferred ());

			if (loadings.length === 0)
			{
				if (self.id === undefined)
				{
					if (locals.debug === true)
						console.log ((self.id || self.className), 'seems to be a subview');
				}
				else if (self.$("#" + self.id).length > 0)
				{
					//
				}
				else if ($("#" + self.id).length > 0)
				{
					if (locals.debug === true)
						console.log ((self.id || self.className), 'seems to be a parent view');

					self.setElement ($("#" + self.id)).render ();
				}
				else
				{
					if (locals.debug === true)
						console.log ((self.id || self.className), 'seems to be unexpected');
				}
				self.model.get ("asynchronous").resolve ();
			}
			else
			{
				$.when.apply (self, loadings).then (function ()
				{
					var views = Array.prototype.slice.call (arguments);

					_.each (views, function (view)
					{
						if (_.isUndefined(view)) {
							//

						} else if (_.isObject(view.$el) && view.$el.find ("#" + self.id).length > 0) {
							self.setElement (view.$el.find ("#" + self.id)).render ();

						} else if (_.isObject(view.$el) && self.$el.find ("#" + view.id).length > 0) {
							view.setElement (self.$el.find ("#" + view.id));

						} else {
							if (locals.debug === true) {
								console.log ((self.id || self.className), 'just in memory');
							}

						}
					},
					self);

					self.loadings[self.cid].splice (0, self.loadings[self.cid].length);
					self.model.get ("asynchronous").done (function (){ $(document).trigger ("load"); });
					self.model.get ("asynchronous").resolve ();
				});
			}
		}
		catch (error)
		{
			console.error (error);
			self.model.get ("asynchronous").reject ();
		}
		finally
		{
			return self.model.get ("asynchronous").promise ();
		}
	},
	viewAttributes: function (view, data)
	{
		var local = {};
			local.isModel = data.hasOwnProperty ('version') ? parseInt (data.version) : 0;
			local.getResponse = {error: false, errors: []};

		data.model = data.model && data.model.cid ? data.model : new Backbone.Model (data.model);

		if (local.isModel > 0 && local.isModel < 3)
		{
			if (_.isArray (data.collection))
			{
				data.collection = new Backbone.Collection (data.collection);
			}
			else if (_.isObject (data.collection))
			{
				_.each (data.collection, function (value, key)
				{
					data.collection[key] = $.isArray (value) ? new Backbone.Collection (value) : value;
				});
			}
			else
			{
				data.collection = [];
			}
		}
		if (local.isModel === 3)
		{
			if (_.isArray (data.collection))
			{
				data.collection = new Backbone.Collection (data.collection);
				data.collection.url = data.path;
				data.collection.parse = function (response)
				{
					return response.collection;
				};
			}
			else if (_.isObject (data.collection))
			{
				_.each (data.collection, function (value, key)
				{
					data.collection[key] = $.isArray (value) ? new Backbone.Collection (value) : value;
					data.collection[key].url = data.path;
					data.collection[key].parse = function (response)
					{
						return response.collection[key];
					};
				});
			}
			else
			{
				data.collection = [];
			}
		}
		return data;
	},
	slugify: function slugify (text)
	{
		return (
			text.
			toString ().
			toLowerCase ().
			replace (/\s+/g, '-').
			replace (/[^\u0100-\uFFFF\w\-]/g, '-').
			replace (/\-\-+/g, '-').
			replace (/^-+/, '').
			replace (/-+$/, '')
		);
	},
	jsonify: (function (div)
	{
		return function (json)
		{
			div.setAttribute ('onclick', 'this.__json__=' + json);
			div.click ();
			return div.__json__;
		}
	})(document.createElement ('div')),
	_tuning: function (viewName, viewContent)
	{
		try
		{
			var locals = {};

			if (typeof viewName === "string" && viewName.length > 0) {
				locals.viewName = viewName;
			} else {
				locals.viewName = '';
			}

			if (typeof viewContent === "undefined") {
				throw new Error ('Undefined');
			}

			if (typeof viewContent === "string" &&
				viewContent.charAt (0) !== '{' &&
				viewContent.charAt (0) !== '[')
				throw new Error ('Incorrect');

			locals.viewContent = this.jsonify (viewContent);
			locals.plus = _.clone (dynamuno);

			if (_.isArray (locals.viewContent)) {
				Application.Model.Template.View[viewName] = Backbone.View.extend (locals.plus).extend (locals.viewContent[0]);

			} else if (_.isObject (locals.viewContent)) {
// sessionStorage.setItem (viewName, viewContent);
// locals.caching = this.jsonify (sessionStorage.getItem (viewName));
Application.Model.Template.View[viewName] = Backbone.View.extend (locals.plus).extend (locals.viewContent);

			} else {
				//
			}

		} catch (thrown) {
			try {
				console.error (thrown);
				// if (_.isEmpty (viewContent) === false)
				// JS
				eval (viewContent);

			} catch (rethrown) {
				console.error (rethrown);

			}
		}
	},
	__load: function (view, data)
	{
		try
		{
			var _this = this,
				vars = {},
				globals = window;

			data = this.viewAttributes (view, data);
			vars.deferred = $.Deferred ();

			if (_.has (Application.Model.Template.cachedView, view)) {
				Application.Model.Template.cachedView[view].model.set (data.model.attributes);
				Application.Model.Template.cachedView[view].collection = data.collection;
				Application.Model.Template.cachedView[view].initialize ();
				vars.deferred.resolve (Application.Model.Template.cachedView[view]);

			} else if (sessionStorage.getItem(view) !== null) {
				data.model.set ("asynchronous", $.Deferred ());
				Application.Model.Template.View[view] = Backbone.View.extend (_.clone (dynamuno)).extend (this.jsonify (sessionStorage.getItem(view)));
				Application.Model.Template.cachedView[view] = new Application.Model.Template.View[view]({ model: data.model, collection: data.collection });

				if (Application.Model.Template.cachedView[view].model.has ("asynchronous")) {
					Application.Model.Template.cachedView[view].model.get ("asynchronous").done (function () {
						vars.deferred.resolve (Application.Model.Template.cachedView[view]);
					});

				} else if (Application.Model.Template.cachedView[view].deferred === undefined) {
					vars.deferred.resolve (Application.Model.Template.cachedView[view]);

				} else {
					Application.Model.Template.cachedView[view].deferred.done (function ()
					{
						vars.deferred.resolve (Application.Model.Template.cachedView[view]);
					});

				}
				console.log (escape(encodeURIComponent(JSON.stringify(sessionStorage))).length);

			} else {
				$.ajax ({
					url: '//' + window.location.hostname + (window.location.port ? (':' + window.location.port) : '') + ['/js/views/', view, '.js'].join (''),
					method: 'get',
					dataType: 'text',
					cache: false,
					context: this
				}).then (function (response)
				{
					this._tuning (view, response);
					data.model.set ("asynchronous", $.Deferred ());
					Application.Model.Template.cachedView[view] = new Application.Model.Template.View[view]({ model: data.model, collection: data.collection });

					if (Application.Model.Template.cachedView[view].model.has ("asynchronous")) {
						Application.Model.Template.cachedView[view].model.get ("asynchronous").done (function () {
							vars.deferred.resolve (Application.Model.Template.cachedView[view]);
						});

					} else if (Application.Model.Template.cachedView[view].deferred === undefined) {
						vars.deferred.resolve (Application.Model.Template.cachedView[view]);

					} else {
						Application.Model.Template.cachedView[view].deferred.done (function () {
							vars.deferred.resolve (Application.Model.Template.cachedView[view]);
						});

					}
				});
			}

		} catch (error) {
			console.error (error);
			vars.deferred.reject (error);

		} finally {
			return vars.deferred.promise ();

		}
	},
	loadings: {},
	load: function (view, data)
	{
		if (data === undefined)
			data = {};

		if (typeof view === "string")
		{
			if (this.loadings[this.cid] === undefined)
				this.loadings[this.cid] = [];

			this.loadings[this.cid].push (this.__load (view, data));
		}

		return this;
	},
	release: function ()
	{
		this.commit ().then (function ()
		{
			this.summon ();
		}.bind (this));
	}
}

window.debug = false;

window.Application = {
	Root: '/',
	Model: {
		Template: {
			Engine: null,
			Default: Backbone.Model.extend ({
				urlRoot: window.location.pathname,
				defaults: {
					// parent: '',
					// reload: false,
					view: '',
					// collection: '',
					// model: '',
					id: '',
					uri: ''}
			}),
			View: [],
			cachedView: [],
			Render: function (request)
			{
				try
				{
					var self = this;

					self.Engine.set ({
						"view": request.view,
						"done": false
					});

					dynamuno.
					__load (request.view, request).
					always (function ()
					{
						self.Engine.set ("done", true);
						$(".adagio-loading").hide ();
					});
				}
				catch (error)
				{
					console.error (error);
				}
				finally
				{
					return this;
				}
			},
		}
	},
	Collection: {},
	View: {},
	Controller: {},
	Router: {
		Demeter: null,
		Custom: {}
	},
};

Application.Model.Template.Engine = new Application.Model.Template.Default ();

Application.Model.Template.Engine.on ("change:uri", function (model, uri) { try {

	var globals = window;
	
	this.token = function ()
	{
		this.status = $.Deferred ();
		this.target = $('meta[name="csrf-token"]'); 
		this.sync = function ()
		{
			$.ajax ({
				url: '/interfaces/token',
				method: 'get',
				dataType: 'text',
				cache: false,
				context: this,
				beforeSend: function () {
					console.log ('Establishing the session...');
				}
			}).
			done (function (response)
			{
				this.target.attr ('content', response.toString ());
				this.status.resolve (response);
				console.log ('The token is fetched.');
			}).
			fail (this.status.reject);
			return this.status.promise ();
		}
		this.release = function ()
		{
			if (this.target.length > 0 &&
				this.target.attr ('content').length > 0)
				return this.status.resolve (this.target.attr ('content'));
			else
				return this.sync ();
		}
		return this;
	};
	
	this.load = function ()
	{
		this.release = function (response)
		{
		response.path = "/interfaces" + uri.slice (1);
		response = dynamuno.viewAttributes(model.get ('view'), response);

		if (response && response.view === 'sessions')
		{
		globals.localStorage.removeItem ('subdistritos');
		globals.localStorage.removeItem ('ocorrencias');
		}
		if (model.previous ("id") !== model.get ("id"))
		{
			if (Application.Model.Template.cachedView[model.get ('view')])
				Application.Model.Template.cachedView[model.get ('view')].undelegateEvents ();

			Application.Model.Template.Render (response);
		}
		else
		{
			if (_.has (Application.Model.Template.cachedView, response.view) === false)
			{
				Application.Model.Template.Render (response);
			}
			else
			{
				Application.Model.Template.cachedView[response.view].collection = response.collection;
				Application.Model.Template.cachedView[response.view].model = response.model;
				Application.Model.Template.cachedView[response.view].initialize();
			}
		}
		}
		this.sync = $.ajax ({
			url: '//' + window.location.hostname + (window.location.port ? (':' + window.location.port) : '') + ("/") + "interfaces" + uri.slice (1),
			method: 'get',
			dataType: 'json',
			cache: false
		}).
		done (this.release);
		return this.sync;
	}

	if (model.previous ("id").length)
		console.log ("Changed URI from [" + model.previous ("id") + "] to [" + model.get ("id") + "].");
	else
		console.log ("Starting from the [" + model.get ("id") + "] page.");

	if (uri.search (/^\!/i) === 0)
		this.token ().release ().done (this.load);
	else
		this.token ().release ().done (function ()
		{
			Application.Model.Template.Render ({'view': model.get ("id"), 'model': []});
		});
}
catch (caughtException)
{
	console.error (caughtException);
}});

Application.Router.Demeter = Backbone.Router.extend ({
	routes:
	{
		'': function ()
		{
			this.navigate ('!/home', {trigger: true});
		},
		'error(/:path)': function (path)
		{
			alert ("errored");
		},
		'home': function ()
		{
			Application.Model.Template.Engine.set ({ 'id': '!/' + querystring, 'uri': location.hash.slice (1) });
		},
		'checklists': function ()
		{
			Application.Model.Template.Engine.set ({ 'id': 'checklists', 'uri': location.hash.slice (1) });
		},
		'!(/*querystring)': function (querystring)
		{
			try
			{
				var CustomError = function (number, message)
				{
					this.number = number;
					this.message = message;
				};

				if (querystring === null)
				{
					throw new CustomError (400, "No querystring found.");
				}

				Application.Model.Template.Engine.set ({ 'id': '!/' + querystring, 'uri': location.hash.slice (1) });
			}
			catch (error)
			{
				window.console.error (error.message);
			}
			finally
			{
				return this;
			}
		}
	}
});

window.routing = new Application.Router.Demeter ();

// Ajax request settings
$.ajaxPrefilter (function (options, originalOptions, jqXHR) {

	if (options.crossDomain === false)
	{
		var vars = {};
			vars.token = $('meta[name="csrf-token"]').attr ('content');

		if (vars.token !== null)
		return jqXHR.setRequestHeader ('X-CSRF-Token', vars.token);
	}

});

	window.handling = {
		"about": "Adagio",
		"response": function (one, two, three)
		{
			try
			{
				var _this = this,
					strict = {},
					globals = window;

				strict.catchup = function (element)
				{
					strict.data = element.responseJSON || {};
					return element;
				};

				strict.jqXHR = strict.catchup (one && one.statusText ? one : three);

				strict.jqXHR.then (function (done_data, done_textStatus, done_jqXHR)
				{
					if (_.isFunction (this.notification))
					{
						this.notification (strict.data, done_textStatus, done_jqXHR);
					}
				},
				function (fail_jqXHR, fail_textStatus, fail_errorThrown)
				{
					if (_.isFunction (this.notification))
					this.notification (strict.data, fail_textStatus, fail_jqXHR);
				});
			}
			catch (error)
			{
				globals.console.error (error);
			}
		},
		"notification": function (response, textStatus, jqXHR)
		{
			try
			{
				var _this = this,
					strict = {},
					globals = window;

strict.aviso = _.template ('<div class="<%= adagio.tipo %>" role="alert"><%= adagio.mensagem %></div>', {variable: 'adagio'});

				strict.tipo = textStatus === "nocontent" ?
					"alert alert-info" :
					(textStatus === "success" ? "alert alert-success" : "alert alert-warning");

				// decodeURIComponent (escape (jqXHR.getResponseHeader ("X-Adagio-Warning"))) :
				strict.mensagem = jqXHR.getResponseHeader ("X-Adagio-Warning") ?
					JSON.parse (jqXHR.getResponseHeader ("X-Adagio-Warning")) :
					"Desconhecido.";

				_this.$el.find (".adagio-notification").empty ();
				_this.$el.find (".has-error-help-block").remove ();

				if (_.isArray (strict.mensagem))
				{
					window.console.log ('arr');
					_.each (strict.mensagem, function (element)
					{
						var atual = strict;
							atual.mensagem = element;

						_this.$el.find (".adagio-notification").append (strict.aviso (atual));
					});
				}
				else if (_.isObject (strict.mensagem))
				{
					window.console.log ('obj');
					_.each (strict.mensagem, function (value, key)
					{
						var atual = strict;
							atual.mensagem = '<span class="help-block has-error-help-block">' + value + '</span>';

						_this.$el.find ("[name=" + key + "]").closest (".form-group").addClass ("has-error");
						_this.$el.find ("[name=" + key + "]").after (atual.mensagem);
					});
				}
				else
					_this.$el.find (".adagio-notification").html ("LOL");
			}
			catch (error)
			{
				globals.console.error (error);
			}
		}
	};

	$.ajaxSetup ({
		timeout: 20000,
		statusCode: {
			200: window.handling.response,
			// Created
			// HTTP/0.9 and later
			// The request has succeeded and a new resource has been created as a result of it. This is typically the response sent after a PUT request.
			201: window.handling.response,
			// No Content
			// HTTP/0.9 and later
			// There is no content to send for this request, but the headers may be useful. The user-agent may update its cached headers for this resource with the new ones.
			204: window.handling.response,
			// Moved Permanently
			// HTTP/0.9 and later
			// This response code means that URI of requested resource has been changed. Probably, new URI would be given in the response.
			301: function (jqXHR, textStatus)
			{
				var strict = {};
					strict.server = jqXHR.getResponseHeader ("Server");
					strict.moved = jqXHR.getResponseHeader ("Location");

				if (strict.server === "cloudflare-nginx" && strict.moved.search (window.location.protocol) === -1) {
					window.console.error (strict.server + "::" + strict.moved);
				}
			},
			// Bad Request
			// HTTP/0.9 and later
			// This response means that server could not understand the request due to invalid syntax.
			400: window.handling.response,
			// 401 Unauthorized
			// HTTP/0.9 and later
			// Authentication is needed to get requested response. This is similar to 403, but in this case, authentication is possible.
			401: function (jqXHR, textStatus)
			{
				if (Backbone.history.fragment.search (/^\!\/sessions/) !== 0) {
					window.routing.navigate ("\!\/sessions?intended=" + encodeURI (Backbone.history.fragment), {trigger: true});
				}
			},
			// Forbidden
			// HTTP/0.9 and later
			// The request was a valid request, but the server is refusing to respond to it. Unlike a 401 Unauthorized response, authenticating will make no difference.
			403: function (jqXHR, textStatus, errorThrown)
			{
				if ($("#adagio-layout").attr ("class") === undefined) {
					dynamuno.__load ("forbidden", {});

				} else {
					if (Application.Model.Template.Engine.previous ("id") !== Application.Model.Template.Engine.get ("id")) {
						window.history.back ();
					}

					var notification = new NotificationFx({
						"message": '<span class="icon pe-7s-door-lock"></span><p>Você não possui privilégio suficiente.</p>',
						"layout": 'bar',
						"effect": 'slidetop',
						"type": 'danger',
						"position": 'topright'
					});
					notification.show();

				}
			},
			// Not Found
			// HTTP/0.9 and later
			// The requested resource could not be found but may be available again in the future. Subsequent requests by the client are permissible.
			404: function (jqXHR, textStatus)
			{
				dynamuno.__load ("crash", {});
			},
			// Request Timeout
			// HTTP/1.1 only
			// The server timed out waiting for the request.
			408: window.handling.response,
			// Internal Server Error
			// HTTP/0.9 and later
			// The server has encountered a situation it doesn't know how to handle.
			500: function (jqXHR, textStatus)
			{
				dynamuno.__load ("crash", {});
			},
			// Service Unavailable
			// HTTP/0.9 and later
			// The server is currently unavailable (because it is overloaded or down for maintenance). Generally, this is a temporary state.
			503: window.handling.response,
		}
	});

	if (window.sessionStorage === undefined) {
		console.error ("An error occurred at sessionStorage");

	} else if (window.localStorage === undefined) {
		console.error ("An error occurred at localStorage");

	} else if (window.Backbone === undefined) {
		console.error ("An error occurred at Backbone");

	} else {
		window.objectCache = function (instance, uri, data, onlySession)
		{
			var strict = {}, _this = this, globals = window;
			//
			strict.deferred = $.Deferred ();
			//
			strict.arguments = Array.prototype.slice.call (arguments);
			if (strict.arguments.length === 0)
			{
				globals.console.error ('No arguments supplied for.');
				return false;
			}
			//
			_this.isArray = ('isArray' in Array) ? Array.isArray : function (value)
			{
				return globals.Object.prototype.toString.call (value) === '[object Array]';
			};
			_this.attributes = {};
			_this.objects = {};
			_this.instance = instance || 'unknown';
			_this.uri = uri || '/interfaces/autocategorias';
			_this.static = onlySession && onlySession === true ? globals.sessionStorage : globals.localStorage;
			_this.fetch = function (options)
			{
				if (_this.uri && typeof _this.uri === "object")
				{
					try
					{
						_this.attributes = _this.uri;
						_this.static.setItem (_this.instance, globals.JSON.stringify (_this.attributes));
					}
					catch (error)
					{
						globals.console.error (error);
					}
					finally
					{
						return strict.deferred.resolve (_this);
					}
				}
				else if (_this.uri && typeof _this.uri === "string")
				{
					$.ajax ({
						url: _this.uri,
						dataType: 'json',
						data: options || {},
					}).then (function (response)
					{
						try
						{
							_this.attributes = response;
							_this.static.setItem (_this.instance, globals.JSON.stringify (_this.attributes));
						}
						catch (error)
						{
							globals.console.error (error);
						}
						finally
						{
							return strict.deferred.resolve (_this);
						}
					});
				}
				else return false;
			};
			_this.get = function (type)
			{
				try
				{
					/*
					// Input
					*/
					type = type ? type.split ('.') : undefined;
					/*
					// Getter
					*/
					if (type.length === 1 && _this.attributes.hasOwnProperty (type[0]))
					{
						/*
						// It is collection array, unless it is model object
						*/
						if (typeof _this.attributes[type[0]] === "object" && _this.isArray (_this.attributes[type[0]]) === true)
						{
							/*
							// It already exists
							*/
							if (_this.objects.hasOwnProperty (type[0]) === true)
							_this.objects[type[0]].reset (_this.attributes[type[0]]);
							/*
							// It is new
							*/
							else _this.objects[type[0]] = new Backbone.Collection (_this.attributes[type[0]]);
							/*
							// Response
							*/
							return _this.objects[type[0]];
						}
						/*
						// Yet another property
						*/
						else return _this.attributes[type[0]];
					}
					/*
					// Nested getter
					*/
					else if (type.length > 2)
					{
						var iterator = _this.attributes, typeNotation = type.join ('.');

						for (var n in type) iterator = iterator.hasOwnProperty (type[n]) ? iterator[type[n]] : iterator;

						if (typeof iterator === "object" && _this.isArray (iterator) === true)
						{

							// It already exists
							if (_this.objects.hasOwnProperty (typeNotation) === true)
							_this.objects[typeNotation].reset (iterator);

							// It is new
							else _this.objects[typeNotation] = new Backbone.Collection (iterator);

							// Response
							return _this.objects[typeNotation];
						}

						// Yet another property
						else return iterator;
					}

					// Exception
					if (typeof type === "undefined") throw 'No parameter.';

					// Exception
					else throw 'Undefined.';
				}
				catch (error)
				{
					globals.console.error (error);
					return null;
				}
			};

			// Automatically fetches the data
			if (_this.static.getItem (_this.instance) === null) _this.fetch (data);

			// Is it loaded in memory
			else
			{
				_this.attributes = JSON.parse (_this.static.getItem (_this.instance));
				strict.deferred.resolve (_this);
			}

			// Asynchronous
			return strict.deferred.promise ();
		};

		$(document).ajaxStart (function () {
			$(".adagio-loading").show ();

		});

		$(document).ajaxStop (function () {
			if (Application.Model.Template.Engine.get ("done") === true) {
				if ($(".adagio-loading").is (":visible")) {
					$(".adagio-loading").hide ();
				}
			}

		});
	}

if ('serviceWorker' in navigator) {

	navigator.serviceWorker.register('/thread').then(function(registering) {

		if (registering.installing) {
			console.log('Service worker', registering.installing.state);

		} else if (registering.waiting) {
			console.log('Service worker', registering.waiting.state);

		} else if (registering.active) {
			console.log('Service worker', registering.active.state);

		}
		return navigator.serviceWorker.ready;

	}).catch(function(error) {

		console.log('Registration failed with ' + error);

	}).then(function() {

		if (Backbone.History.started) {
			window.routing.navigate (Backbone.history.fragment, {trigger: true});

		} else {
			Backbone.history.start ({pushState: false});

		}

	});
};

});
