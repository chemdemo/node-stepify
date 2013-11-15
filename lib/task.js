/*
 * Define the `Task` Class.
 * @class Task
 * @example:
 * new Task().err(fn).finish(fn)
 * new Task()...run(succ, err)
 */

'use strict';

var EventEmitter = require('event').EventEmitter;
var util = require('./util');

var Step = require('./Step');

var Task = module.exports = function(taskName) {
    Object.defineProperty(this, 'taskName', {
        readOnly: true,
        value: taskName
    });

    this._steps = []; // [new Step(), new Step()]

    this._currIndex = 0;

    this._results = {};
};

// nutil.inherits(Task.prototype, EventEmitter.prototype);
Task.prototype.__proto__ = EventEmitter.prototype;

Object.defineProperty(Task.prototype, '_getStep', {
    get: function() {
        var root = this;
        return function(key) {
            if(key !== undefined) {
                return typeof key === 'string' ?
                    util._.find(root._steps, function(step) {return step.taskName === key;}) :
                    root._steps[key];
            } else {
                return root._steps;
            }
        };
    }
});

Task.prototype._step = function(stepName, handler) {
    var step = new Step(this, stepName, handler);

    step._index = this._steps.length;
    this._steps.push(step);

    return step;
};

Task.prototype._run = function() {
    var args = util.slice(arguments, 0);
    var currStep;
    var handler;

    this._currIndex = args.shift() || 0;

    currStep = this._getStep(this._currIndex);
    handler = currStep._stepHandler;

    if(handler) handler.apply(currStep, args);
    else this.emit('error', 'Step handler was not defined.');
};
