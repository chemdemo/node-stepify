var assert = require('assert');
var should = require('should');

var Stepify = require('../index');

// for test...
var fs = require('fs');
var path = require('path');
var exec = require('child_process').exec;

describe('Stepify', function() {
    describe('#constructor', function() {
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
                        fs.readFile(__filename, this.done);
                    })
                .finish(function() {
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
                    fs.readFile(__filename, this.done);
                })
                .finish(function() {
                    done(null);
                })
                .run();
        });

        it('should work well when multiply tasks were added', function(done) {
            Stepify()
                .task('task1')
                    .step(function() {
                        fs.readFile(__filename, this.done);
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
                        fs.readFile(__filename, this.done);
                    })
                .finish(function() {
                    done(null);
                })
                .run();
        });
    });

    describe('#step()', function() {
        it('should throw error if nothing has been accessed to step()', function() {
            Stepify().step().should.throw('Step handle should be accessed.');
        });

        it('should throw error if the accessed `stepName` was preset within the construtor', function() {
            var inserts = ['debug', 'task', 'step', 'pend', 'error', 'timeout', 'finish', 'run'];
            var name = inserts[Math.floor(Math.random()*inserts.length)];
            Stepify().step(name).should.throw('The name `' + name + '` was preset within the construtor, \
                try another one?');
        });

        it('should execute without error even if `stepName` \
            param has not accessed into step() method', function(done) {
            Stepify()
                .step(function() {
                    this._stepName.should.equal('_UNAMED_STEP_0');
                })
                .step('foo', function() {
                    this._stepName.should.equal('foo');
                })
                .step(function() {
                    this._stepName.should.equal('_UNAMED_STEP_2');
                })
                .finish(function() {
                    done(null);
                })
                .run();
        });

        it('should execute without error even if stepHandle defined \
            after `step(stepName)` called', function(done) {
            Stepify()
                .step('foo')
                .foo(function() {
                    var root = this;
                    setTimeout(function() {
                        root.done(null, n);
                    }, 200);
                })
                .finish(function() {
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
            .finish(function() {
                steps.should.have.length(4);
                steps.should.eql(['step1', 'step2', 'ster3', 'step4']);
                done(null);
            })
            run();
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
                .task2()
                    .step('task2_step1', function() {
                        n++;
                        fs.exists(__dirname, this.done);
                    })
                    .step('task2_step2', function() {
                        n++;
                        fs.stat(__dirname, this.done);
                    })
                .finish(function() {
                    n.should.equal(4);
                    done(null);
                })
                .run();
        });

        it('should support common stepHandle which defined after task pended\
            when multiply tasks added', function(done) {
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
                .finish(function() {
                    fileStr.should.have.length(2);
                    fileStr[0].should.equal(testStr);
                    fileStr[1].should.equal(indexStr);
                    statCount.should.equal(2);
                    timerArr.should.eql([200, 100]).have.length(2);
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
                .finish(function() {
                    done(null);
                })
                .run();
        });

        it('should be a multiply workflow after using `pend()` to split steps', function() {
            var taskNames = [];
            Stepify()
                .step(function() {
                    var name = this._task._taskName;
                    var root = this;
                    setTimeout(function() {
                        if(taskNames.indexOf(_taskName) !== -1) {
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
                        if(taskNames.indexOf(_taskName) !== -1) {
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
                        if(taskNames.indexOf(_taskName) !== -1) {
                            taskNames.push(name);
                        }
                        root.done(null);
                    });
                })
                .finish(function() {
                    taskNames.should.have.length(2);
                    taskNames[0].should.not.equal(taskNames[1]);
                    done(null);
                })
                .run();
        });
    });

    describe('#error()', function() {
        describe('use default errorHandle case', function() {
            var count = 0;

            it('should simplily throw error if error method has not defined for task', function(done) {
                (function() {
                    Stepify()
                        .setp(function() {
                            var root = this;
                            setTimeout(function() {
                                count++;
                                root.done(null);
                            }, 200);
                        })
                        .step(function() {
                            var root = this;
                            setTimeout(function() {
                                count++;
                                done(null);
                                root.done('There sth error.');
                            }, 100);
                        })
                        .step(function() {
                            var root = this;
                            setTimeout(function() {
                                count++;
                                root.done(null);
                            }, 300);
                        })
                        .run();
                }()).should.throw('There sth error.');
            });

            after(function() {
                count.should.equal(2);
            });
        });

        it('should access error to `error()` method witch defined manually', function(done) {
            var count = 0;
            var flag = 0;
            Stepify()
                .setp(function() {
                    var root = this;
                    setTimeout(function() {
                        count++;
                        root.done(null);
                    }, 200);
                })
                .step(function() {
                    var root = this;
                    setTimeout(function() {
                        count++;
                        root.done('There sth error.');
                    }, 100);
                })
                .setp(function() {
                    var root = this;
                    setTimeout(function() {
                        count++;
                        root.done(null);
                    }, 300);
                })
                .error(function(err) {
                    flag++;
                    err.should.equal('There sth error.');
                    count.should.equal(2);
                    // flag.should.equal(1);
                    done(null);
                })
                .run();

            after(function() {
                // Is `after()` can be used after `it()` called ?
                flag.should.equal(1);
            });
        });

        describe('multiply tasks and add errorHandle manually for some tasks case', function() {
            var count = 0;

            it('all tasks stop executing immediate error occured', function(done) {
                (function() {
                    Stepify()
                        .task('foo')
                            .step(function() {
                                var root = this;
                                setTimeout(function() {
                                    count++;
                                    root.done(null);
                                }, 300);
                            })
                            .step(function() {
                                var root = this;
                                fs.readFile(path.join(__dirname, 'not_exist.js'), function(err) {
                                    count++;
                                    if(err) err = 'The file not_exist.js was not found.';
                                    root.done(err);
                                });
                            })
                            .error(function(err) {
                                err.should.equal('The file not_exist.js was not found.');
                            })
                        .pend()
                        .task('bar')
                            .step(function() {
                                var root = this;
                                setTimeout(function() {
                                    count++;
                                    root.done(null);
                                }, 300);
                            })
                            .step(function() {
                                var root = this;
                                setTimeout(function() {
                                    count++;
                                    root.done('should not executed ever.');
                                }, 100);
                            })
                        .run()
                }).should.throw('not_exist.js was not found.');
            });

            after(function() {
                count.should.equal(2);
            });
        });
    });

    describe('#finish()', function() {
        it('finish() should execute after all tasks finish without error', function(done) {
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
                            root.done(null);
                        });
                    })
                .finish(function(result) {
                    result.should.eql([100, fs.readFileSync(__filename).toString()]);
                    flag = 1;
                })
                .run();
        });

        it('finishHandle can be accessed as the first param of `Stepify()`', function(done) {
            var flag = 0;
            var finishHandle = function(result) {
                result.should.eql([100, fs.readFileSync(__filename).toString()]);
                flag = 1;
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
        describe('executing tasks by the order the tasks was defined', function() {
            var a = [];

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
                        fs.readFile(__filename, this.done);
                    })
                    .task()
                        .step('readFile', function() {
                            fs.readFile(__filename, this.done);
                        })
                        .step('timer', 300)
                    .timer(function(timeout) {
                        a.push(timeout);
                        var root = this;
                        setTimeout(function() {
                            root.done(null);
                        }, timeout);
                    })
                    .finish(function() {
                        done(null);
                    })
                    .run();
            });

            after(function() {
                a.should.have.length(2);
                a[0].should.equal(200);
                a[2].should.equal(300);
            });
        });

        describe('executing tasks by the order customized', function() {
            it('should execute without error when ordering with task name', function(done) {
                Stepify()
                    .task('task1')
                        .step(function() {
                            var root = this;
                            fs.readdir(__dirname, function(err) {
                                if(err) throw err;
                                root.fulfill(root._taskName + '.step1');
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
                                root.fulfill(root._taskName + '.step2');
                                root.done(null);
                            }, 300);
                        })
                        .step('exec', 'ls', '-l')
                    .task('task3')
                        .step('readFile', __filename)
                        .step('timer', function() {
                            var root = this;
                            setTimeout(function() {
                                root.fulfill(root._taskName + '.step2');
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
                    .sleep(function() {
                        var root = this;
                        setTimeout(function() {
                            root.fulfill(root._task._taskName + '.sleep');
                            root.done(null);
                        }, 200);
                    })
                    .exec(function(cmd) {
                        cmd = [].slice.call(cmd, 0);
                        var root = this;
                        exec(cmd.join(' '), function(err) {
                            if(err) throw err;
                            root.fulfill('exec.' + cmd.join('.'));
                            root.done(null);
                        });
                    })
                    .finish(function(r) {
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
                                root.fulfill(root._taskName + '.step1');
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
                                root.fulfill(root._taskName + '.step2');
                                root.done(null);
                            }, 300);
                        })
                        .step('exec', 'ls', '-l')
                    .task()
                        .step('readFile', __filename)
                        .step('timer', function() {
                            var root = this;
                            setTimeout(function() {
                                root.fulfill(root._taskName + '.step2');
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
                    .sleep(function() {
                        var root = this;
                        setTimeout(function() {
                            root.fulfill(root._task._taskName + '.sleep');
                            root.done(null);
                        }, 200);
                    })
                    .exec(function(cmd) {
                        cmd = [].slice.call(cmd, 0);
                        var root = this;
                        exec(cmd.join(' '), function(err) {
                            if(err) throw err;
                            root.fulfill('exec.' + cmd.join('.'));
                            root.done(null);
                        });
                    })
                    .finish(function(r) {
                        r.should.eql([
                            'task1.step1', 'task1.sleep', 'exec.cat.' + __filename,
                            'readFile.' + __filename, 'task3.step2', 'task3.sleep',
                            'task2.sleep', 'task2.step2', 'exec.ls.-l'
                        ]);
                        done(null);
                    })
                    .run(0, 2, 1);
            });

            it('should execute without error when ', function(done) {
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
                        .step(function() {
                            var root = this;
                            fs.readFile(p, function(err) {
                                if(err) throw err;
                                root.done(null);
                            });
                        })
                    .sleep(function() {
                        var root = this;
                        setTimeout(function() {
                            root.done(null);
                        }, 200);
                    })
                    .exec(function(cmd) {
                        cmd = [].slice.call(cmd, 0);
                        var root = this;
                        exec(cmd.join(' '), function(err) {
                            if(err) throw err;
                            root.done(null);
                        });
                    })
                    .finish(function(r) {
                        done(null);
                    })
                    .run('task1', ['task4', 'task3'], 'task2');
            });
        });
    });
});
