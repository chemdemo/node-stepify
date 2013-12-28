var assert = require('assert');
var should = require('should');

var Stepify = require('../index');

// for test...
var fs = require('fs');
var path = require('path');
var exec = require('child_process').exec;
var domain = require('domain');

describe('Stepify', function() {
    describe('#Stepify()', function() {
        it('should get an instanceOf Stepify with new', function() {
            var myTask = new Stepify();
            myTask.should.be.an.instanceOf(Stepify);
        });

        it('should get an instanceOf Stepify without new', function() {
            var myTask = Stepify();
            myTask.should.be.an.instanceOf(Stepify);
        });
    });

    describe('#debug()', function() {
        var myTask = Stepify();

        it('should be set to "false" by default', function() {
            myTask._debug.should.equal(false);
        });

        it('should be reset to "true"', function() {
            myTask.debug(true);
            myTask._debug.should.equal(true);
        });
    });

    describe('#task()', function() {
        it('shoule executed without error', function(done) {
            Stepify()
                .task('foo')
                    .step('setTimeout', function() {
                        var root = this;
                        setTimeout(function() {
                            root.done(null, 'foo ok');
                        }, 300);
                    })
                    .step('readFile', function(str) {
                        fs.readFile(__filename, this.done.bind(this));
                    })
                .result(function() {
                    done(null);
                })
                .run();
        });

        it('shoule executed without error even if \
            the task() method has not explicitly called', function(done) {
            Stepify()
                .step('setTimeout', function() {
                    this._task._taskName.should.equal('_UNAMED_TASK_0');
                    var root = this;
                    setTimeout(function() {
                        root.done(null, 'foo ok');
                    }, 300);
                })
                .step('readFile', function(str) {
                    fs.readFile(__filename, this.done.bind(this));
                })
                .result(function() {
                    done(null);
                })
                .run();
        });

        it('should work well when multiply tasks were added', function(done) {
            Stepify()
                .task('task1')
                    .step(function() {
                        fs.readFile(__filename, this.done.bind(this));
                    })
                    .step('timer')
                    .timer(function() {
                        var root = this;
                        setTimeout(function() {
                            root.done(null);
                        }, 100);
                    })
                .task('task2')
                    .step('foo', function() {
                        var root = this;
                        setTimeout(function() {
                            root.done(null);
                        }, 100);
                    })
                    .step(function() {
                        fs.readFile(__filename, this.done.bind(this));
                    })
                .result(function() {
                    done(null);
                })
                .run();
        });
    });

    describe('#step()', function() {
        it('should throw error if nothing has been accessed to step()', function() {
            (function() {
                Stepify()
                    .step()
                    .run();
            }).should.throw('Step handle should be accessed.');
        });

        it('should throw error if the accessed `stepName` was preset within the construtor', function() {
            var inserts = ['debug', 'task', 'step', 'pend', 'error', 'timeout', 'finish', 'run'];
            var name = inserts[Math.floor(Math.random()*inserts.length)];
            (function() {
                Stepify()
                    .step(name)
                    .run();
            }).should.throw('The name `' + name + '` was preset within the construtor, try another one?');
        });

        it('should execute without error even if `stepName` param has not accessed into step() method', function(done) {
            Stepify()
                .step(function() {
                    this._stepName.should.equal('_UNAMED_STEP_0');
                    var root = this;
                    setTimeout(function() {
                        root.done(null);
                    }, 100);
                })
                .step('foo', function() {
                    this._stepName.should.equal('foo');
                    var root = this;
                    setTimeout(function() {
                        root.done(null);
                    }, 200);
                })
                .step(function() {
                    this._stepName.should.equal('_UNAMED_STEP_2');
                    var root = this;
                    setTimeout(function() {
                        root.done(null);
                    }, 120);
                })
                .result(function() {
                    done(null);
                })
                .run();
        });

        it('should execute without error even if stepHandle defined after `step(stepName)` called', function(done) {
            Stepify()
                .step('foo', 123)
                .foo(function(n) {
                    var root = this;
                    setTimeout(function() {
                        root.done(null, n);
                    }, 200);
                })
                .step(function(n) {
                    n.should.equal(123);
                    this.done(null);
                })
                .result(function() {
                    done(null);
                })
                .run();
        });

        it('should support multiply steps to be added', function(done) {
            var steps = [];
            Stepify()
                .step(function() {
                    var root = this;
                    setTimeout(function() {
                        steps.push('step1');
                        root.done(null);
                    }, 200);
                })
                .step(function() {
                    var root = this;
                    setTimeout(function() {
                        steps.push('step2');
                        root.done(null);
                    }, 100);
                })
                .step('step3', function() {
                    var root = this;
                    setTimeout(function() {
                        steps.push('step3');
                        root.done(null);
                    }, 100);
                })
                .step('step4')
                .step4(function() {
                    var root = this;
                    setTimeout(function() {
                        steps.push('step4');
                        root.done(null);
                    }, 100);
                })
            .result(function() {
                steps.should.have.length(4);
                steps.should.eql(['step1', 'step2', 'step3', 'step4']);
                done(null);
            })
            .run();
        });

        it('should support multiply tasks and multiply steps to be added', function(done) {
            var n = 0;
            Stepify()
                .task('task1')
                    .step('task1_step1', function() {
                        n++;
                        var root = this;
                        setTimeout(function() {
                            root.done(null, n);
                        }, 200);
                    })
                    .step('task1_step2', function() {
                        n++;
                        var root = this;
                        setTimeout(function() {
                            root.done(null, n);
                        }, 200);
                    })
                .task()
                    .step('task2_step1', function() {
                        n++;
                        fs.readdir(__dirname, this.done.bind(this));
                    })
                    .step('task2_step2', function() {
                        n++;
                        fs.stat(__dirname, this.done.bind(this));
                    })
                .result(function() {
                    n.should.equal(4);
                    done(null);
                })
                .run();
        });

        it('should support common stepHandle which defined after task pended when multiply tasks added', function(done) {
            var testStr = fs.readFileSync(__filename).toString();
            var indexStr = fs.readFileSync(path.resolve(__dirname, '../index.js')).toString();

            var fileStr = [];
            var statCount = 0;
            var timerArr = [];

            Stepify()
                .task('t1')
                    .step('readFile', __filename)
                    .step('stat')
                    .step('timer')
                .task('t2')
                    .step('readFile', path.resolve(__dirname, '../index.js'))
                    .step('stat')
                    .step('timer')
                    .timer(function() {
                        var root = this;
                        setTimeout(function() {
                            timerArr.push(100);
                            root.done(null);
                        }, 100);
                    })
                .pend()
                .readFile(function(p) {
                    var root = this;
                    fs.readFile(p, function(err, str) {
                        if(err) throw err;
                        fileStr.push(str.toString());
                        root.done(null);
                    });
                })
                .stat(function() {
                    var root = this;
                    fs.stat(__dirname, function(err, stat) {
                        if(err) throw err;
                        statCount++;
                        root.done(null);
                    });
                })
                .timer(function() {
                    var root = this;
                    setTimeout(function() {
                        timerArr.push(200);
                        root.done(null);
                    }, 200);
                })
                .result(function() {
                    fileStr.should.have.length(2);
                    fileStr[0].should.equal(testStr);
                    fileStr[1].should.equal(indexStr);
                    statCount.should.equal(2);
                    timerArr.should.eql([200, 100]);
                    done(null);
                })
                .run();
        });
    });

    describe('#pend()', function() {
        it('should work well even if not called before `run()` method called', function(done) {
            Stepify()
                .step(function() {
                    var root = this;
                    setTimeout(function() {
                        root.done(null);
                    }, 100);
                })
                .step(function() {
                    var root = this;
                    setTimeout(function() {
                        root.done(null);
                    }, 200);
                })
                .result(function() {
                    done(null);
                })
                .run();
        });

        it('should be a multiply workflow after using `pend()` to split steps', function(done) {
            var taskNames = [];
            Stepify()
                .step(function() {
                    var name = this._task._taskName;
                    var root = this;
                    setTimeout(function() {
                        if(taskNames.indexOf(name) === -1) {
                            taskNames.push(name);
                        }
                        root.done(null);
                    }, 200);
                })
                .step(function() {
                    var name = this._task._taskName;
                    var root = this;
                    fs.readFile(__filename, function(err) {
                        if(err) throw err;
                        if(taskNames.indexOf(name) === -1) {
                            taskNames.push(name);
                        }
                        root.done(null);
                    });
                })
                .pend()
                .step(function() {
                    var name = this._task._taskName;
                    var root = this;
                    fs.stat(__dirname, function(err) {
                        if(err) throw err;
                        if(taskNames.indexOf(name) === -1) {
                            taskNames.push(name);
                        }
                        root.done(null);
                    });
                })
                .result(function() {
                    taskNames.should.have.length(2);
                    taskNames[0].should.not.equal(taskNames[1]);
                    done();
                })
                .run();
        });
    });

    describe('#error()', function() {
        var c1 = 0, c2 = 0, c3 = 0;
        var d = domain.create();

        describe('use default errorHandle case', function() {
            it('should simplily throw error if error method has not defined for task', function(done) {
                var errHandle = function(err) {
                    err.message.should.equal('There sth error!');
                    done();
                    d.removeListener('error', errHandle);
                    // d.exit();
                };

                d.once('error', errHandle);

                d.intercept(function() {
                    Stepify()
                        .step(function() {
                            var root = this;
                            setTimeout(function() {
                                c1++;
                                root.done(null);
                            }, 200);
                        })
                        .step(function() {
                            var root = this;
                            setTimeout(function() {
                                c1++;
                                root.done('There sth error!');
                            }, 100);
                        })
                        .step(function() {
                            var root = this;
                            setTimeout(function() {
                                c1++;
                                root.done(null);
                            }, 300);
                        })
                        .run();
                })();
            });
        });

        describe('use customed errorHandle case', function() {
            it('should access error to `error()` method witch defined manually', function(done) {
                Stepify()
                    .step(function() {
                        var root = this;
                        setTimeout(function() {
                            c2++;
                            root.done(null);
                        }, 200);
                    })
                    .step(function() {
                        var root = this;
                        setTimeout(function() {
                            c2++;
                            root.done('There sth error...');
                        }, 100);
                    })
                    .step(function() {
                        var root = this;
                        setTimeout(function() {
                            c2++;
                            root.done(null);
                        }, 300);
                    })
                    .error(function(err) {
                        err.should.equal('There sth error...');
                        c2.should.equal(2);
                        done();
                    })
                    .run();
            });
        });

        describe('use customed errorHandle and multiply tasks case', function() {
            it('should stop executing immediate error occured', function(done) {
                var errHandle = function(err) {
                    err.message.should.equal('The file not_exist.js was not found.');
                    done();
                    d.removeListener('error', errHandle);
                    // d.exit();
                };

                d.once('error', errHandle);

                d.intercept(function() {
                    Stepify()
                        .task('foo')
                            .step(function() {
                                var root = this;
                                setTimeout(function() {
                                    c3++;
                                    root.done(null);
                                }, 300);
                            })
                            .step(function() {
                                var root = this;
                                fs.readFile(path.join(__dirname, 'not_exist.js'), function(err) {
                                    c3++;
                                    if(err) err = 'The file not_exist.js was not found.';
                                    root.done(err);
                                });
                            })
                            .error(function(err) {
                                throw new Error('The file not_exist.js was not found.');
                            })
                        .pend()
                        .task('bar')
                            .step(function() {
                                var root = this;
                                setTimeout(function() {
                                    c3++;
                                    root.done(null);
                                }, 300);
                            })
                            .step(function() {
                                var root = this;
                                setTimeout(function() {
                                    c3++;
                                    root.done('should not executed ever.');
                                }, 100);
                            })
                        .run();
                })();
            });
        });
    });

    describe('#result()', function() {
        it('should execute after all tasks finish without error', function(done) {
            var flag = 0;

            Stepify()
                .task('foo')
                    .step(function() {
                        var root = this;
                        setTimeout(function() {
                            root.fulfill(100);
                            root.done(null);
                        }, 100);
                    })
                    .step(function() {
                        var root = this;
                        fs.readFile(__filename, function(err, str) {
                            if(err) return root.done(err);
                            str = str.toString();
                            root.fulfill(str);
                            root.done();
                        });
                    })
                .result(function(result) {
                    result.should.eql([100, fs.readFileSync(__filename).toString()]);
                    flag = 1;
                    done();
                })
                .run();
        });

        it('finishHandle can be accessed as the first param of `Stepify()`', function(done) {
            var flag = 0;
            var finishHandle = function(result) {
                result.should.eql([100, fs.readFileSync(__filename).toString()]);
                flag = 1;
                done(null);
            };

            Stepify(finishHandle)
                .task('foo')
                    .step(function() {
                        var root = this;
                        setTimeout(function() {
                            root.fulfill(100);
                            root.done(null);
                        }, 100);
                    })
                    .step(function() {
                        var root = this;
                        fs.readFile(__filename, function(err, str) {
                            if(err) return root.done(err);
                            str = str.toString();
                            root.fulfill(str);
                            root.done(null);
                        });
                    })
                .run();
        });
    });

    describe('#run()', function() {
        var a = [];

        describe('executing tasks by the order the tasks was defined', function() {
            it('should execute without error', function(done) {
                Stepify()
                    .step('timer', 200)
                    .step(function() {
                        var root = this;
                        setTimeout(function() {
                            root.done(null);
                        }, 100);
                    })
                    .step(function() {
                        fs.readFile(__filename, this.done.bind(this));
                    })
                    .task()
                        .step('readFile', function() {
                            fs.readFile(__filename, this.done.bind(this));
                        })
                        .step('timer', 300)
                    .pend()
                    .timer(function(timeout) {
                        a.push(timeout);
                        var root = this;
                        setTimeout(function() {
                            root.done(null);
                        }, timeout);
                    })
                    .result(function() {
                        done();
                    })
                    .run();
            });
        });

        after(function() {
            a.should.have.length(2);
            a[0].should.equal(200);
            a[1].should.equal(300);
        });

        describe('executing tasks by the order customized', function() {
            it('should execute without error when ordering with task name', function(done) {
                Stepify()
                    .task('task1')
                        .step(function() {
                            var root = this;
                            fs.readdir(__dirname, function(err) {
                                if(err) throw err;
                                root.fulfill(root._task._taskName + '.step1');
                                root.done(null);
                            });
                        })
                        .step('sleep')
                        .step('exec', 'cat', __filename)
                    .task('task2')
                        .step('sleep')
                        .step(function() {
                            var root = this;
                            setTimeout(function() {
                                root.fulfill(root._task._taskName + '.step2');
                                root.done(null);
                            }, 300);
                        })
                        .step('exec', 'ls', '-l')
                    .task('task3')
                        .step('readFile', __filename)
                        .step('timer', function() {
                            var root = this;
                            setTimeout(function() {
                                root.fulfill(root._task._taskName + '.step2');
                                root.done(null);
                            }, 300);
                        })
                        .step('sleep')
                        .readFile(function(p) {
                            var root = this;
                            fs.readFile(p, function(err) {
                                if(err) throw err;
                                root.fulfill('readFile.' + p);
                                root.done(null);
                            });
                        })
                    .pend()
                    .sleep(function() {
                        var root = this;
                        setTimeout(function() {
                            root.fulfill(root._task._taskName + '.sleep');
                            root.done(null);
                        }, 200);
                    })
                    .exec(function(cmd, args) {
                        cmd = [].slice.call(arguments, 0);
                        var root = this;
                        exec(cmd.join(' '), function(err) {
                            if(err) throw err;
                            root.fulfill('exec.' + cmd.join('.'));
                            root.done(null);
                        });
                    })
                    .result(function(r) {
                        r.should.eql([
                            'task1.step1', 'task1.sleep', 'exec.cat.' + __filename,
                            'readFile.' + __filename, 'task3.step2', 'task3.sleep',
                            'task2.sleep', 'task2.step2', 'exec.ls.-l'
                        ]);
                        done(null);
                    })
                    .run('task1', 'task3', 'task2');
            });

            it('should execute without error when ordering with task index', function(done) {
                Stepify()
                    .task()
                        .step(function() {
                            var root = this;
                            fs.readdir(__dirname, function(err) {
                                if(err) throw err;
                                root.fulfill(root._task._taskName + '.step1');
                                root.done(null);
                            });
                        })
                        .step('sleep')
                        .step('exec', 'cat', __filename)
                    .task()
                        .step('sleep')
                        .step(function() {
                            var root = this;
                            setTimeout(function() {
                                root.fulfill(root._task._taskName + '.step2');
                                root.done(null);
                            }, 300);
                        })
                        .step('exec', 'ls', '-l')
                    .task()
                        .step('readFile', __filename)
                        .step('timer', function() {
                            var root = this;
                            setTimeout(function() {
                                root.fulfill(root._task._taskName + '.step2');
                                root.done(null);
                            }, 300);
                        })
                        .step('sleep')
                        .readFile(function(p) {
                            var root = this;
                            fs.readFile(p, function(err) {
                                if(err) throw err;
                                root.fulfill('readFile.' + p);
                                root.done(null);
                            });
                        })
                    .pend()
                    .sleep(function() {
                        var root = this;
                        setTimeout(function() {
                            root.fulfill(root._task._taskName + '.sleep');
                            root.done(null);
                        }, 200);
                    })
                    .exec(function(cmd, args) {
                        cmd = [].slice.call(arguments, 0);
                        var root = this;
                        exec(cmd.join(' '), function(err) {
                            if(err) throw err;
                            root.fulfill('exec.' + cmd.join('.'));
                            root.done(null);
                        });
                    })
                    .result(function(r) {
                        r.should.eql([
                            '_UNAMED_TASK_0.step1', '_UNAMED_TASK_0.sleep', 'exec.cat.' + __filename,
                            'readFile.' + __filename, '_UNAMED_TASK_2.step2', '_UNAMED_TASK_2.sleep',
                            '_UNAMED_TASK_1.sleep', '_UNAMED_TASK_1.step2', 'exec.ls.-l'
                        ]);
                        done(null);
                    })
                    .run(0, 2, 1);
            });

            it('should execute without error when synchronous and asynchronous tasks mixed', function(done) {
                Stepify()
                    .task('task1')
                        .step(function() {
                            var root = this;
                            fs.readdir(__dirname, function(err) {
                                if(err) throw err;
                                root.done(null);
                            });
                        })
                        .step('sleep')
                        .step('exec', 'cat', __filename)
                    .task('task2')
                        .step('sleep')
                        .step(function() {
                            var root = this;
                            setTimeout(function() {
                                root.done(null);
                            }, 300);
                        })
                        .step('exec', 'ls', '-l')
                    .task('task3')
                        .step('readFile', __filename)
                        .step('timer', function() {
                            var root = this;
                            setTimeout(function() {
                                root.done(null);
                            }, 300);
                        })
                        .step('sleep')
                        .readFile(function(p) {
                            var root = this;
                            fs.readFile(p, function(err) {
                                if(err) throw err;
                                root.done(null);
                            });
                        })
                    .task('task4')
                        .step('sleep')
                        .step(function(p) {
                            var root = this;
                            fs.readFile(p, function(err) {
                                if(err) throw err;
                                root.done(null);
                            });
                        }, __filename)
                    .pend()
                    .sleep(function() {
                        var root = this;
                        setTimeout(function() {
                            root.done(null);
                        }, 200);
                    })
                    .exec(function(cmd, args) {
                        cmd = [].slice.call(arguments, 0);
                        var root = this;
                        exec(cmd.join(' '), function(err) {
                            if(err) throw err;
                            root.done(null);
                        });
                    })
                    .result(function(r) {
                        done(null);
                    })
                    .run('task1', ['task4', 'task3'], 'task2');
            });
        });
    });
});
