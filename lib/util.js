'use strict';

// The module to be exported.
var util = module.exports = {};

util.hooker = require('hooker');
util.async = require('async');
util._ = require('lodash/dist/lodash.underscore');

// https://github.com/gruntjs/grunt/blob/master/lib/grunt/util.js#L38
// Return a function that normalizes the given function either returning a
// value or accepting a "done" callback that accepts a single value.
util.callbackify = function(fn) {
    return function callbackable() {
        var result = fn.apply(this, arguments);
        var length = arguments.length;
        if (length === fn.length) { return; }
        var done = arguments[length - 1];
        if (typeof done === 'function') { done(result); }
    };
};

util.slice = Array.prototype.slice;
