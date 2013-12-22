var assert = require('chai').assert;
var should = require('chai').should();

var Stepify = require('../index');

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
                        require('fs').readFile(__dirname, this.done);
                    })
                .finish(function() {
                    done(null);
                })
                .run();
        });
        
        it('shoule executed without error', function(done) {
            Stepify()
                .step('setTimeout', function() {
                    var root = this;
                    setTimeout(function() {
                        root.done(null, 'foo ok');
                    }, 300);
                })
                .step('readFile', function(str) {
                    require('fs').readFile(__dirname, this.done);
                })
                .finish(function() {
                    done(null);
                })
                .run();
        });
    });
});
