'use strict';

var nutil = require('util');
var util = require('./util');

var Task = require('./Task');
var UNAME_TASK = '_UNAME_TASK_';
var UNAME_STEP = '_UNAME_STEP_';
var noop = util._.noop;
var time;

/*
 * Define the `TaskMgr` Class which aims to manage numbers of Task instances.
 */
var TaskMgr = module.exports = function(finish) {
    var args = util.slice(arguments, 0);

    finish = args[0] && 'function' === typeof args[0] ? args[0] : null;

    // Both `new TaskMgr()` or `TaskMgr()` are supported.
    if(!(this instanceof TaskMgr)) return new TaskMgr(finish);

    this._debug = false;
    this._taskSequences = [];
    this._currTask = null;

    // All names defined manually by `.step` method.
    this._stepNames = [];

    // Library insert keys, the stepName(the first string parame of `step` method) should not be one of them.
    this._insetNames = ['task', 'assign', 'step', 'pend', 'error', 'timeout', 'finish', 'run'];

    // Optional, will called when all tasked tasks done.
    if(util._.isFunction(finish)) this._finishHandler = finish;

    return this;
};
var _proto = TaskMgr.prototype;

/*
 * Switch `this._debug` between true or false dynamically.
 * @public
 * @param debug {Mix} canbe Boolean or Function.
 * @return this
 * @useage:
 * TaskMgr()...debug([true, false])
 * TaskMgr()...debug(function() {return true;}[, args])
 */
Object.defineProperty(_proto, 'debug', {
    get: function() {
        return function(debug) {
            if(typeof debug === 'function') this._debug = debug.apply(this, util.slice(arguments, 1));
            else this._debug = debug || false;

            return this;
        };
    },
    set: function(debug) {
        this._debug = debug || false;
    }
});

/*
 * register a task.
 * @public
 * @param taskName {String} optional
 * @return this
 * @useage:
 * TaskMgr().task('foo')
 * TaskMgr().assign('bar')
 */
_proto.task = function(taskName) {
    if(this._currTask) this.pend();

    var root = this;
    var index = this._taskSequences.length;
    var task;

    taskName = taskName && typeof taskName === 'string' ? taskName : UNAME_TASK + index;
    task = new Task(taskName);

    task._index = index;
    task._debug = this._debug;
    task._getHandler = function(step) {
        var stepName = step.stepName;

        return step._stepHandler || task[stepName] || root[stepName] || null;
    };

    if(this._debug) console.log('task task: ', taskName, ' done.');

    this._currTask = task;
    // this._taskSequences.push(task);
    return this;
};

/*
 * Add a asynchronous method to current task.
 * @public
 * @param stepName {String} the name of this step
 * @param stepHandler {Function} optional step handler method
 * @param args {Mix} optional the data access to stepHandler
 * @return this
 * @useage:
 * TaskMgr().task('foo').step('bar', handler[, *args]).step(handler)
 * TaskMgr().task('foo').step('bar').bar(handler[, *args])
 */
_proto.step = function(stepName, stepHandler) {
    // It will call task() automatically before `step` method if not called manually.
    // if(!this._currTask) this.task();
    if(!this._currTask) throw new Error('The task for this step has not declared, \
        just call .task() before .step()');
    if(!arguments.length) throw new Error('Step handler should be accessed.');

    var currTask = this._currTask;
    var args = util.slice(arguments, 0);
    var stepName = args.shift();
    var _name;
    var stepHandler;
    var step;
    var find = util._.find;
    var isFn = util._.isFunction;

    if(isFn(stepName)) {
        stepHandler = stepName;
        _name = stepName = UNAME_STEP + currTask._steps.length;
    } else {
        if(find(this._insetNames, function(name) {return name === stepName})) {
            throw new Error('The name ' + stepName + ' was preset within the construtor, try another one?');
        }

        stepHandler = isFn(args[0]) ? args.shift() : null;
    }

    step = currTask._step(stepName, stepHandler, args);

    if(!stepHandler
        && stepName !== _name
        && !find(this._stepNames, function(name) {return name === stepName})
        // can rewrite
        // && !isFn(currTask[stepName])
        // && !isFn(this[stepName])
    ) {
        // Modify the prototype chain dynamically,
        // add a method as `step._stepHandler` which has the same name as `step.stepName`
        // useage:
        // TaskMgr().task('foo').step('bar').bar(handler[, *args])
        // var task = TaskMgr().task('foo').step('bar'); task.bar = handler;
        var _stepHandler = function(handler) {
            if(typeof handler !== 'function') throw new Error('Step handler should be a function.');

            if(this._currTask) {
                // this._currTask[stepName] = handler.bind(step, util.slice(arguments, 1));
                this._currTask[stepName] = handler;
            } else {
                // this[stepName] = handler.bind(step, util.slice(arguments, 1));
                this[stepName] = handler;
            }

            return this;
        };
        Object.defineProperty(_proto, stepName, {
            get: function() {
                return _stepHandler.bind(this);
            },
            set: _stepHandler.bind(this)
        });
    }

    if(stepHandler && 'function' === typeof stepHandler) {
        // step._stepHandler = stepHandler.bind(step);
        step._stepHandler = stepHandler;
    }

    this._stepNames.push(stepName);
    _name = null;

    return this;
};

