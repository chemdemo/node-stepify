var Stepify = require('../index');
var exec = require('child_process');

Stepify()
    .step(function() {
        var root = this;
        setTimeout(function() {
            root.done();
        }, 200);
    })
    .step(function() {
        var root = this;
        exec('curl "https://github.com/"', function(err, res) {
            // end this task in error occured
            if(err) root.end();
            else root.done(null, res);
        });
    })
    .step(function(res) {
        var root = this;
        setTimeout(function() {
            // do some stuff with res ...
            console.log(res);
            root.done();
        }, 100);
    })
    .run();
