/*!
 * Module dependencies.
 */

//var Schema = require('./schema');
var gpool = require('generic-pool');
var r = require('rethinkdb');
/**
 * Let's roll out things 
 */

function Thinky () {
    this.models = {};

    this.defaultSettings = {
        host: 'localhost',
        port: 28015,
        db: 'test',
        poolMax: 10,
        poolMin: 1,
        enforce: false
    }
};

Thinky.prototype.connect = function(options) {
    var self = this;

    if (!(options instanceof Object)) {
        options = {};
    }
    else if (options === null) {
        options = {};
    }
    else if (Object.prototype.toString.call(options) === '[object Array]') {
        options = {};
    }

    this.options = {
        host: options.host || this.defaultSettings.host,
        port: options.port || this.defaultSettings.port,
        db: options.db || this.defaultSettings.db,
        poolMax: options.poolMax || 10,
        poolMin: options.poolMin || 1,
        enforce: options.enforce || this.defaultSettings.enfore
    }

    //TODO add option for not using a pool

    this.pool = gpool.Pool({
        name: 'rethinkdbPool',
        create: function(cb) {
            r.connect({
                host: self.options.host,
                port: self.options.port
            }, function(error, conn) {
                return cb(error, conn);
            })
        },
        destroy: function(connection) {
            connection.close();
        },
        max: self.poolMax,
        min: self.poolMin,
        idleTimeoutMillis: 30000,
        log: function(what, level) {
            if (level === 'error') {
                require('fs').appendFile('rethinkdb-pool.log', what+'\r\n');
            }
        }
    })
};

Thinky.prototype.getOptions = function () {
    return this.options;
};
Thinky.prototype.setOptions = function (options) {
    for(var key in options) {
        this.setOption(key, options[key]);
    }
    return this.options;
};


Thinky.prototype.setOption = function (key, value) {
    //TODO if we change poolMax/poolMin/db, we could update the pool
    //TODO if we change the host/db, we should drain the pool and recreate the pool
    if (value === null) {
        this.options[key] = this.defaultSettings[key];
    }
    else {
        this.options[key] = value;
    }
    return this.options;
};

Thinky.prototype.getOption = function (key) {
    return this.options[key];
};

Thinky.prototype.disconnect = function() {
    var self = this;
    self.pool.drain(function() {
        self.pool.destroyAllNow();
    });
}

Thinky.prototype.Model = require('./model.js');
Thinky.prototype.createModel = function(name, schema, settings) {
    model = Thinky.prototype.Model.compile(name, schema, settings, this);
    this.models[name] = model;
    return model;
};

var thinky = module.exports = exports = new Thinky;