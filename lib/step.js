'use strict';

var util = require('./util');
var noop = util._.noop;

// Define the `Step` Class.
// A step is just do only an asynchronous task.
// useage:
// new Step(task, 'foo', function function() {}[, args])
// new Step(task, '_UNAME_STEP_1', function() {}[, args])
var Step = module.exports = function(task, stepName, stepHandler) {
    var args = util.slice(arguments, 0);

    // Declare which task this step belongs to.
    this._task = args.shift();

    // Every step has an uinque stepName which can not be rewrite.
    console.log(this.stepName)
    Object.defineProperty(Step.prototype, 'stepName', {
        readOnly: true,
        value: args.shift()
    });
    console.log(this.stepName)

    // Step handler define what should done after this step.
    this._stepHandler = args[0] && typeof args[0] === 'function' ? args.shift() : noop;

    // The known arguments bafore this step declared.
    this._preArgs = args;
};

// To finish current step manually.
// The first parame `err` is required and is the same as asynchronous callback in Node.JS
// the second param `callback` is optional and default is `this.next`,
// The rest parame(s) are(is) optional, and they(it) will be passed to the next step.
// useage:
// step.done(err[, function() {this.jump(2);} args])
// remove?
Step.prototype.done = function(err, callback) {
    var args = util.slice(arguments, 0);
    var callback;

    err = args.shift();

    if(undefined === err) err = null;

    if(err !== null && !(err instanceof Error)) {
        throw new Error('The first param should be instance of Error Object or null');
    }

    callback = args.shift();
    callback = typeof callback === 'function' ? callback : this.next;

    if(err || this._index === this._task._steps.length - 1) this.end(err);
    // else callback.apply(this, args);
    else callback.bind(this)(args);
};

// store this step's result to the task it belongs
// other steps can get this result by call this.store(key).
// store this step's result is optional,
// just call this.next() can access current result to next step
// maybe `inject` better?
Step.prototype.store = function(key, value) {
    var args = util.slice(arguments, 0);

    if(!args.length) return null;

    // get value from store by key
    if(args.length === 1 && typeof key === 'string') return this._task._results[key] || null;

    if(args.length > 1 && typeof key === 'string') {
        return this._task._results[key] = value;
    }
};

// To break off current task manually and run next task automatically.
// If the has no next task it will run the `finish` handler if accessed.
// maybe `interrupt` better?
Step.prototype.end = function(err) {
    if(this._debug) console.log('Task %s end in step %s handler.', this._task.taskName, this.stepName);

    this._task.emit('done', err);
};

// The default callback handler is this.next,
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

        if('string' === type) return task._getStep(type);

        if('number' === type) return task._getStep(type < 0 ? currIndex + type : type);

        return null;
    }();
    var args = util.slice(arguments, 1);

    if(!targetStep) throw new Error('The target step will jump to is not exists.');

    if(targetStep._index === currIndex) return;

    if(this._debug) {
        console.log('Jump step to %s.', targetStep.stepName);
    }

    task._run(targetStep._index, args);
};

// Finish current step and access the result to next step,
// the next step will be execute automatically,
// if the has no next step, then the current task will be identified finished.
Step.prototype.next = function() {
    var task = this._task;

    if(task._currIndex <= task._steps.length - 1) {
        if(this._debug) console.log('Finish step %s and run next.', this.stepName);
        this.jump.apply(this, task._currIndex + 1, arguments);
    } else {
        // if(this._debug) console.log('Task %s finished.', task.taskName);
        // this._task.emit('done', null);
        this.end(null);
    }
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
