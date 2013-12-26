var assert = require('assert');
var should = require('should');

var Stepify = require('../index');

// for test...
var fs = require('fs');
var path = require('path');
var exec = require('child_process').exec;

describe('Step', function() {
    describe('#done()', function() {
        it('should execute without error when nothing or `null` been accessing in', function(done) {
            Stepify()
                .step(function() {
                    var root = this;
                    setTimeout(function() {
                        root.fulfill(1);
                        root.done();
                    }, 300);
                })
                .step(function() {
                    var root = this;
                    fs.readFile(__filename, function(err) {
                        root.done(null);
                    });
                })
                .finish(function(r) {
                    r.should.eql([1]);
                    done();
                })
                .run();
        });

        it('should access error to errorHandle', function(done) {
            Stepify()
                .step(function() {
                    var root = this;
                    fs.readdir('./not_exists.js', function(err) {
                        if(err) err = 'Error mock: file was not found.';
                        root.done(err, 1);
                    });
                })
                .step(function() {
                    var root = this;
                    setTimeout(function() {
                        root.done();
                    }, 300);
                })
                .error(function(err) {
                    err.should.equal('Error mock: file was not found.');
                    done();
                })
                .run();
        });

        it('should execute customed callback after async task done', function(done) {
            var c = 0;
            Stepify()
                .step(function() {
                    var root = this;
                    setTimeout(function() {
                        root.done(null, function() {
                            c++;
                            root.next(c);
                        });
                    }, 300);
                })
                .step(function(n) {
                    n.should.equal(1);
                    var root = this;
                    setTimeout(function() {
                        root.done(null, function(x) {
                            root.next(x);
                        }, n + 10);
                    }, 200);
                })
                .step(function(n) {
                    n.should.equal(11);
                    var root = this;
                    setTimeout(function() {
                        root.done();
                    }, 100);
                })
                .finish(function() {
                    done();
                })
                .run();
        });

        it('should access extra params to callback', function(done) {
            Stepify()
                .step(function(n) {
                    n.should.equal(300);
                    var root = this;
                    setTimeout(function() {
                        root.done(null, n);
                    }, n);
                }, 300)
                .step(function(n) {
                    n.should.equal(300);
                    var root = this;
                    var n2 = n - 100;
                    setTimeout(function() {
                        root.fulfill(n2);
                        root.done(null, function(x) {
                            // root.fulfill(x);
                            root.next();
                        }, n2);
                    }, n2);
                })
                .finish(function(n) {
                    n.should.eql([200]);
                    done();
                })
                .run();
        });
    });
});
