/*!
 * node-stepify - Task.js
 * Copyright(c) 2013 dmyang <yangdemo@gmail.com>
 * MIT Licensed
 */

'use strict';

var EventEmitter = require('events').EventEmitter;
var util = require('./util');

var Step = require('./Step');

// Define the `Task` Class.
// class Task
// usage:
// new Task().err(fn).finish(fn)
// new Task()...run(succ, err)
var Task = module.exports = function(taskName, taskMgr) {
    this._name = taskName;
    this._taskMgr = taskMgr;

    // [new Step(), new Step()]
    this._steps = [];

    this._currIndex = 0;

    // steps handles map
    this._handles = {};

    // temporary variables visible in task's runtime.
    this._variables = {};
};

var _proto = Task.prototype;

// Extend all properties from EventEmitter constructor
_proto.__proto__ = EventEmitter.prototype;

// take out step instance by stepName
// return all step instances if stepName has not accessed.
_proto._getStep = function(key) {
    if(key !== undefined) {
        return typeof key === 'string' ?
            util._.find(this._steps, function(step) {return step.name === key;}) :
            this._steps[key];
    } else {
        return this._steps;
    }
};

// get step handle by accessing step name.
_proto._getHandle = function(stepName) {
    var fn = this._handles[stepName] || this._taskMgr._handles[stepName];

    if(!util.isFunction(fn)) throw new Error('Handle of step `' + stepName + '` has not defined.');

    return fn;
};

// push current step's result into the final results array.
_proto._result = function(result) {
    return this._taskMgr._results.push(result);
};

// Assign an asynchronous step for this task.
_proto._step = function(stepName, handle, args) {
    var step = new Step(this, stepName, handle, args);

    step._debug = this._debug;
    step._index = this._steps.length;
    this._steps.push(step);

    return step;
};

// Start to execute this task step by step.
_proto._run = function() {
    var root = this;
    var args = util.slice(arguments, 0);
    var currStep;
    var handle;
    var isFunction = util.isFunction;
    var nextTick = util.nextTick;

    this._currIndex = args.shift() || 0;

    currStep = this._getStep(this._currIndex);
    handle = this._getHandle(currStep.name);

    if(isFunction(handle)) {
        nextTick(function() {
            if(root._debug) console.log('Start to run step: %s.', currStep.name);
            handle.apply(currStep, currStep._knownArgs.concat(args));
        });
    } else {
        this.emit('error', 'Step handle was not function.');
    }
};