/*
 * Finish a task workflow declare and prepare to declare another one.
 * If a new task workflow has started (task() been called), pend() will be call firstly automatically.
 * @public
 * @return this
 * @useage:
 * TaskMgr().task('foo').step('bar').pend().task('biz')
 */
_proto.pend = function() {
    var task = this._currTask;

    if(task) {
        this._taskSequences.push(task);
        this._currTask = task = null;
    }

    return this;
};

// Define the default finish handler for TaskMgr instance.
_proto._finishHandler = function(result) {
    if(this._debug) console.log('All tasks finished, took %d ms.', Date.now() - time);
    console.log('Default result...');
};

/*
 * Define a method which will call when all tasks done.
 * @public
 * @return null
 * @useage:
 * TaskMgr().task('foo').step('foo').finish(handler)
 * var task = TaskMgr().task('foo').step('foo'); task.finish = handler;
 */
var _finishHandler = function(handler) {
    if(!util._.isFunction(handler)) throw new Error('The param `handler` should be a function.');
    _proto._finishHandler = handler;

    return this;
};

Object.defineProperty(_proto, 'finish', {
    get: function() {
        return _finishHandler.bind(this);
    },
    set: _finishHandler.bind(this)
});

// Define the default error handler for TaskMgr instance.
_proto._errorHandler = function(err) {
    if(!(err instanceof Error)) throw new Error(err.toString());
    else throw err;
};

/*
 * Define error handler.
 * @public
 * @return this
 * @useage:
 * TaskMgr().task('foo').step('foo').error(handler)
 * var task = TaskMgr().task('foo').step('foo'); task.error = handler;
 */
Object.defineProperty(_proto, 'error', {
    get: function() {
        return function(handler) {
            if('function' !== typeof handler) throw new Error('The param `handler` should be a function.');

            // rewrite _errorHandler
            if(this._currTask) this._currTask._errorHandler = handler;
            else this._errorHandler = handler;

            return this;
        };
    },
    set: function(handler) {
        if('function' !== typeof handler) throw new Error('The param `handler` should be a function.');

        // rewrite _errorHandler
        if(this._currTask) this._currTask._errorHandler = handler;
        else this._errorHandler = handler;

        return this;
    }
});

// _proto.timeout = function(handler, timeout) {
//     if(this._currTask) this._currTask._timeoutHandler = handler;
//     else this._timeoutHandler = handler;

//     return this;
// };

/*
 * This method will make the task sequences running by the order customed.
 * The type of params can be String or Array,
 */
_proto.run = function(n1, n2, n3, n4) {
    if(this._currTask) this.pend();

    var root = this;
    var args = util.slice(arguments, 0);
    var isString = util._.isString;
    var isArray = util._.isArray;
    var isNumber = util._.isNumber;
    var isUndefined = util._.isUndefined;
    var find = function(key) {
        var tasks = root._taskSequences;
        var type = typeof(key);

        return isString(key) ? 
            util._.find(tasks, function(task) {return task.taskName === key;}) : 
            isNumber(key) ? 
                tasks[key] : 
                null;
    };
    var each = util._.each;
    var index = 0;
    var arr = args.length ? args : util._.range(root._taskSequences.length);
    var handler = function(err) {
        if(err) {
            this.emit('error', err);
        } else {
            var next = arr[++index];
            var task;

            if(isUndefined(next)) {
                root._finishHandler();
            } else if(isArray(next)) {
                parallel(index);
            } else {
                task = find(next);
                if(!task) throw new Error('Task has not registed.');
                task.on('done', task._doneHandler = handler);
                task.on('error', task._errorHandler || root._errorHandler.bind(task));
                task._run();
            }
        }
    };
    var parallel = function(n) {
        n = n || 0;

        var taskArr = isArray(arr[n]) ? arr[n] : [arr[n]];
        var count = 0;
        var task;

        each(taskArr, function(key) {
            task = find(key);
            if(!task) throw new Error('Task has not registed.');
            task._doneHandler = function(err) {
                if(err) {
                    handler.call(this, err);
                } else {
                    if(++count >= taskArr.length) {
                        handler.apply(this, arguments);
                    }
                }
            };
            task.on('done', task._doneHandler);
            task.on('error', task._errorHandler || root._errorHandler.bind(task));
            task._run();
        });
    };

    // for consuming statistics
    if(this._debug) time = Date.now();

    // Tasks will be executed by the order they declared if not customed order accessed.
    parallel();
};
