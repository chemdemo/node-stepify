/**
 * Define the node-tasks library.
 * @author <a href="mailto:yangdemo@gmail.com">dmyang</a>
 * @version 0.0.1
 * @usage:
 * ``` js
 * require('node-tasks')
 *   .register('foo')
 *     .step('bar', fn, *args)
 *     .step('biz', *args)
 *     .biz(*args)
 *     .err(fn)
 *     .end() // optional
 *   .register('foo2')
 *     .step('bar2', fn)
 *     .step('biz2', fn)
 *   .register('foo3')
 *     .step('biz2', fn)
 *   .biz2(*args)
 *   .run('foo', 'foo2', 'foo3');
 * ```
 **/

'use strict';

var nutil = require('util');
var EventEmitter = require('event').EventEmitter;
var util = require('./util');
var noop = function() {};

var Tasks = module.exports = function(debug) {
    if(!this instanceof Task) return new Task(debug);

    this.debug = debug || false;
    this.timeout = 10000;
    this._taskQueue = [];
    this._currTask = null;
    this._runStack = [];
};
var _proto = Tasks.prototype;

/*
 * Register a task
 * @public
 * @param taskName {String}
 * @return this
 * @example
 */
_proto.register = _proto.addTask = function(taskName) {
    var tasks = this._taskQueue;

    if(tasks.some(function(task) {return task['taskName'] === taskName})) {
        throw new Error('This task was registered, please try another taskName.');
    }

    var task = new Task(taskName);

    task.on('end', this.end.bind(this));
    task.on('error', task._errHandler || this._errHandler || noop);
    task.on('timeout', this._timeoutHandler || this._timeoutHandler || noop);

    this.log('Register task: ', taskName, ' done.');
    tasks.push(task);
    return this;
};

_proto.log = function() {
    if(this.debug) console.log.apply(null, arguments);

    return this;
};

/*
 * Add a asynchronous method to current task.
 * @public
 * @param stepName {String} the name of this step
 * @param stepHandler {Function} optional step handler method
 * @param args {Mix} optional the data access to stepHandler
 * @return this
 * @example:
 * ``` js
 * Task().add('foo').step('bar', fn, *args)
 * Task().add('foo').step('bar').bar(fn, *args)
 * ```
 */
_proto.step = function(stepName) {
    var stepName = arguments[0];
    var args = util.slice.call(arguments, 1);
    var stepHandler;
    var step = new this._Step();

    if(typeof stepName !== 'string') throw new Error('Step name must be assigned.');
    if(!this._currTask) throw new Error('You did not declare task for the step: ' + stepName);

    if(args[0] && typeof args[0] === 'function') stepHandler = args.shift();
};

_proto.end = function() {
    if(this._currTask) {
        // TODO
    }
    this._currTask = null;
};

_proto.error = function(handler) {
    if(this._currTask) this._currTask._errHandler = handler;
    else this._errHandler = handler;
};

_proto.timeout = function(handler) {
    if(this._currTask) this._currTask._timeoutHandler = handler;
    else this._timeoutHandler = handler;
};

_proto.run = function() {};

/*
 * Add some asynchronous methods to extend `Task` Class.
 * @class Task
 */
var Task = _proto.Task = function(taskName) {
    this.taskName = taskName || '__UNAME_TASK__';
    this._steps = []; // [new Step(), new Step()]
    // this._currIndex = 0;
    this._aliasMap = {};

    this.on('done', function(err, step) {
        if(err) {
            if(this.error) this.error(err);
            else this.emit('error', err); // ==> tasks.error(fn)
        } else {
            if(step._index !== this._task.length) step.next(step._result);
            else this.emit('end');// ==> tasks.end(fn)
        }
    });

    this.on('timeout', function(step) {
        ;
    });
};

Task.prototype.__proto__ = EventEmitter.prototype;
// nutil.inherits(Task.prototype, EventEmitter.prototype);

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

Task.prototype._addStep = function(stepName, handler) {
    var args = util.slice.call(arguments, 2);
    var step = new Step(this, stepName, handler, args);

    step._index = this._steps.length;
    this._steps.push(step);

    Object.defineProperty(Task.prototype, stepName, {
        // value: handler
        set: function(fn) {
            this.value = fn;
        }
    });
};

Task.prototype._run = function(index) {
    this._currIndex = index = index || 0;

    var currStep = this._getStep(index);
    var args = util.slice.apply(arguments, 1);
    var handler = currStep._stepHandler || this._aliasMap[currStep._stepName] || null;

    handler && handler.apply(currStep, args);
};

/*
 * Add some asynchronous methods to extend `Step` Class.
 * @class Step
 * @example:
 * ``` js
 * new Task()
 *   .step('readDir', function() {
 *       var root = this;
 *       fs.readDir(arguments[0], function(files) {
 *       files = files.map(function(file) {return path.basename;});
 *       root.next(files); // root.done(files);
 *   }, '/foo/bar')
 *   .step('listDir', function(files) {
 *       var root = this;
 *       var result = [];
 *       this.repeat(files, function(file) {}, next);
 *       async.each(files, function(file) {}, next);
 *       files.forEach(function(file) {
 *          fs.stat(file, function(err, stats) {
 *             if(stats.isFile()) result.push(file);
 *             if(stats.isDirectory()) result.cancat(root.handler(root.prev(file)));
 *          });
 *       });
 *   });
 * ```
 */
var Step = _proto.Step = function(task, stepName, stepHandler) {
    var args = util.slice.apply(arguments, 0);

    this._task = task;
    if(typeof args[1] === 'string') this._stepName = args.shift();
    this._stepHandler = args[1];
    this._index = 0;
};

Step.prototype.done = function(err, result) {
    var args = util.slice.call(arguments, 0);

    err = args.shift();

    if(!err) err = null;
    if(err && !(err instanceof Error)) {err = new Error(err.toString());}

    // if(!err) this.next(this._result = args);
    // else this.err(err);
    this._result = args[0];
    this._task.emit('done', err, this);
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
    var args = util.slice.call(arguments, 1);

    if(!targetStep) throw new Error('The target step will jump to is not exists.');

    if(targetStep._index === currIndex) return;

    task._run(targetStep._index, args);
};

['prev', 'next'].forEach(function(s) {
    Object.defineProperty(Step.prototype, s, {
        get: function() {
            var args = util.slice.call(arguments, 0);
            args.unshift(s === 'prev' ? -1 : this._task._currIndex + 1);
            return this.jump.apply(this, args);
        }
    });
});
