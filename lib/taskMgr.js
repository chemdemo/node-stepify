'use strict';

var nutil = require('util');
var util = require('./util');

var Task = require('./Task');
var UNAMED_TASK = '_UNAMED_TASK_';
var UNAMED_STEP = '_UNAMED_STEP_';
var noop = util._.noop;

/*
 * @description Define the `TaskMgr` Class aims to manage numbers of `Task` instances.
 * @public
 * @param [Function] finish optional
 * @return this
 * @usage:
 * var myTask = new TaskMgr([handle]);
 * var myTask = TaskMgr([handle]);
 */
var TaskMgr = module.exports = function(finish) {
    // Both `new TaskMgr()` and `TaskMgr()` are supported.
    if(!(this instanceof TaskMgr)) return new TaskMgr(finish);

    var args = util.slice(arguments, 0);

    finish = args[0] && 'function' === typeof args[0] ? args[0] : null;

    this._debug = false;
    this._taskSequences = [];
    this._currTask = null;
    this._handles = {};
    this._results = [];

    // All names defined manually by `.step` method.
    this._stepNames = [];

    // Library insert keys, the stepName(the first string parame of `step` method) should not be one of them.
    this._insetNames = ['task', 'assign', 'step', 'pend', 'error', 'timeout', 'finish', 'run'];

    // Optional, will called when all tasked tasks done.
    if(util._.isFunction(finish)) this._finishHandle = finish;

    return this;
};
var _proto = TaskMgr.prototype;

/*
 * @description Switch `this._debug` between true or false dynamically.
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
 * @description Register a task.
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

    taskName = taskName && typeof taskName === 'string' ? taskName : UNAMED_TASK + index;
    task = new Task(taskName, this);

    task._index = index;
    task._debug = this._debug;

    if(this._debug) {console.log('task task: ', taskName, ' done.');}

    this._currTask = task;
    // this._taskSequences.push(task);
    return this;
};

/*
 * @description Add a asynchronous method to current task.
 * @public
 * @param stepName {String} the name of this step
 * @param stepHandle {Function} optional step handle method
 * @param args {Mix} optional the data access to stepHandle
 * @return this
 * @useage:
 * TaskMgr().task('foo').step('bar', handle[, *args]).step(handle)
 * TaskMgr().task('foo').step('bar').bar(handle[, *args])
 */
_proto.step = function(stepName, stepHandle) {
    // `task` method will be called automatically before `step` if not called manually.
    if(!this._currTask) this.task();
    // if(!this._currTask) throw new Error('The task for this step has not declared, \
    //     just call .task() before .step()');
    if(!arguments.length) throw new Error('Step handle should be accessed.');

    var currTask = this._currTask;
    var args = util.slice(arguments, 0);
    var stepName = args.shift();
    var _name;
    var stepHandle;
    var step;
    var find = util._.find;
    var isFn = util._.isFunction;

    if(isFn(stepName)) {
        stepHandle = stepName;
        _name = stepName = UNAMED_STEP + currTask._steps.length;
    } else {
        if(find(this._insetNames, function(name) {return name === stepName})) {
            throw new Error('The name ' + stepName + ' was preset within the construtor, try another one?');
        }

        stepHandle = isFn(args[0]) ? args.shift() : null;
    }

    step = currTask._step(stepName, stepHandle, args);

    if(!stepHandle
        && stepName !== _name
        && !find(this._stepNames, function(name) {return name === stepName})
        // can rewrite
        // && !isFn(currTask[stepName])
        // && !isFn(this[stepName])
    ) {
        // Modify the prototype chain dynamically,
        // add a method as `step._stepHandle` which has the same name as `step._stepName`
        // useage:
        // TaskMgr().task('foo').step('bar').bar(handle[, *args])
        // var task = TaskMgr().task('foo').step('bar'); task.bar = handle;
        var _stepHandle = function(handle) {
            if(typeof handle !== 'function') throw new Error('Step handle should be a function.');

            handle = handle.bind(step);

            if(this._currTask) {
                this._currTask._handles[stepName] = handle;
            } else {
                this._handles[stepName] = handle;
            }

            return this;
        };

        Object.defineProperty(_proto, stepName, {
            get: function() {
                return _stepHandle.bind(this);
            },
            set: _stepHandle.bind(this)
        });
    }

    if(stepHandle && 'function' === typeof stepHandle) {
        step._task._handles[stepName] = stepHandle;
    }

    this._stepNames.push(stepName);
    _name = null;

    return this;
};

