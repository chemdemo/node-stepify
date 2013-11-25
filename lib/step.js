'use strict';

var util = require('./util');

// Define the `Step` Class.
// A step is just do only an asynchronous task.
// useage:
// new Step(task, 'foo', function function() {}[, args])
// new Step(task, 'foo', [, args])
// new Step(task, function() {}[, args])
var Step = module.exports = function(task, stepName, stepHandle, knownArgs) {
    // Declare which task this step belongs to.
    this._task = task;

    // Every step has an uinque stepName which can not be rewrite.
    this.stepName = stepName;

    // Step handle define what should done after this step.
    this._stepHandle = stepHandle;

    // The known arguments bafore this step declared.
    this._knownArgs = knownArgs;

    return this;
};

// To finish current step manually.
// The first parame `err` is required and is the same as asynchronous callback in Node.JS
// the second param `callback` is optional and default is `this.next`,
// The rest parame(s) are(is) optional, and they(it) will be passed to the next step.
// useage:
// step.done(err[, function() {this.jump(2);} args])
Step.prototype.done = function(err, callback) {
    var args = util.slice(arguments, 0);
    var callback;

    err = args.shift();

    if(undefined === err) err = null;

    callback = args.shift();
    callback = typeof callback === 'function' ? callback : this.next;

    if(err || this._index === this._task._steps.length - 1) {
        this.end(err);
    } else {
        if(this._debug) console.log('Step `%s` has done and start to run next step.', this.stepName);
        callback.apply(this, args);
    }
};

// Store(or get) this(previous) step's result.
// store this step's result is optional,
// just call this.next() can access current result to next step 
// if this result is not expected for finally result.
// maybe `store` or `promises` better?
Step.prototype.result = function(key, value) {
    return this._task._result(key, value);
};

// To break off current task manually and run next task automatically.
// If the has no next task it will run the `finish` handle if accessed.
// maybe `interrupt` better?
Step.prototype.end = function(err) {
    if(this._debug) console.log('Task `%s` has end in the step `%s`.', this._task.taskName, this.stepName);

    this._task.emit('done', err);
};

// The default callback handle is this.next,
// use .jump() one can execute any other step manually.
// jump accepts at last one param, the first one `step` is
// required to declare which step will be jump to.
// useage:
// jump(3) || jump(-2) || jump('foo')
Step.prototype.jump = function(step) {
    if(undefined === step) throw new Error('You must access the step you wish to jump to.');

    var root = this;
    var task = this._task;
    var currIndex = task._currIndex;
    var targetStep = function() {
        var type = typeof step;

        if('string' === type) return task._getStep(step);

        if('number' === type) return task._getStep(step < 0 ? currIndex + step : step);

        return null;
    }();

    if(!targetStep) throw new Error('The target step will jump to is not exists.');

    if(targetStep._index === currIndex) return;

    if(this._debug) {
        console.log('Jump step to %s.', targetStep.stepName);
    }

    task._run.apply(task, [targetStep._index].concat(util.slice(arguments, 1)));
};

// Finish current step and access the result to next step,
// the next step will be execute automatically,
// if the has no next step, then the current task will be identified finished.
Step.prototype.next = function() {
    var task = this._task;
    var args = util.slice(arguments, 0);

    if(task._currIndex + 1 < task._steps.length) {
        this.jump.apply(this, [task._currIndex + 1].concat(args));
    } else {
        this.end.apply(this, args);
    }
};
