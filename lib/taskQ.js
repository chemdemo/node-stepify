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

var nutil = require('util');
var EventEmitter = require('event').EventEmitter;
var util = require('./util');

var Task = require('./Task');
var UNAME_TASK = '_UNAME_TASK_';
var UNAME_STEP = '_UNAME_STEP_';
var noop = function() {};

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

    var args = util.slice(arguments, 0);
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

    step = this._currTask._assign(stepName, stepHandler);

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
