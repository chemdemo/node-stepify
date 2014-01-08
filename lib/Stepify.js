/*!
 * node-stepify - Stepify.js
 * Copyright(c) 2013 dmyang <yangdemo@gmail.com>
 * MIT Licensed
 */

'use strict';

var nutil = require('util');
var util = require('./util');

var Task = require('./Task');
var UNAMED_TASK = '_UNAMED_TASK_';
var UNAMED_STEP = '_UNAMED_STEP_';

/*
 * @description Define the `Stepify` Class aims to manage numbers of `Task` instances.
 * @public
 * @param [Function] result optional
 * @return this
 * @usage:
 * var myTask = new Stepify([handle]);
 * var myTask = Stepify([handle]);
 */
var Stepify = module.exports = function(result) {
    // Both `new Stepify()` and `Stepify()` are supported.
    if(!(this instanceof Stepify)) return new Stepify(result);

    var args = util.slice(arguments, 0);

    result = args[0] && 'function' === typeof args[0] ? args[0] : null;

    this._debug = false;
    this._taskSequences = [];
    this._currTask = null;
    this._handles = {};
    this._results = [];

    // Library insert keys, the stepName(the first string parame of `step` method) should not be one of them.
    this._insetNames = ['debug', 'task', 'step', 'pend', 'error', 'timeout', 'result', 'run'];

    // The methods extend by user when defining workflow using step(stepName)
    this._definedNames = [];

    // Optional, will called when all tasked tasks done.
    if(util.isFunction(result)) this._finishHandle = result;

    return this;
};
var _proto = Stepify.prototype;

/*
 * @description Switch `this._debug` between true or false dynamically.
 * @public
 * @param debug {Mix} canbe Boolean or Function.
 * @return this
 * @usage:
 * Stepify()...debug([true, false])
 * Stepify()...debug(function() {return true;}[, args])
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
 * @usage:
 * Stepify().task('foo')
 */
Object.defineProperty(_proto, 'task', {
    // No need to rewrite this method
    writable: false,
    value: function(taskName) {
        if(this._currTask) this.pend();

        var root = this;
        var index = this._taskSequences.length;
        var task;

        taskName = taskName && typeof taskName === 'string' ? taskName : UNAMED_TASK + index;
        task = new Task(taskName, this);

        task._index = index;
        task._debug = this._debug;

        if(this._debug) {console.log('Task: %s added.', taskName);}

        this._currTask = task;

        return this;
    }
});

/*
 * @description Add a asynchronous method to current task.
 * @public
 * @param stepName {String} the name of this step
 * @param stepHandle {Function} optional step handle method
 * @param args {Mix} optional the data access to stepHandle
 * @return this
 * @usage:
 * Stepify().task('foo').step('bar', handle[, *args]).step(handle)
 * Stepify().task('foo').step('bar').bar(handle[, *args])
 */
Object.defineProperty(_proto, 'step', {
    writable: false,
    value: function(stepName, stepHandle) {
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
        var isFunction = util.isFunction;

        if(isFunction(stepName)) {
            stepHandle = stepName;
            _name = stepName = UNAMED_STEP + currTask._steps.length;
        } else {
            if(find(this._insetNames, function(name) {return name === stepName})) {
                throw new Error('The name `' + stepName + '` was preset within the construtor, try another one?');
            }

            stepHandle = isFunction(args[0]) ? args.shift() : null;
        }

        step = currTask._step(stepName, stepHandle, args);

        if(!stepHandle
            && stepName !== _name
            && !find(this._definedNames, function(n) {return n === stepName;})
            // can not be rewrite
            // && !isFunction(currTask._handles[stepName])
            // && !isFunction(this._handles[stepName])
        ) {
            // Modify the prototype chain dynamically,
            // add a method as `step._stepHandle` which has the same name as `step.name`
            // usage:
            // Stepify().task('foo').step('bar').bar(handle[, *args])
            // var task = Stepify().task('foo').step('bar'); task.bar = handle;
            var _stepHandle = function(handle) {
                if(typeof handle !== 'function') throw new Error('Step handle should be a function.');

                if(this._currTask) {
                    this._currTask._handles[stepName] = handle;
                } else {
                    this._handles[stepName] = handle;
                }

                return this;
            };

            Object.defineProperty(_proto, stepName, {
                // if not set configurable,
                // _proto[stepName] can not be released after workflow finish
                // see run() method
                configurable: true,
                get: function() {
                    return _stepHandle.bind(this);
                },
                set: _stepHandle.bind(this)
            });

            this._definedNames.push(stepName);
        }

        if(isFunction(stepHandle)) {
            step._task._handles[stepName] = stepHandle;
        }

        _name = null;

        return this;
    }
});

