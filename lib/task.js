'use strict';

var EventEmitter = require('events').EventEmitter;
var util = require('./util');

var Step = require('./Step');

// Define the `Task` Class.
// class Task
// useage:
// new Task().err(fn).finish(fn)
// new Task()...run(succ, err)
var Task = module.exports = function(taskName, taskMgr) {
    this._taskName = taskName;
    this._taskMgr = taskMgr;

     // [new Step(), new Step()]
    this._steps = [];

    this._currIndex = 0;

    // steps handles map
    this._handles = {};

    // temporary variables visible in task's runtime.
    this._variables = {};
};

Task.prototype.__proto__ = EventEmitter.prototype;

// take out step instance by stepName
// return all step instances if stepName has not accessed.
Task.prototype._getStep = function(key) {
    if(key !== undefined) {
        return typeof key === 'string' ?
            util._.find(this._steps, function(step) {return step._stepName === key;}) :
            this._steps[key];
    } else {
        return this._steps;
    }
};

// get step handle by accessing step name.
Task.prototype._getHandle = function(stepName) {
    return this._handles[stepName] || this._taskMgr._handles[stepName] || null;
};

// push current step's result into the final results array.
Task.prototype._result = function(result) {
    return this._taskMgr._results.push(result);
};

// Assign an asynchronous step for this task.
Task.prototype._step = function(stepName, handle, args) {
    var step = new Step(this, stepName, handle, args);

    step._debug = this._debug;
    step._index = this._steps.length;
    this._steps.push(step);

    return step;
};

// Start to execute this task step by step.
Task.prototype._run = function() {
    var args = util.slice(arguments, 0);
    var currStep;
    var handle;

    this._currIndex = args.shift() || 0;

    currStep = this._getStep(this._currIndex);
    handle = this._getHandle(currStep._stepName);

    if(util._.isFunction(handle)) handle.apply(currStep, currStep._knownArgs.concat(args));
    else this.emit('error', 'Step handle was not function.');
};
