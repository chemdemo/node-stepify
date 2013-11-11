/**
 * Define the node-task library.
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
var UNAME_TASK = 'UNAME_TASK_';
var UNAME_STEP = 'UNAME_STEP_';

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
 * @param taskName {String} optional
 * @return this
 * @example
 */
_proto.register = _proto.addTask = function(taskName) {
    if(this._currTask) this.pend();

    taskName = taskName && typeof taskName === 'string' ? taskName : UNAME_TASK + this._taskQueue.length;

    var task = new Task(taskName);

    task.on('done', task._doneHandler || this._doneHandler);
    task.on('error', task._errHandler || this._errHandler);
    task.on('timeout', task._timeoutHandler || this._timeoutHandler);

    this.log('Register task: ', taskName, ' done.');
    this._currTask = task;
    this._taskQueue.push(task);
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
 * Task().add('foo').step('bar', fn, *args).step(fn)
 * Task().add('foo').step('bar').bar(fn, *args)
 * ```
 */
_proto.step = function(stepName, stepHandler) {
    if(!this._currTask) throw new Error('The task for this step has not declared.');
    if(!arguments.length) throw new Error('Step name or handler should be accessed at last one.');

    var args = util.slice.call(arguments, 0);
    var stepName = args.unshift();
    var _name;
    var stepHandler;
    var step;

    if('function' === typeof stepName) {
        stepHandler = stepName;
        // delete stepName;
        _name = stepName = UNAME_STEP + this._currTask._steps.length;
    }

    if('string' === typeof stepName) stepHandler = args.unshift();

    step = this._currTask._addStep(stepName, stepHandler);

    if(!stepHandler && stepName !== _name) {
        // 动态修改Tasks类的原型链，添加以stepName命名的函数作为这个step的处理函数
        Object.defineProperty(_proto, stepName, {
            get: function() {
                return function(handler) {
                    step._stepHandler = handler.bind(step);
                };
            }
        });
    }

    if(stepHandler && 'function' === typeof stepHandler) {
        step._stepHandler = stepHandler.bind(step);
    }

    return this;
};

_proto.pend = function() {
    var currTask = this._currTask;

    if(currTask) {
        if(!currTask._doneHandler) currTask._doneHandler = this._doneHandler;
        if(!currTask._errHandler) currTask._errHandler = this._errHandler;
        if(!currTask._timeoutHandler) currTask._timeoutHandler = this._timeoutHandler;
    }

    this._currTask = null;

    return this;
};

// Define the default done handler for Tasks instance.
Object.defineProperty(_proto, '_doneHandler', {
    get: function() {
        return this.next;
    }
});

_proto.done = function(handler) {
    if(this._currTask) this._currTask._doneHandler = handler;
    else this._doneHandler = handler; // rewrite _doneHandler

    return this;
};

// Define the default error handler for Tasks instance.
Object.defineProperty(_proto, '_errHandler', {
    get: function() {
        return function(err, step) {
            if(!(err instanceof Error)) err = new Error(err.toString());
            throw new Error(err);
        };
    }
});

_proto.error = function(handler) {
    if(this._currTask) this._currTask._errHandler = handler;
    else this._errHandler = handler; // rewrite _errHandler

    return this;
};

// Define the default timeout handler for Tasks instance.
Object.defineProperty(_proto, '_timeoutHandler', {
    get: function() {
        return function(timeout) {
            this.log('timeout');
        };
    }
});

// _proto.timeout = function(handler, timeout) {
//     if(this._currTask) this._currTask._timeoutHandler = handler;
//     else this._timeoutHandler = handler;

//     return this;
// };

_proto.run = function() {};

/*
 * Add some asynchronous methods to extend `Task` Class.
 * @class Task
 */
var Task = _proto.Task = function(taskName) {
    this.taskName = taskName;
    this._steps = []; // [new Step(), new Step()]
    this._currIndex = 0;
    this._results = [];

    EventEmitter.call(this);
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
    var step = new Step(this, stepName, handler);

    step._index = this._steps.length;
    this._steps.push(step);

    return step;
};

Task.prototype._run = function(index) {
    this._currIndex = index = index || 0;

    var currStep = this._getStep(index);
    var args = util.slice.apply(arguments, 1);
    var handler = currStep._stepHandler;

    if(handler) handler.apply(currStep, args);
    else this.emit('error', 'Step handler was not defined.');
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

Step.prototype.stop = function(err) {
    this._task.emit('done', err);

    // var args = util.slice.call(arguments, 0);

    // err = args.shift();

    // if(!err) err = null;
    // if(err && !(err instanceof Error)) {err = new Error(err.toString());}

    // this._task._results[this._index] = this._result = args[0];
    // this._task.emit('done', err, this);
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
