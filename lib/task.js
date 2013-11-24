'use strict';

var EventEmitter = require('events').EventEmitter;
var util = require('./util');

var Step = require('./Step');

// Define the `Task` Class.
// class Task
// useage:
// new Task().err(fn).finish(fn)
// new Task()...run(succ, err)
var Task = module.exports = function(taskName) {
    this.taskName = taskName;

    this._steps = []; // [new Step(), new Step()]

    this._currIndex = 0;

    this._results = {};
};

Task.prototype.__proto__ = EventEmitter.prototype;

Task.prototype._getStep = function(key) {
    if(key !== undefined) {
        return typeof key === 'string' ?
            util._.find(this._steps, function(step) {return step.taskName === key;}) :
            this._steps[key];
    } else {
        return this._steps;
    }
};

// Assign an asynchronous step for this task.
Task.prototype._step = function(stepName, handler, args) {
    var step = new Step(this, stepName, handler, args);

    step._debug = this._debug;
    step._index = this._steps.length;
    this._steps.push(step);

    return step;
};

// Start to execute this task step by step.
Task.prototype._run = function() {
    var args = util.slice(arguments, 0);
    var currStep;
    var handler;

    this._currIndex = args.shift() || 0;

    currStep = this._getStep(this._currIndex);
    handler = this._getHandler(currStep);

    if(util._.isFunction(handler)) handler.apply(currStep, currStep._knownArgs);
    else this.emit('error', 'Step handler was not function.');
};
