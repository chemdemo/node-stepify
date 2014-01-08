/*!
 * node-stepify - Step.js
 * Copyright(c) 2013 dmyang <yangdemo@gmail.com>
 * MIT Licensed
 */

'use strict';

var util = require('./util');

// Define the `Step` Class.
// A step is just do only an asynchronous task.
// usage:
// new Step(task, 'foo', function function() {}[, args])
// new Step(task, 'foo', [, args])
// new Step(task, function() {}[, args])
var Step = module.exports = function(task, stepName, stepHandle, knownArgs) {
    // Declare which task this step belongs to.
    this._task = task;

    // The name of task this step belongs to.
    this.taskName = task._name;

    // Every step has an uinque stepName which can not be rewrite.
    this.name = stepName;

    // Step handle define what should done after this step.
    this._stepHandle = stepHandle;

    // The known arguments bafore this step declared.
    this._knownArgs = knownArgs;

    return this;
};

var _proto = Step.prototype;

// To finish current step manually.
// The first parame `err` is required and is the same as asynchronous callback in Node.JS
// the second param `callback` is optional and default is `this.next`,
// The rest parame(s) are(is) optional, and they(it) will be passed to the next step.
// usage:
// step.done(err[, function() {this.jump(2);}, args])
_proto.done = function(err) {
    var args = util.slice(arguments, 0);
    var callback;

    err = args.shift();

    if(undefined === err) err = null;

    callback = typeof args[0] === 'function' ? args.shift() : this.next;

    if(err) this.end(err);
    else callback.apply(this, args);
};

// Wrap a context for asynchronous callback,
// just work as a shortcut of `this.done.bind(this)`.
// It is usefull when working with some asynchronous APIs such as `fs.readdir`,
// because nodejs has limit it's callback param to run in the global context
// see: https://github.com/joyent/node/blob/master/lib/fs.js#L91
_proto.wrap = function() {
    var root = this;
    return function() {
        root.done.apply(root, arguments);
    };
};

// Output this task's finally result, which will access to the global finish handle.
// store this step's result is optional,
// just call `next` or `done` can access current result to next step,
// if this result is not expected for finally result.
// maybe `promises` or `result` better?
_proto.fulfill = function(result) {
    var args = util.slice(arguments, 0);
    var task = this._task;
    var fn = task._result;

    args.forEach(fn.bind(this._task));
};

// Set(or get) temporary variables which visible in this task's runtime.
_proto.vars = function(key, value) {
    var len = arguments.length;

    if(len === 1) {return this._task._variables[key];}
    if(len === 2) {return this._task._variables[key] = value;}
    return null;
};

// Simple parallel support.
// usage:
// this.parallel(['a.js', 'b.js'], fs.readFile[, *args, callback]);
// this.parallel([readFile1, readFile1][, callback]);
// the callback(default is this.next) has only one:
// a results array which has the same order as arr
_proto.parallel = function(arr) {
    var root = this;
    var completed = 0;
    var isFunction = util.isFunction;
    var each = util._.each;
    var result = [];
    var callback;
    var args = util.slice(arguments, 1);
    var done = function(n, err, r) {
        if(err) {
            this.end(err);
        } else {
            // make sure the result array has the same index as arr
            result[n] = r;
            if(++completed >= arr.length) {
                callback.call(this, result);
            }
        }
    };

    // each element should be a function in this case
    if(isFunction(arr[0])) {
        callback = isFunction(args[0]) ? args[0] : this.next;

        each(arr, function(fn, i) {
            if(!isFunction(fn)) throw new Error('Every element should be a function \
                as the first one does.');
            fn(done.bind(root, i));
        });
    } else {
        var iterator = args.shift();
        // use the last param as callback(default is this.next)
        callback = isFunction(args[args.length - 1]) ? args.pop() : this.next;

        each(arr, function(arg, i) {
            var a = [arg];
            a = a.concat(args);
            a.push(done.bind(root, i));
            iterator.apply(null, a);
        });
    }
};

// The default callback handle is this.next,
// use .jump() one can execute any other step manually.
// jump accepts at last one param, the first one `step` is
// required to declare which step will be jump to.
// Be careful using this method, really hope you never use it as
// it will disrupt the normal order of execution!
// usage:
// jump(3) || jump(-2) || jump('foo')
_proto.jump = function(step) {
    if(undefined === step) throw new Error('You must access the step you wish to jump to.');

    var root = this;
    var task = this._task;
    var currIndex = task._currIndex;
    var currStep = task._getStep(currIndex);
    var targetStep = function() {
        var type = typeof step;

        if('string' === type) return task._getStep(step);

        // step index started from 0
        if('number' === type) return task._getStep(step < 0 ? currIndex + step : step);

        return null;
    }();
    var targetIndex;

    if(!targetStep) throw new Error('The target step which will jump to was not exists.');

    targetIndex = targetStep._index;

    if(this._debug && currStep) console.log('The step: %s has done.', currStep.name);

    if(targetIndex !== currIndex) {
        task._run.apply(task, [targetIndex].concat(util.slice(arguments, 1)));
    } else {
        throw new Error('The step ' + currStep.name + ' is executing now!');
    }
};

// Finish current step and access the result to next step,
// the next step will be execute automatically,
// if the has no next step, then the current task will be identified finished.
_proto.next = function() {
    var task = this._task;
    var currIndex = task._currIndex;
    var args = util.slice(arguments, 0);

    if(currIndex + 1 < task._steps.length) {
        this.jump.apply(this, [currIndex + 1].concat(args));
    } else {
        this.end();
    }
};

// To break off current task manually and run next task automatically.
// If the has no next task it will run the `finish` handle if accessed.
// maybe `interrupt` or `stop` better?
_proto.end = function(err) {
    if(this._debug) console.log('Task: %s has ended in the step: %s with error: ' + (err ? err.stack : null) + '.',
        this.taskName, this.name);

    this._task.emit('done', err);
};
