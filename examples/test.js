var Stepify = require('../index');
var should = require('should');

// for test...
var fs = require('fs');
var path = require('path');
var exec = require('child_process').exec;

var c2 = 0;
var flag = 0;

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
                            root.done('There sth error.');
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
                        flag++;
                        err.should.equal('There sth error.');
                        c2.should.equal(2);
                        // flag.should.equal(1);
                        done();
                    })
                    .run();
            });
        });

after(function() {
            // Is `after()` can be used after `it()` called ?
            flag.should.equal(1);
        });
