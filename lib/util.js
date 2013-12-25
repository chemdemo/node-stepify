'use strict';

// The module to be exported.
var util = module.exports = {};

// util.hooker = require('hooker');
// util.async = require('async');
// util._ = require('lodash/dist/lodash.underscore');
var _ = util._ = require('lodash');

var isFunction = util.isFunction = _.isFunction;
var isArray = util.isArray = _.isArray;
var isString = util.isString = _.isString;
var isNumber = util.isNumber = _.isNumber;
var isUndefined = util.isUndefined = _.isUndefined;

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

util.slice = function(args, index) {
    return Array.prototype.slice.call(args, index);
};

// Ensure that a function only be executed once.
util.once = function(fn, context) {
    var called = false;

    return function() {
        if(called) throw new Error('Callback was already called.');
        called = true;
        fn.apply(context || null, arguments);
    };
};

// node v0.8 has no setImmediate method
util.nextTick = typeof setImmediate === 'function' ? setImmediate : process.nextTick;
