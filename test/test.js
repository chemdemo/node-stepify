var Stepify = require('../index');
var should = require('should');
var fs = require('fs');
var path = require('path');
var domain = require('domain');
var exec = require('child_process').exec;

describe('#parallel()', function() {
        var index = path.resolve(__dirname, '../index.js');
        var files = [index, __filename];
        var exed = [];

        it('should support parallel(arr, iterator[, callback]) mode', function(done) {
            Stepify()
                .step('a', function() {
                    exed.push(this._stepName);
                    this.parallel(files, fs.readFile, {encoding: 'utf8'});
                })
                .step('b', function(list) {
                    exed.push(this._stepName);

                    list.should.have.length(2);
                    list[0].toString().should.equal(fs.readFileSync(index).toString());
                    list[1].toString().should.equal(fs.readFileSync(__filename).toString());

                    this.parallel(files, fs.readFile, {encoding: 'utf8'}, this.done);
                })
                .step('c', function(list) {
                    list.should.have.length(2);
                    list[0].toString().should.equal(fs.readFileSync(index).toString());
                    list[1].toString().should.equal(fs.readFileSync(__filename).toString());

                    this.parallel(files, fs.readFile, function(err, results) {
                        if(err) this.end(err);
                        exed.push(this._stepName);
                        results.should.be.an.Array;
                        this.next(results);
                    });
                })
                .step('d', function(list) {
                    list.should.have.length(2);
                    list[0].toString().should.equal(fs.readFileSync(index).toString());
                    list[1].toString().should.equal(fs.readFileSync(__filename).toString());

                    var root = this;

                    setTimeout(function() {
                        exed.push(root._stepName);
                        root.done();
                    }, 300);
                })
                .result(function() {
                    exed.should.eql(['a', 'b', 'c', 'd']);
                    done();
                })
                .run();
        });

        it('should support parallel(fnArr[, callback]) mode', function(done) {
            Stepify()
                .step('a', function() {
                    this.parallel([
                        function(callback) {
                            fs.readFile(__filename, callback);
                        },
                        function(callback) {
                            setTimeout(function() {
                                callback(null, 'timer return');
                            }, 500);
                        }
                    ]);
                })
                .step('b', function(r) {
                    r.should.be.an.Array;
                    r.should.have.length(2);
                    r[0].toString().should.equal(fs.readFileSync(__filename).toString());
                    r[1].should.equal('timer return');

                    this.parallel([
                        function(callback) {
                            fs.readFile(index, callback);
                        },
                        function(callback) {
                            setTimeout(function() {
                                callback(null, 'timer2 return');
                            }, 500);
                        }
                    ], function(err, results) {
                        if(err) throw err;
                        this.next(results);
                    });
                })
                .step('c', function(r) {
                    r.should.be.an.Array;
                    r.should.have.length(2);
                    r[0].toString().should.equal(fs.readFileSync(index).toString());
                    r[1].should.equal('timer2 return');

                    done();
                })
                .run();
        });
    });
