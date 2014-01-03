var Stepify = require('../index');
var fs = require('fs');

Stepify()
    .step(function() {
        var root = this;
        setTimeout(function() {
            root.fulfill(100);
            root.done(null);
        }, 100);
    })
    .step(function() {
        var root = this;
        fs.readFile(__filename, function(err, buf) {
            if(err) return root.done(err);
            root.fulfill(buf.toString());
            root.done();
        });
    })
    .result(function(r) {
        console.log(r); // [100, fs.readFileSync(__filename).toString()]
    })
    .run();