/*
 * @description Finish a task workflow declare and prepare to declare another one.
 *  If a new task workflow has started (task() been called), pend() will be call firstly automatically.
 * @public
 * @return this
 * @usage:
 * Stepify().task('foo').step('bar').pend().task('biz')
 */
Object.defineProperty(_proto, 'pend', {
    writable: false,
    value: function() {
        var task = this._currTask;

        if(task) {
            this._taskSequences.push(task);
            this._currTask = task = null;
        }

        return this;
    }
});

/*
 * @description Define a method which will call when all tasks done.
 * @public
 * @return null
 * @usage:
 * Stepify().task('foo').step('foo').result(handle)
 * var task = Stepify().task('foo').step('foo'); task.result = handle;
 */
Object.defineProperty(_proto, 'result', {
    get: function() {
        return function(handle) {
            if(!util.isFunction(handle)) throw new Error('The param `handle` should be a function.');
            this._finishHandle = handle;

            return this;
        };
    },
    set: function(handle) {
        if(!util.isFunction(handle)) throw new Error('The param `handle` should be a function.');
        this._finishHandle = handle;

        return this;
    }
});

/*
 * @description Define error handle for one task.
 * @public
 * @return this
 * @usage:
 * Stepify().task('foo').step('foo').error(errHandle);
 * var myTask = Stepify().task('foo').step('foo'); myTask.error = errHandle;
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

// Define the default error handle for Stepify instance.
_proto._errorHandle = function(err) {
    if(!(err instanceof Error)) throw new Error(err.toString());
    else throw err;
};

/*
 * This method will make the task sequences running by the order customed.
 * The type of params can be String or Array.
 * The tasks in array param will be executed parallel.
 * usage:
 * run()
 * run('task1', 'task3', 'task4', 'task2')
 * run('task1', ['task3', 'task4'], 'task2')
 * run(['task1', 'task3', 'task4'], 'task2')
 * run(['task1', 'task3', 'task4', 'task2'])
 */
Object.defineProperty(_proto, 'run', {
    writable: false,
    value: function() {
        if(this._currTask) this.pend();

        var root = this;
        var tasks = root._taskSequences;
        var args = util.slice(arguments, 0);
        var isString = util.isString;
        var isArray = util.isArray;
        var isNumber = util.isNumber;
        var isUndefined = util.isUndefined;
        var isFunction = util.isFunction;
        var find = function(key) {
            var type = typeof(key);

            return isString(key) ?
                util._.find(tasks, function(task) {return task._name === key;}) :
                isNumber(key) ?
                    tasks[key] :
                    null;
        };
        var each = util._.each;
        var index = 0;
        var arr = args.length ? args : util._.range(tasks.length);
        var finishHandle = isFunction(this._finishHandle) ? util.once(this._finishHandle) : null;
        var errHandleWrap = function(err) {
            // bind context to current step
            var step = this._getStep(this._currIndex);
            var handle = isFunction(this._errorHandle) ? this._errorHandle : root._errorHandle;

            if(!step) throw new Error('Step was not found in task ' + task._name + '.');

            handle.call(step, err);
        };
        var handle = function(err) {
            if(err) {
                this.emit('error', err);
            } else {
                var next = arr[++index];
                var task;
                var step;

                if(isUndefined(next)) {
                    if(this._debug) console.timeEnd('Tasks finished and cast');
                    finishHandle && finishHandle(root._results);

                    // Release all the extended properties on Stepify.prototype
                    each(root._definedNames, function(prop) {delete _proto[prop];});
                } else if(isArray(next)) {
                    execEach(index);
                } else {
                    task = find(next);
                    step = task._getStep(task._currIndex);
                    if(!task) throw new Error('Task has not registered.');
                    task.on('done', task._doneHandle = handle.bind(task));
                    task.on('error', errHandleWrap.bind(task));
                    if(root._debug) console.log('Start to run task: %s.', task._name);
                    task._run();
                }
            }
        };
        var execEach = function(n) {
            n = n || 0;

            var taskArr = isArray(arr[n]) ? arr[n] : [arr[n]];
            var count = 0;
            var task;

            each(taskArr, function(key) {
                task = find(key);
                if(!task) throw new Error('Task has not registered.');
                task._doneHandle = function(err) {
                    if(err || ++count >= taskArr.length) {
                        handle.apply(task, arguments);
                    }
                };
                task.on('done', task._doneHandle.bind(task));
                task.on('error', errHandleWrap.bind(task));
                if(root._debug) console.log('Start to run task: %s.', task._name);
                task._run();
            });
        };

        // for consuming statistics
        if(this._debug) console.time('Tasks finished and cast');

        // Tasks will be executed by the order they declared if not customed order accessed.
        execEach();
    }
});
