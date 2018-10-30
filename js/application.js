$(document).ready(function () {
  window.adagio = {};
  window.adagio.eventBus = _.clone(Backbone.Events);
  window.adagio.environment = {
    "protocol": "http://",
    "domain": "aton.klios.local",
    "version": "v2",
    "getProtocol": function () {
      return this.protocol;
    },
    "getDomain": function () {
      return this.domain;
    },
    "getApiVersion": function () {
      return this.version;
    },
    "getRoot": function (extended) {
      if (extended) {
        return _.union(
          this.getEndpoint().split('/').slice(0, 4),
          location.hash.slice(2).split('/')
        ).
        join("/");
      }
      else {
        return this.getEndpoint().split('/').slice(0, 3).join("/");
      }
    },
    "getTenancy": function (extended, options = {}) {
      extended = extended ? ('/' + extended) : '';
      var slashes = this.getEndpoint(extended, options).split('/'),
        uri = (slashes.length >= 5) ? "/" + slashes.slice(3, 5).join("/") : "";
      return uri + extended;
    },
    "getEndpoint": function (extended, options = {}) {
      if (this.endpoint === "") {
        this.endpoint = "/" + this.root + "/" + this.version;
      }
      if (typeof options === "object" && options.hasOwnProperty("tenant")) {
        this.endpoint = this.endpoint.replace(/(\/t\/)[0-9]+(\/?)/, ('$1' + options.tenant + '$2'));
      }
      if (typeof extended === "string" && extended.length > 0) {
        return this.endpoint + "/" + extended;
      } else {
        return this.endpoint;
      }
    },
    "endpoint": "",
    "root": "client",
    "getAbsolutePath": function () {
      return this.protocol + this.domain + this.root;
    }
  };
  // get | Load data from the server using a HTTP GET request.
  // getJSON | Load JSON-encoded data from the server using a GET HTTP request.
  // getScript | Load a JavaScript file from the server using a GET HTTP request, then execute it.
  // post | Load data from the server using a HTTP POST request.
  // load | Load data from the server and place the returned HTML into the matched element.
  window.adagio.app = function () {
    var self = this;
    // Route object itself
    this.routing = null;
    // Extendable routes object
    this.routes = {
      "routes": {
        "": function () {
          self.route.set({"id": "!", "uri": "!"});
        },
        "logon": function () {
          self.route.set({"id": "logon", "uri": location.hash.slice(1)});
        },
        "recovery": function () {
          self.route.set({"id": "recovery", "uri": location.hash.slice(1)});
        },
        "internals(/*querystring)": function (querystring) {
          self.route.set({"id": "internals/" + querystring, 'uri': location.hash.slice(1)});
        },
        "!(/*querystring)": function (querystring) {
          try {
            var CustomError = function (number, message) {
              this.number = number;
              this.message = message;
            };
            if (querystring === null) {
              throw new CustomError(400, "No querystring found.");
            }
            self.route.set({'id': '!/' + querystring, 'uri': location.hash.slice(1)});
          } catch (error) {
            self.route.set({'id': '!', 'uri': '!'});
          }
        }
      }
    };
    // Current route location model
    this.route = new Backbone.Model({"view": "", "id": "", "uri": null});
    // Event binding on current route changing
    this.route.off("change:uri").on("change:uri", function (model, uri) {
      try {
        var
          splittedUri = uri.split("?"),
          readyQuerystring = typeof splittedUri[1] === "string" ? splittedUri[1] : "";
        uri = typeof splittedUri[0] === "string" ? splittedUri[0] : uri;
        this.load = function () {
          // Generate targeted URL address
          this.address = function () {
            // Declared
            var address;
            // Absolute
            if (uri.search(/http/) === 0) {
              address = uri;
            }
            // Relative without tenancy
            else if (uri.search(/internals/) === 0) {
              address = ['//', location.hostname, (location.port ? (':' + location.port) : ''), uri.slice(9)].join('');
            }
            // Relative with tenancy
            else {
              address = ['//', location.hostname, (location.port ? (':' + location.port) : ''), adagio.environment.getRoot(), uri.slice(1)].join('');
            }
            // Response
            return address;
          }
          this.release = function (response) {
            response = self.viewAttributes(model.get('view'), response);
            /*
            if (response && response.view === 'sessions') {
              globals.localStorage.removeItem('subdistritos');
              globals.localStorage.removeItem('ocorrencias');
            }
            */
            if (model.previous("id") !== model.get("id") && uri.search(/http/) !== 0) {
              if (self.cachedViews[model.get('view')]) {
                self.cachedViews[model.get('view')].undelegateEvents();
              }
              self.renderizer(response);
            } else {
              if (_.has(self.cachedViews, response.view) === false)
                console.log('Importation for', response.view);
              else
                console.log('No reimport is needed for', response.view);
              self.renderizer(response);
            }
          }

          this.sync = $.ajax({
            "url": this.address(),
            "data": readyQuerystring,
            "method": "get",
            "dataType": "json",
            "cache": false,
            "beforeSend": function (jqXHR, settings) {
              settings.url = settings.url.replace(/&+/g, "&").replace(/[\?|&]$/g, "");
            }
          })
          .then(function (data, textStatus, jqXHR) {
            var header = jqXHR.getResponseHeader("X-Endpoint");
            if (typeof header === 'string' && header.length > 0) {
              adagio.environment.endpoint = header;
            } else {
              adagio.environment.endpoint = '';
            }
            return jqXHR;
          }, function (jqXHR, textStatus, errorThrown) {
            var header = jqXHR.getResponseHeader("X-Endpoint");
            if (typeof header === 'string' && header.length > 0) {
              adagio.environment.endpoint = header;
            } else {
              adagio.environment.endpoint = '';
            }
            return jqXHR;
          })
          .done(this.release);

          return this.sync;
        }

        if (model.previous("id").length) {
          console.log("Changed URI from [" + model.previous("id") + "] to [" + model.get("id") + "].");
        } else {
          console.log("Starting from the [" + model.get("id") + "] page.");
        }

        if (uri.search(/^\!/i) === 0) {
          this.load();
        } else if (uri.search(/^internals/i) === 0) {
          this.load();
        } else if (uri.search(/http/) === 0) {
          this.load();
          // Update
          this.newUri = "!" + uri.split(adagio.environment.getRoot()).pop();
          self.routing.navigate(this.newUri, {"trigger": false});
        } else {
          // Load locally
          self.renderizer({'view': model.get("id"), 'model': []});
        }
      } catch (caughtException) {
        console.error(caughtException);
      }
    });
    this.views = {
      "body": Backbone.View.extend({"el": "body"})
    };
    this.cachedViews = [];
    this.renderizer = function (request) {
      try {
        self.timestamp = _.now();
        self.route.set({
          "view": request.view,
          "done": false
        });
        self
          .__load(request.view, request)
          .then(function (loaded) {
            try {
              loaded.dependencies.set(loaded.__dependencies);
              _.each(loaded.dependencies.attributes, function (value, key, list) {
                if (this.dependencies.hasChanged(key)) {
                  document.getElementById(key).disabled = false;
                } else {
                  document.getElementById(key).disabled = true;
                }
              }, loaded);
              loaded.route.set("done", true);
              $(".adagio-loading").hide();
              if (request.hasOwnProperty("breadcrumbs")) {
                loaded.$el.trigger("breadcrumbs:append", [request.breadcrumbs]);
              } else {
                loaded.$el.trigger("breadcrumbs:empty");
              }
            } catch ($thrownException) {
              console.error($thrownException);
            }
          });
      } catch (error) {
        console.error(error);
      } finally {
        return self;
      }
    };
    this.commitments = {};
    this.commit = function (i, l) {
      var
        recursively = self.commit,
        _this = this;
      return new Promise(function (resolve, reject) {
        var
          key = (i === undefined) ? 0 : i,
          list = (l === undefined) ? (self.__scripts[_this.cid] || []) : l;
        // Promise
        if (list.length === 0) {
          return resolve();
        }
        // Deferred
        else {
          return self.__getScript(list[key]).
          then(function () {
            if (key + 1 < list.length) {
              return recursively.call(self, key + 1, list);
            }
          }, function () {
            return reject();
          }).
          then(function () {
            self.__scripts[_this.cid] = [];
            return resolve();
          }, function () {
            return reject();
          });
        }
      });
    };
    this.dependencies = null;
    this.__dependencies = {};
    this.timestamp = null;
    this.__scripts = {};
    this.getScript = function (filename, filetype, name) {
      if (typeof filename === "string") {
        if (self.__scripts[this.cid] === undefined) {
          self.__scripts[this.cid] = [];
        }
        if (name === undefined) {
          name = filename.replace(/[\W]/g, '');
        } else if (typeof name === "string" && name.length === 0) {
          name = filename.replace(/[\W]/g, '');
        } else {
          name = name.toString().replace(/[\W]/g, '');
        }
        // Dependencies
        self.__scripts[this.cid].push([filename, filetype, name]);
        // Stylesheet is active
        if (filetype === "css") {
          self.__dependencies[name] = self.timestamp;
        }
      }
      return this;
    };
    this.__getScript = function (parameters) {
      return new Promise(function (resolve, reject) {
        try {
          var
            filename = parameters[0],
            filetype = parameters[1],
            name = parameters[2],
            attribute = filetype === "js" ? "src" : "href";
          // Insertion
          if (document.getElementById(name) === null) {
            //
          }
          // Replacement
          else if (document.getElementById(name).getAttribute(attribute) !== filename) {
            console.log('Replacement of', name);
          }
          // Try
          else {
            return resolve();
          }
          if (filetype === "js") {
            var fileref = document.createElement('script');
            fileref.setAttribute("type", "text/javascript");
            fileref.setAttribute("src", filename);
            fileref.setAttribute("id", name);
          } else if (filetype === "css") {
            var fileref = document.createElement("link");
            fileref.setAttribute("id", name);
            fileref.setAttribute("rel", "stylesheet");
            fileref.setAttribute("type", "text/css");
            fileref.setAttribute("href", filename);
          }
          if (typeof fileref === 'object') {
            fileref.addEventListener('load', resolve);
            fileref.addEventListener('error', reject);
            if (document.getElementById(name) && document.getElementById(name).getAttribute(attribute) !== filename) {
              document.getElementById(name).parentNode.replaceChild(fileref, document.getElementById(name));
            }
            else {
              Array.from(document.getElementsByTagName("head")).shift().appendChild(fileref);
            }
          }
        } catch (thrown) {
          if (thrown.name === "Error") {
            resolve();
          } else {
            reject(thrown.message);
          }
        }
      });
    };
    this.sequence = function sequence() {
      var __slice = Array.prototype.slice;
      return _.compose.apply(this, __slice.call(arguments).reverse());
    };
    this.parse = function (data) {
      try {
        var
          name = '',
          model = {},
          keys = [];

        if (_.has(this, "url") === true && _.has(this, "type") === true ) {
          name = this.url.split("/").pop().replace(/\?/g, '.').replace(/[a-z_]+=/gi, '').replace(/&/, '.');
        }

        if (_.isObject(data) === true && _.isArray(data) === true && _.isEmpty(name) === false) {
          if (name.search(/\./) > 0) {
            model[name] = new Backbone.Collection(data);
          } else {
            if (!_.isEmpty(data)) {
              model[(name+'Col')] = new Backbone.Collection(data);
            }
          }
        }
        else if (_.isObject(data) === true && _.isArray(data) === true && _.isEmpty(name) === true) {
          model['collection'] = new Backbone.Collection(data);
        }
        else if (_.isObject(data) === true && _.isArray(data) === false) {
          keys = _.keys(_.omit(data, 'asynchronous'));

          for (var key in keys) {
            if (_.isArray(data[keys[key]])) {
              model[keys[key]] = new Backbone.Collection(data[keys[key]]);
            } else {
              model[keys[key]] = data[keys[key]];
            }
          }
        }
        else {
          //
        }
      } catch (caughtException) {
        console.error(caughtException);
      } finally {
        return model;
      }
    };
    this.getJSON = function (url, data, success) {
      try {
        var
          self = this,
          vars = {};

        if (_.isUndefined(success) && _.isFunction(data)) {
          success = data;
          data = "";
        }
        else if (_.isUndefined(data) && _.isUndefined(success)) {
          success = function success() {
            //
          };
          data = "";
        }
        else {
          //
        }

        if (_.isString(url) === false) {
          throw "";
        }

        vars.variableFrom = url.replace(/[^a-z0-9]/gi,"").substr(-32);
        vars.variableTemp = sessionStorage.getItem(vars.variableFrom);
        vars.url = url;
        vars.type = "sessionStorage";

        if ("sessionStorage" in window && vars.variableTemp) {
          self.model.set(self.parse.call(vars, JSON.parse(vars.variableTemp)));
          throw "Cached";
        }

        vars.request = $.ajax({"dataType": "json", "url": url, "data": data})
        .then(function (data, textStatus, jqXHR) {
          var attributes = {};

          if (!_.isEmpty(data.collection) && _.isEmpty(data.model)) {
            _.extend(attributes, self.parse.call(this, data.collection));
          }
          else if (_.isEmpty(data.collection) && !_.isEmpty(data.model)) {
            _.extend(attributes, self.parse.call(this, data.model));
          }
          else {
            _.extend(attributes, self.parse.call(this, data.collection), self.parse.call(this, data.model));
          }

          self.model.set(attributes);
          sessionStorage.setItem(vars.variableFrom, JSON.stringify(self.model.changedAttributes()));

          return attributes;
        });

        if (self.loadings[self.cid] === undefined) {
          self.loadings[self.cid] = [];
        }

        if (vars && vars.request && this.getJSON.caller.name === "initialize") {
          self.loadings[self.cid].push(Promise.resolve(vars.request));
        }
      }
      catch (caughtException) {
        console.error(caughtException);
      }
      finally {
        if (this.getJSON.caller.name !== "initialize") {
          return new Promise(function (resolve, reject) {
            if (vars && vars.request) {
              resolve(vars.request);
            }
            else {
              resolve(self.parse.call(vars, JSON.parse(vars.variableTemp)));
            }
          });
        }
        else {
          return this;
        }
      }
    };
    this.summon = function () {
      var
        _this = this,
        locals = {"debug": false},
        loadings = self.loadings[this.cid] || [];
      return new Promise(function (resolve, reject) {
        if (loadings.length === 0) {
          if (_this.id === undefined) {
            //
          }
          else if (_this.$("#" + _this.id).length > 0) {
            //
          }
          else if ($("#" + _this.id).length > 0) {
            if (locals.debug === true) {
              console.log((_this.id || _this.className), 'seems to be a parent view');
            }
            _this.setElement($("#" + _this.id)).render();
          }
          else {
            if (locals.debug === true) console.log((_this.id || _this.className), 'seems to be unexpected');
          }
          resolve()
        }
        else {
          Promise.all(loadings).then(function (views) {
            _.each(views, function (view) {
              if (_.isUndefined(view)) {
                //
              }
              else if (_.isObject(view.$el) && view.$el.find("#" + this.id).length > 0) {
                this.setElement(view.$el.find("#" + this.id)).render();
              }
              else if (_.isObject(view.$el) && this.$el.find("#" + view.id).length > 0) {
                view.setElement(this.$el.find("#" + view.id));
              }
              else {
                if (locals.debug === true) {
                  console.log((this.id || this.className), 'just in memory');
                }
              }
            },
            _this);
          }).
          then(function () {
            var last = self.loadings[_this.cid].pop();
            self.loadings[_this.cid].splice(0, self.loadings[_this.cid].length);
            return last;
          }).
          then(function (e) {
            resolve(e)
          });
        }
      });
    };
    this.viewAttributes = function (view, data) {
      var
        local = {};
        local.isModel = data.hasOwnProperty('version') ? parseInt(data.version) : 0;
        local.getResponse = {error: false, errors: []};
      if (local.isModel === 0) {
        if (data && data.model && data.model.cid !== undefined) {
          //
        }
        else if (data.model && _.isEmpty(data.model) === false) {
          data.model = new Backbone.Model(data.model);
        }
        else {
          data.model = new Backbone.Model;
        }
      }
      if (local.isModel > 0 && local.isModel < 3) {
        data.model = data.model && data.model.cid ? data.model : new Backbone.Model(data.model);
        if (_.isArray(data.collection)) {
          data.collection = new Backbone.Collection(data.collection);
        }
        else if (_.isObject(data.collection)) {
          _.each(data.collection, function (value, key) {
            data.collection[key] = $.isArray(value) ? new Backbone.Collection(value) : value;
          });
        }
        else {
          data.collection = [];
        }
      }
      if (local.isModel === 3) {
        data.path = [
          adagio.environment.getEndpoint().replace(adagio.environment.getTenancy(), ''),
          location.hash.search(/^#!/) === -1 ? ('/' + location.hash.slice(1)) : location.hash.slice(2)
        ].join('');
        data.model= data.model && data.model.cid ? data.model : new Backbone.Model(data.model);
        if (_.isArray(data.collection)) {
          data.collection = new Backbone.Collection(data.collection);
          data.collection.url = data.path;
          data.collection.parse = function (response) {
            return response.collection;
          };
        }
        else if (_.isObject(data.collection)) {
          _.each(data.collection, function (value, key) {
            data.collection[key] = $.isArray(value) ? new Backbone.Collection(value) : value;
            data.collection[key].url = data.path;
            data.collection[key].parse = function (response) {
              return response.collection[key];
            };
          });
        }
        else {
          data.collection = [];
        }
      }
      if (local.isModel === 4) {
        var feed = {};
        _.extend(feed, this.parse(data.model), this.parse(data.collection));
        if (data.model && data.model.cid) {
          data.model.set(feed.attributes);
        }
        else {
          data.model = new Backbone.Model(feed);
        }
        data.collection = new Backbone.Collection([]);
      }
      return data;
    };
    this.slugify = function slugify(text) {
      return (
        text.
        toString().
        toLowerCase().
        replace(/\s+/g, '-').
        replace(/[^\u0100-\uFFFF\w\-]/g, '-').
        replace(/\-\-+/g, '-').
        replace(/^-+/, '').
        replace(/-+$/, '')
      );
    };
    this.jsonify = (function (div) {
      return function (json) {
        div.setAttribute('onclick', 'this.__json__=' + json);
        div.click();
        return div.__json__;
      }
    })(document.createElement('div'));
    this._tuning = function (viewName, viewContent) {
      try {
        var locals = {};
        if (typeof viewName === "string" && viewName.length > 0) {
          locals.viewName = viewName;
        }
        else {
          locals.viewName = '';
        }
        if (typeof viewContent === "undefined") {
          throw new Error('Undefined');
        }
        if (typeof viewContent === "string" && viewContent.charAt (0) !== '{' && viewContent.charAt (0) !== '[') {
          throw new Error('Incorrect');
        }
        locals.viewContent = this.jsonify(viewContent);
        if (_.isArray(locals.viewContent)) {
          self.views[viewName] = self.view.extend(locals.viewContent[0]);
        }
        else if (_.isObject(locals.viewContent)) {
          self.views[viewName] = self.view.extend(locals.viewContent);
        }
        else {
          //
        }
      }
      catch (thrown) {
        try {
          console.error(thrown);
          eval(viewContent);
        } catch (rethrown) {
          console.error(rethrown);
        }
      }
    };
    this.__load = function (view, data) {
      var _this = this;

      data = this.viewAttributes(view, data);

      return new Promise(function (resolve, reject) {
        if (_.has(self.cachedViews, view)) {
          self.cachedViews[view].model.set(data.model.attributes);
          self.cachedViews[view].collection = data.collection;
          self.cachedViews[view].initialize();
          Promise.all([
            self.cachedViews[view].commit(),
            self.cachedViews[view].summon()
          ]).
          then(function (routines) {
            return self.cachedViews[view];
          }).
          then(resolve);
        }
        else {
          $.ajax({
            "url": ['//', location.hostname, (location.port ? (':' + location.port) : ''), '/js/views/', view, '.js'].join(''),
            "method": 'get',
            "dataType": 'text',
            "cache": (location.host.search(/local/) === -1 ? true : false),
            "context": _this
          })
          .then(function (response) {
            this._tuning(view, response);
            self.cachedViews[view] = new self.views[view]({"model": data.model, "collection": data.collection});
            // Chaining commit
            return self.cachedViews[view].commit()
            .then(function () {
              // Chaining summon
              return self.cachedViews[view].summon();
            })
            .then(function () {
              // Resolve
              resolve(self.cachedViews[view]);
            });
          });
        }
      });
    };
    this.loadings = {};
    this.load = function (view, data) {
      if (data === undefined) {
        data = {};
      }
      if (typeof view === "string") {
        if (this.loadings[this.cid] === undefined) {
          this.loadings[this.cid] = [];
        }
        this.loadings[this.cid].push(this.__load(view, data));
      }
      return this;
    };
    this.release = function () {
      // Obsolete
    };
    this.cookie = {
      "setItem": function setCookie(name, value, days) {
        if (days) {
          var date = new Date();
          date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
          var expires = "; expires=" + date.toGMTString();
        }
        else {
          var expires = "";
        }
        document.cookie = name + "=" + value + expires + "; path=/";
      },
      "getItem": function getCookie(name) {
        var nameEq = name + "=";
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
          var c = ca[i];
          while (c.charAt(0) == ' ') {
            c = c.substring(1, c.length);
          }
          if (c.indexOf(nameEq) == 0) {
            return c.substring(nameEq.length, c.length);
          }
        }
        return null;
      },
      "removeItem": function removeCookie(name) {
        this.setItem(name, "", -1);
      },
      "clear": function clearListCookies() {
        var cookies = document.cookie.split(";");
        for (var i = 0; i < cookies.length; i++) {
          var spcook =  cookies[i].split("=");
          document.cookie = spcook[0] + "=; expires=Thu, 21 Sep 1979 00:00:01 UTC;";
        }
      }
    };
    this.initialize = (function () {
      // Parent view
      // self.cachedViews["body"] = new self.views["body"];
      console.info('ADAGIO', 'started');
      self.dependencies = new Backbone.Model({});
      self.view = Backbone.View.extend(self);
      self.routes = Backbone.Router.extend(self.routes);
      self.routing = new self.routes;
      adagio.eventBus.off("navigate").on("navigate", self.routing.navigate);
    })();
    return this;
  };

  var app = new adagio.app();

  // Ajax request settings
  $.ajaxPrefilter(function ajaxPrefilter(options, originalOptions, jqXHR) {
    if (options.crossDomain === false) {
      // localStorage.getItem("access_token");
      var token = app.cookie.getItem("access_token");
      if (typeof token === "string" && token.length > 0) {
        return jqXHR.setRequestHeader('Authorization', 'Bearer ' + token);
      }
    }
  });

  window.handling = {
    "about": "Adagio",
    "response": function (one, two, three) {
      try {
        var
          _this = this,
          strict = {},
          globals = window;

        strict.catchup = function (element) {
          strict.data = element.responseJSON || {};
          return element;
        };

        strict.jqXHR = strict.catchup(one && one.statusText ? one : three);

        strict.jqXHR.then(function (done_data, done_textStatus, done_jqXHR) {
          if (_.isFunction(this.notification)) {
            this.notification(strict.data, done_textStatus, done_jqXHR);
          }
          return done_jqXHR;
        }, function (fail_jqXHR, fail_textStatus, fail_errorThrown) {
          if (_.isFunction(this.notification)) {
            this.notification(strict.data, fail_textStatus, fail_jqXHR);
          }
          return fail_jqXHR;
        })
        .then(function (data, textStatus, jqXHR) {
          var location = jqXHR.getResponseHeader("Location");

          if (typeof location !== "string") {
            return jqXHR;
          }

          if (this.followLocation === undefined || (this.followLocation && this.followLocation() === true)) {
            console.log("The response location is being followed.");
            app.route.set({"uri": location});
          }

          return jqXHR;
        }, function (jqXHR, textStatus, errorThrown) {
          return jqXHR;
        });
      } catch (error) {
        console.error(error);
      }
    },
    "notification": function notification(response, textStatus, jqXHR) {
      try {
        var
          _this = this,
          strict = {},
          globals = window;

        strict.aviso = _.template(
          '<div class="<%= adagio.tipo %>" role="alert"><%= adagio.mensagem %></div>',
          {"variable": 'adagio'}
        );

        strict.tipo = textStatus === "nocontent" ?
          "alert alert-info" :
          (textStatus === "success" ? "alert alert-success" : "alert alert-warning");

        strict.mensagem = jqXHR.getResponseHeader("X-Adagio-Warning") ?
          JSON.parse(jqXHR.getResponseHeader("X-Adagio-Warning")) :
          "Desconhecido.";

        _this.$el.find(".adagio-notification").empty();
        _this.$el.find(".has-error-help-block").remove();

        if (_.isArray(strict.mensagem)) {
          _.each(strict.mensagem, function (element) {
            var
              atual = strict;
              atual.mensagem = element;
            _this.$el.find(".adagio-notification").append(strict.aviso(atual));
          });
        } else if (_.isObject(strict.mensagem)) {
          _.each(strict.mensagem, function (value, key) {
            var atual = strict;

            atual.mensagem = ['<span class="help-block has-error-help-block">', value, '</span>'].join('');

            _this.$el.find("[name="+key+"]").closest(".form-group").addClass("has-error");
            _this.$el.find("[name="+key+"]").after(atual.mensagem);
          });
        } else {
          console.error("pay attention for this line after");
          _this.$el.find(".adagio-notification").html();
        }
      } catch (error) {
        console.error(error);
      }
    }
  };

  $.ajaxSetup({
    timeout: 60000,
    xhrFields: {"withCredentials": false},
    statusCode: {
      // OK
      "200": window.handling.response,
      // Created
      "201": window.handling.response,
      // Accepted
      "202": window.handling.response,
      // No Content
      "204": window.handling.response,
      // Moved Permanently
      "301": function (jqXHR, textStatus) {
        var strict = {
          "server": jqXHR.getResponseHeader("Server"),
          "moved": jqXHR.getResponseHeader("Location")
        };
        if (strict.server === "cloudflare-nginx" && strict.moved.search(location.protocol) === -1) {
          console.error(strict.server + "::" + strict.moved);
        }
      },
      // Bad Request
      // This response means that server could not understand the request due to invalid syntax.
      "400": window.handling.response,
      // 401 Unauthorized
      // Authentication is needed to get requested response. This is similar to 403, but in this case, authentication is possible.
      "401": function (jqXHR, textStatus) {
        if (Backbone.history.fragment.search(/^\!\/sessions/) !== 0) {
          app.routing.navigate("logon?intended="+encodeURI(Backbone.history.fragment), {trigger: true});
        }
      },
      // Forbidden
      // The request was a valid request, but the server is refusing to respond to it. Unlike a 401 Unauthorized response, authenticating will make no difference.
      "403": function (jqXHR, textStatus, errorThrown) {
        if ($("#adagio-layout").attr("class") === undefined) {
          app.__load("forbidden", {});
        } else {
          if (app.route.previous("id") !== app.route.get("id")) {
            window.history.back();
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
      // The requested resource could not be found but may be available again in the future. Subsequent requests by the client are permissible.
      "404": function (jqXHR, textStatus) {
        app.__load("crash", {});
      },
      // Request Timeout
      // The server timed out waiting for the request.
      "408": window.handling.response,
      "409": window.handling.response,
      "422": window.handling.response,
      // Internal Server Error
      // The server has encountered a situation it doesn't know how to handle.
      "500": function(jqXHR, textStatus) {
        // Check it out
        jqXHR.then(function() {
          //
        }, function(response) {
          var
            self = this,
            test = 'retry=500';
          if (typeof this === 'object' && this.type === 'POST') {
            if (typeof this.url === 'string' && this.url.search(/login$/i) > 0) {
              if (this.data.search(/retry/) !== -1) {
                // Return
                return app.__load("crash", {});
              }
              if (typeof this.data === 'string') {
                this.data = this.data + '&' + test;
              } else {
                this.data = test;
              }
              // Return
              return app.route.token().sync().always(function () {
                // Chained
                return $.ajax(self).done(function (data, textStatus, jqXHR) {
                  // Redirect
                  app.routing.navigate(data.uri, {"trigger": true});
                });
              });
            }
          } else {
            // Return
            return app.__load("crash", {});
          }
        });
      },
      // Service Unavailable
      "503": window.handling.response
    }
  });
  if (window.sessionStorage === undefined) {
    console.error("An error occurred at sessionStorage");
  } else if (window.localStorage === undefined) {
    console.error("An error occurred at localStorage");
  } else if (window.Backbone === undefined) {
    console.error("An error occurred at Backbone");
  } else {
    window.objectCache = function (instance, uri, data, onlySession) {
      var strict = {}, _this = this, globals = window;
      //
      strict.deferred = $.Deferred();
      //
      strict.arguments = Array.prototype.slice.call(arguments);
      if (strict.arguments.length === 0) {
        globals.console.error('No arguments supplied for.');
        return false;
      }
      //
      _this.isArray = ('isArray' in Array) ? Array.isArray : function (value) {
        return globals.Object.prototype.toString.call(value) === '[object Array]';
      };
      _this.attributes = {};
      _this.objects = {};
      _this.instance = instance || 'unknown';
      _this.uri = uri || '/interfaces/autocategorias';
      _this.static = onlySession && onlySession === true ? globals.sessionStorage : globals.localStorage;
      _this.fetch = function (options) {
        if (_this.uri && typeof _this.uri === "object") {
          try {
            _this.attributes = _this.uri;
            _this.static.setItem(_this.instance, globals.JSON.stringify(_this.attributes));
          }
          catch (error) {
            globals.console.error(error);
          }
          finally {
            return strict.deferred.resolve(_this);
          }
        }
        else if (_this.uri && typeof _this.uri === "string") {
          $.ajax({
            url: _this.uri,
            dataType: 'json',
            data: options || {},
          }).
          then(function (response) {
            try {
              _this.attributes = response;
              _this.static.setItem(_this.instance, globals.JSON.stringify(_this.attributes));
            }
            catch (error) {
              globals.console.error(error);
            }
            finally {
              return strict.deferred.resolve(_this);
            }
          });
        }
        else return false;
      };
      _this.get = function (type) {
        try {
          /*
          // Input
          */
          type = type ? type.split ('.') : undefined;
          /*
          // Getter
          */
          if (type.length === 1 && _this.attributes.hasOwnProperty(type[0])) {
            /*
            // It is collection array, unless it is model object
            */
            if (typeof _this.attributes[type[0]] === "object" && _this.isArray(_this.attributes[type[0]]) === true) {
              /*
              // It already exists
              */
              if (_this.objects.hasOwnProperty(type[0]) === true)
              _this.objects[type[0]].reset(_this.attributes[type[0]]);
              /*
              // It is new
              */
              else _this.objects[type[0]] = new Backbone.Collection(_this.attributes[type[0]]);
              /*
              // Response
              */
              return _this.objects[type[0]];
            }
            /*
            // Yet another property
            */
            else
              return _this.attributes[type[0]];
          }
          /*
          // Nested getter
          */
          else if (type.length > 2) {
            var iterator = _this.attributes, typeNotation = type.join('.');

            for (var n in type) iterator = iterator.hasOwnProperty(type[n]) ? iterator[type[n]] : iterator;

            if (typeof iterator === "object" && _this.isArray(iterator) === true) {
              // It already exists
              if (_this.objects.hasOwnProperty(typeNotation) === true)
                _this.objects[typeNotation].reset(iterator);
              // It is new
              else
                _this.objects[typeNotation] = new Backbone.Collection(iterator);
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
        catch (error) {
          globals.console.error(error);
          return null;
        }
      };

      // Automatically fetches the data
      if (_this.static.getItem(_this.instance) === null) _this.fetch(data);
      // Is it loaded in memory
      else {
        _this.attributes = JSON.parse(_this.static.getItem(_this.instance));
        strict.deferred.resolve(_this);
      }
      // Asynchronous
      return strict.deferred.promise();
    };
    $(document).ajaxStart(function () {
      $(".adagio-loading").show();
    });
    $(document).ajaxStop(function () {
      if (app.route.get("done") === true) {
        if ($(".adagio-loading").is(":visible")) {
          $(".adagio-loading").hide();
        }
      }
    });
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/thread').then(function (registering) {
      adagio.eventBus.off("worker:update").on("worker:update", registering.update.bind(registering));
      if (registering.installing) {
        console.info('Service worker', registering.installing.state);
      } else if (registering.waiting) {
        console.info('Service worker', registering.waiting.state);
      } else if (registering.active) {
        console.info('Service worker', registering.active.state);
      }
      registering.addEventListener('updatefound', function () {
        var newWorker = registering.installing;
        console.log('Service worker', newWorker.state);
        newWorker.addEventListener('statechange', function () {
          // "installing"   the install event has fired, but not yet complete
          // "installed"    install complete
          // "activating"   the activate event has fired, but not yet complete
          // "activated"    fully active
          // "redundant"    discarded. Either failed install, or it's been replaced by a newer version
          console.log('Service worker', newWorker.state);
        });
      });
      return navigator.serviceWorker.ready;
    })
    .catch(function (error) {
      console.error('Registration failed with ' + error);
    })
    .then(function () {
      if (Backbone.History.started) {
        app.routing.navigate(Backbone.history.fragment, {"trigger": true});
      } else {
        Backbone.history.start({"pushState": false});
      }
    });
  } else {
    console.error('Service worker', 'none');
    if (Backbone.History.started) {
      app.routing.navigate(Backbone.history.fragment, {"trigger": true});
    } else {
      Backbone.history.start({"pushState": false});
    }
  }
});