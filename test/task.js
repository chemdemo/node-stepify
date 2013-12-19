var assert = require('chai').assert;
var should = require('chai').should();

var Stepify = require('../index');

describe('Stepify', function() {
    describe('constructor', function() {
        it('should get an instanceOf Stepify with new', function() {
            var mkTask = new Stepify();
            mkTask.should.be.an.instanceOf(Stepify);
        });

        it('should get an instanceOf Stepify without new', function() {
            var mkTask = Stepify();
            mkTask.should.be.an.instanceOf(Stepify);
        });
    });

    describe('debug', function() {
        it('should print "debug test" string', function() {
            var mkTask = Stepify();
        });
    });
});
