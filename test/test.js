var Stepify = require('../index');
var should = require('should');
var fs = require('fs');
var path = require('path');
var domain = require('domain');
var exec = require('child_process').exec;

describe('#error()', function() {
        var c1 = 0, c2 = 0, c3 = 0;

        describe('use default errorHandle case', function() {
            it('should simplily throw error if error method has not defined for task', function(done) {
                var d = domain.create();

                d.on('error', function(err) {
                    err.message.should.equal('There sth error!');
                    done();
                    d.exit();
                });

                d.run(function() {
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
                });
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
                var d = domain.create();

                d.on('error', function(err) {
                    err.message.should.equal('The file not_exist.js was not found.');
                    done();
                    d.exit();
                });

                d.run(function() {
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
                });
            });
        });
    });
