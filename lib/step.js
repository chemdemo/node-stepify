/*
 * Define the `Step` Class.
 * @class Step
 * @example:
 */

'use strict';

var util = require('./util');

var Step = module.exports = function(task, stepName, stepHandler) {
    this._task = task;

    Object.defineProperty(this, 'stepName', {
        readOnly: true,
        value: stepName
    });

    this._stepHandler = stepHandler;

    this._index = 0;
};

Step.prototype.store = function(key, value) {
    var args = util.slice(arguments, 0);

    if(!args.length) return null;

    // get value from store by key
    if(args.length === 1 && typeof key === 'string') return this._task._results[key] || null;

    if(args.length > 1) {
        ;
    }
};

// remove?
Step.prototype.done = function(err, result) {
    var args = util.slice(arguments, 0);

    err = args.shift();

    this._task._results[this._index] = this._result = args[0];

    if(err || this._index === this._thsk._steps.length) this.end(err, this);
    else this.next(this._result);
};

Step.prototype.end = function(err, step) {
    console.log('Task %s end after step %s done.', this._task.taskName, this.stepName);
    this._task.emit('done', err);
};

// jump(3) || jump(-2) || jump('foo')
Step.prototype.jump = function(step) {
    if(undefined === step) throw new Error('You must access the step you wish to jump to.');

    var root = this;
    var task = this._task;
    var currIndex = task._currIndex;
    var targetStep = function() {
        var type = typeof step;

        if('string' === type) return task._getStep(type);

        if('number' === type) return task._getStep(type < 0 ? current + type : type);
    }();
    var args = util.slice(arguments, 1);

    if(args[0] instanceof Error) return this.end(args[0], this);

    if(!targetStep) throw new Error('The target step will jump to is not exists.');

    if(targetStep._index === currIndex) return;

    task._run.apply(task, targetStep._index, args);
};

Step.prototype.next = function(arguments) {
    this.jump.apply(this, this._task._currIndex + 1, arguments);
};

/*['prev', 'next'].forEach(function(s) {
    Object.defineProperty(Step.prototype, s, {
        get: function() {
            var args = util.slice(arguments, 0);

            args.unshift(s === 'prev' ? -1 : this._task._currIndex + 1);
            return this.jump.apply(this, args);
        }
    });
});*/
