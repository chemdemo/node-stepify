/**
 * Define the node-task library.
 * @author <a href="mailto:yangdemo@gmail.com">dmyang</a>
 * @version 0.0.1
 * @usage:
 * ``` js
 * require('node-tasks')()
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

var Tasks = module.exports = function() {
    if(!(this instanceof Task)) return new Task();

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

    var index = this._taskQueue.length;
    var task;

    taskName = taskName && typeof taskName === 'string' ? taskName : UNAME_TASK + index;
    task = new Task(taskName);

    task._index = index;
    task.on('done', this._doneHandler);
    task.on('error', task._errHandler || this._errHandler);
    // task.on('timeout', task._timeoutHandler || this._timeoutHandler);

    console.log('Register task: ', taskName, ' done.');
    this._currTask = task;
    this._taskQueue.push(task);
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
                    if(typeof handler !== function) throw new Error('Step handler should be a function.');
                    // step._stepHandler = handler.bind(step);
                    step._stepHandler = handler;
                };
            },
            set: function(handler) {
                if(typeof handler !== function) throw new Error('Step handler should be a function.');
                step._stepHandler = handler;
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
        // if(!currTask._doneHandler) currTask._doneHandler = this._doneHandler;
        if(!currTask._errHandler) currTask._errHandler = this._errHandler;
        // if(!currTask._timeoutHandler) currTask._timeoutHandler = this._timeoutHandler;
    }

    this._currTask = null;

    return this;
};

// Define the default done handler for Tasks instance.
Object.defineProperty(_proto, '_doneHandler', {
    get: function() {
        return function(err) {
            var task = this._currTask;
            var index = task._index;

            if(err) {
                task.emit('error', err);
            } else {
                if(index < this._taskQueue.length) {
                    this._taskQueue[++index]._run();
                } else {
                    console.log('All tasks executed!');
                    return; // this.finish() ??
                }
            }
        };
    }
});

// _proto.done = function(handler) {
//     if(this._currTask) this._currTask._doneHandler = handler;
//     else this._doneHandler = handler; // rewrite _doneHandler

//     return this;
// };

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
// Object.defineProperty(_proto, '_timeoutHandler', {
//     get: function() {
//         return function(timeout) {
//             console.log('timeout');
//         };
//     }
// });

// _proto.timeout = function(handler, timeout) {
//     if(this._currTask) this._currTask._timeoutHandler = handler;
//     else this._timeoutHandler = handler;

//     return this;
// };

_proto.run = function(n1, n2, n3, succ, err) {};

// new Task().err(fn).finish(fn)
// new Task()...run(succ, err)

/*
 * Add some asynchronous methods to extend `Task` Class.
 * @class Task
 */
var Task = _proto.Task = function(taskName) {
    Object.defineProperty(this, 'taskName', {
        readOnly: true,
        value: taskName
    });
    this._steps = []; // [new Step(), new Step()]
    this._currIndex = 0;
    this._results = [];
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

Task.prototype._addStep = function(stepName, handler) {
    var step = new Step(this, stepName, handler);

    step._index = this._steps.length;
    this._steps.push(step);

    return step;
};

Task.prototype._run = function() {
    var args = util.slice.apply(arguments, 0);
    var currStep;
    var handler;

    this._currIndex = args.shift() || 0;

    currStep = this._getStep(this._currIndex);
    handler = currStep._stepHandler;

    if(handler) handler.apply(currStep, args);
    else this.emit('error', 'Step handler was not defined.');
};

/*
 * Add some asynchronous methods to extend `Step` Class.
 * @class Step
 * @example:
 */
var Step = _proto.Step = function(task, stepName, stepHandler) {
    this._task = task;
    Object.defineProperty(this, 'stepName', {
        readOnly: true,
        value: stepName
    });
    this._stepHandler = stepHandler;
    this._index = 0;
};

Step.prototype.store = function() {
    ;
};

// remove?
Step.prototype.done = function(err, result) {
    var args = util.slice.call(arguments, 0);

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
    var args = util.slice.call(arguments, 1);

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
            var args = util.slice.call(arguments, 0);

            args.unshift(s === 'prev' ? -1 : this._task._currIndex + 1);
            return this.jump.apply(this, args);
        }
    });
});*/
