var Task = require('../index');

var myTask = Task()
    // .debug(true)
    .task('foo')
        .step(function() {
            var root = this;
            // setTimeout(function() {
            //     root.done(null, 'first');
            // }, 1000);
            require('fs').readdir(__dirname, this.done.bind(this));
        }, 10)
        .step('bar', 1, 2)
        .bar(function(x, y) {
            console.log([].slice.call(arguments, 0)) // [1, 2, 'first']
            var root = this;
            setTimeout(function() {
                // console.log('index:', root._index);
                root.vars('num', 100);
                root.done(null, 'second');
            }, 500);
        })
        .step('x', function() {
            console.log([].slice.call(arguments, 0)) // ['second']
            var root = this;
            setTimeout(function() {
                console.log(root.vars('num')); // 100
                // return root.done('err1~~~~');
                return root.done(null, 'haha');
                root.done(Math.random() > 0.5 ? null: 'Error!!!');
            }, 1000);
        })
        .step('baz', function() {
            console.log([].slice.call(arguments, 0)); // ['good', 'haha']
            var root = this;
            setTimeout(function() {
                root.done(null, 'baz');
            }, 2000);
        }, 'good')
        .step('common') // ['baz']
        .error(function(err) {
            console.log('has error: ', err);
        })
        // .pend()
    .task('foo2')
        .step('bar2', 'params for bar2 step..')
        .bar2(function() {
            console.log([].slice.call(arguments, 0)) // ['params for bar2 step..']
            var root = this;
            setTimeout(function() {
                root.fulfill(500);
                // console.log(root.stepName, Date.now());
                root.done(null);
            }, 1000);
        })
        .step('common') // []
        // .step('err_test', function() {
        //     console.log([].slice.call(arguments, 0));
        //     var root = this;
        //     setTimeout(function() {
        //         root.done('err_test!!!');
        //     }, 800);
        // })
        .pend()
    .common(function() {
        console.log([].slice.call(arguments, 0))
        var root = this;
        setTimeout(function() {
            // console.log(root.stepName, Date.now());
            root.done(null);
        }, 1000);
    })
    .error(function(err) {
        console.log('Error in common error method:', err);
    })
    .result(function(r) {
        console.log(r); // 500
    })
    .run();

// myTask.result = function() {
//     console.log('good~~!');
// };

// myTask.error = function(err) {
//     console.log('has error: ', err);
// };

// myTask.run();
