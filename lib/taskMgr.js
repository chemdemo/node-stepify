'use strict';

var nutil = require('util');
var EventEmitter = require('event').EventEmitter;
var util = require('./util');

var Task = require('./Task');
var UNAME_TASK = '_UNAME_TASK_';
var UNAME_STEP = '_UNAME_STEP_';
var noop = util._.noop;

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
    this._insetNames = ['register', 'assign', 'step', 'pend', 'error', 'timeout', 'finish', 'run'];

    // Optional, will called when all registered tasks done.
    this._finishHandler = finish || null;

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
    }
});

/*
 * Register(or assign) a task.
 * @public
 * @param taskName {String} optional
 * @return this
 * @useage:
 * TaskMgr().register('foo')
 * TaskMgr().assign('bar')
 */
_proto.register = _proto.assign = function(taskName) {
    if(this._currTask) this.pend();

    var index = this._taskSequences.length;
    var task;

    taskName = taskName && typeof taskName === 'string' ? taskName : UNAME_TASK + index;
    task = new Task(taskName);

    task._index = index;
    task._debug = this._debug;

    if(this._debug) console.log('Register task: ', taskName, ' done.');

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
 * TaskMgr().register('foo').step('bar', handler[, *args]).step(handler)
 * TaskMgr().register('foo').step('bar').bar(handler[, *args])
 */
_proto.step = function(stepName, stepHandler) {
    if(!this._currTask) throw new Error('The task for this step has not declared, \
        just call .register() or .assign() before .step()');
    if(!arguments.length) throw new Error('Step handler should be accessed.');

    var args = util.slice(arguments, 0);
    var stepName = args.shift();
    var _name;
    var stepHandler;
    var step;

    if('function' === typeof stepName) {
        stepHandler = stepName;
        _name = stepName = UNAME_STEP + this._currTask._steps.length;
    }

    if('string' === typeof stepName) {
        if(util._.find(this._insetNames, function(name) {return name === stepName})) {
            throw new Error('The name ' + stepName + ' was preset within the construtor, try another one?');
        }

        stepHandler = args.shift();
    }

    step = this._currTask._assign(stepName, stepHandler);
    step._preArgs = args;

    if(!stepHandler &&
        stepName !== _name &&
        !util._.find(this._stepNames, function(name) {return name === stepName}
    )) {
        // Modify the prototype chain dynamically,
        // add a method as `step._stepHandler` which has the same name as `step.stepName`
        // useage:
        // TaskMgr().register('foo').step('bar').bar(handler[, *args])
        // var task = TaskMgr().register('foo').step('bar'); task.bar = handler;
        Object.defineProperty(_proto, stepName, {
            get: function() {
                return function(handler) {
                    if(typeof handler !== function) throw new Error('Step handler should be a function.');

                    step._preArgs = util.slice(arguments, 1);
                    step._stepHandler = handler;

                    return this;
                };
            },
            set: function(handler) {
                if(typeof handler !== function) throw new Error('Step handler should be a function.');

                step._stepHandler = handler;

                return this;
            }
        });

        this._stepNames.push(stepName);
    }

    if(stepHandler && 'function' === typeof stepHandler) {
        // step._stepHandler = stepHandler.bind(step);
        step._stepHandler = stepHandler;
    }

    return this;
};

/*
 * Finish a task workflow declare and prepare to declare another one.
 * If a new task workflow has started (register() been called), pend() will be call firstly automatically.
 * @public
 * @return this
 * @useage:
 * TaskMgr().register('foo').step('bar').pend().register('biz')
 */
_proto.pend = function() {
    var task = this._currTask;

    if(task) {
        if(!task._errHandler) task._errHandler = this._errHandler;
        // if(!task._timeoutHandler) currTask._timeoutHandler = this._timeoutHandler;

        // task.on('done', this._doneHandler);
        // task.on('done', task._doneHandler || this._finishHandler);
        task._doneHandler = this._doneHandler;
        // task.on('error', task._errHandler || this._errHandler);
        task._errHandler = task._errHandler || this._errHandler;
        // task.on('timeout', task._timeoutHandler || this._timeoutHandler);

        this._taskSequences.push(task);
    }

    this._currTask = null;

    return this;
};

/*
 * Define a method which will call when all tasks done.
 * @public
 * @return null
 * @useage:
 * TaskMgr().register('foo').step('foo').finish(handler)
 * var task = TaskMgr().register('foo').step('foo'); task.finish = handler;
 */
var _finishHandler = function(handler) {
    if(!util._.isFunction(handler)) throw new Error('The param `handler` should be a function.');

    this._finishHandler = handler;
};

Object.defineProperty(_proto, 'finish', {
    get: function() {
        return _finishHandler.bind(this);
    },
    set: _finishHandler.bind(this);
});

/*
 * Define error handler.
 * @public
 * @return this
 * @useage:
 * TaskMgr().register('foo').step('foo').error(handler)
 * var task = TaskMgr().register('foo').step('foo'); task.error = handler;
 */
var _errorHandler = function(handler) {
    if('function' !== typeof handler) throw new Error('The param `handler` should be a function.');

    // rewrite _errHandler
    if(this._currTask) this._currTask._errHandler = handler;
    else this._errHandler = handler;

    return this;
};

Object.defineProperty(_proto, 'error', {
    get: function() {
        return _errorHandler.bind(this);
    },
    set: _errorHandler.bind(this);
});

// Define the default error handler for TaskMgr instance.
Object.defineProperty(_proto, '_errHandler', {
    get: function() {
        return function(err, step) {
            if(!(err instanceof Error)) err = err.toString();
            throw new Error(err);
        };
    }
});

// _proto.timeout = function(handler, timeout) {
//     if(this._currTask) this._currTask._timeoutHandler = handler;
//     else this._timeoutHandler = handler;

//     return this;
// };

// Define the default done handler for TaskMgr instance.
Object.defineProperty(_proto, '_doneHandler', {
    get: function() {
        return function(err) {
            var task = this._currTask;
            var index = task._index;

            if(err) {
                task.emit('error', err);
            } else {
                if(index < this._taskSequences.length) {
                    this._taskSequences[++index]._run();
                } else {
                    if(this._debug) console.log('All tasks finished!');

                    this._finishHandler && this._finishHandler();

                    return;
                }
            }
        };
    }
});

/*
 * This method will make the task sequences running by the order customed.
 * The type of params can be String or Array,
 */
_proto.run = function(n1, [n2, n3], n4) {
    var root = this;
    var args = util.slice(arguments, 0);
    var length = args.length;
    var isString = util._.isString;
    var isArray = util._.isArray;
    var isNumber = util._.isNumber;
    var isUndefined = util._.isUndefined;
    var find = function(key) {
        var tasks = root._taskSequences;
        
        return key.match(/string|number/) ? 
            util._.find(root._taskSequences, function(task, i) {
                return key === (isString(type) ? task.taskName : i);
            })
            : null;
    };

    // Tasks will be executed by the order they declared if not customed order accessed.
    if(!length) {
        this._currTask = this._taskSequences[0];
        this._currTask._run();
    } else {
        util._.each(args, function(arg, i) {
            var task = find(arg);
            if(!task) throw new Error('Task has not registered.');
            task._doneHandler = isUndefined(args[i+1]) ? 
                root._finishHandler : 
                function() {
                    return isArray(args[i+1]) ? 
                        function() {
                            util.each(args[i+1], function(t) {
                                t._run();
                            });
                        } : 
                        root._doneHandler;
                }();
        });
    }
};