/*
 * @description Finish a task workflow declare and prepare to declare another one.
 *  If a new task workflow has started (task() been called), pend() will be call firstly automatically.
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

/*
 * @description Define a method which will call when all tasks done.
 * @public
 * @return null
 * @useage:
 * TaskMgr().task('foo').step('foo').finish(handle)
 * var task = TaskMgr().task('foo').step('foo'); task.finish = handle;
 */
Object.defineProperty(_proto, 'finish', {
    get: function() {
        return function(handle) {
            if(!util._.isFunction(handle)) throw new Error('The param `handle` should be a function.');
            this._finishHandle = handle;

            return this;
        };
    },
    set: function(handle) {
        if(!util._.isFunction(handle)) throw new Error('The param `handle` should be a function.');
        this._finishHandle = handle;

        return this;
    }
});

/*
 * @description Define error handle for one task.
 * @public
 * @return this
 * @useage:
 * TaskMgr().task('foo').step('foo').error(errHandle);
 * var myTask = TaskMgr().task('foo').step('foo'); myTask.error = errHandle;
 */
Object.defineProperty(_proto, 'error', {
    get: function() {
        return function(handle) {
            if('function' !== typeof handle) throw new Error('The param `handle` should be a function.');

            // rewrite _errorHandle
            if(this._currTask) this._currTask._errorHandle = handle;
            else this._errorHandle = handle;

            return this;
        };
    },
    set: function(handle) {
        if('function' !== typeof handle) throw new Error('The param `handle` should be a function.');

        // rewrite _errorHandle
        if(this._currTask) this._currTask._errorHandle = handle;
        else this._errorHandle = handle;

        return this;
    }
});

// Define the default error handle for TaskMgr instance.
_proto._errorHandle = function(err) {
    if(!(err instanceof Error)) throw new Error(err.toString());
    else throw err;
};

// _proto.timeout = function(handle, timeout) {
//     if(this._currTask) this._currTask._timeoutHandle = handle;
//     else this._timeoutHandle = handle;

//     return this;
// };

/*
 * This method will make the task sequences running by the order customed.
 * The type of params can be String or Array.
 */
_proto.run = function(n1, n2, n3, n4) {
    if(this._currTask) this.pend();

    var root = this;
    var tasks = root._taskSequences;
    var args = util.slice(arguments, 0);
    var isString = util._.isString;
    var isArray = util._.isArray;
    var isNumber = util._.isNumber;
    var isUndefined = util._.isUndefined;
    var isFunction = util._.isFunction;
    var find = function(key) {
        var type = typeof(key);

        return isString(key) ?
            util._.find(tasks, function(task) {return task._taskName === key;}) :
            isNumber(key) ?
                tasks[key] :
                null;
    };
    var each = util._.each;
    var index = 0;
    var arr = args.length ? args : util._.range(tasks.length);
    var handle = function(err) {
        if(err) {
            this.emit('error', err);
        } else {
            var next = arr[++index];
            var task;

            if(isUndefined(next)) {
                if(this._debug) console.log('All tasks finished, took %d ms.', Date.now() - time);
                if(isFunction(root._finishHandle)) root._finishHandle(root._results);
            } else if(isArray(next)) {
                parallel(index);
            } else {
                task = find(next);
                if(!task) throw new Error('Task has not registed.');
                task.on('done', task._doneHandle = handle);
                task.on('error', task._errorHandle || root._errorHandle.bind(task));
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
            task._doneHandle = function(err) {
                if(err) {
                    handle.call(this, err);
                } else {
                    if(++count >= taskArr.length) {
                        handle.apply(this, arguments);
                    }
                }
            };
            task.on('done', task._doneHandle);
            task.on('error', task._errorHandle || root._errorHandle.bind(task));
            task._run();
        });
    };

    // for consuming statistics
    if(this._debug) var time = Date.now();

    // Tasks will be executed by the order they declared if not customed order accessed.
    parallel();
};
