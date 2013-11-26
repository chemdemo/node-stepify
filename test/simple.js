var Task = require('../lib/TaskMgr');

var myTask = Task()
    // .debug(true)
    .task('foo')
        .step(function() {
            var root = this;
            setTimeout(function() {
                root.done(null, 'first');
            }, 1000);
        }, 10)
        .step('bar', 1, 2)
        .bar(function() {
            var root = this;
            setTimeout(function() {
                // console.log('index:', root._index);
                root.result('num', 100);
                root.done(null, 'second');
            }, 500);
        })
        .step('x', function() {
            var root = this;
            setTimeout(function() {
                // console.log(root.result('num'));
                // return root.done('err1~~~~');
                return root.done(null, 'haha');
                root.done(Math.random() > 0.5 ? null: 'Error!!!');
            }, 1000);
        })
        .step('baz', function() {
            var root = this;
            setTimeout(function() {
                root.done(null, 'baz');
            }, 2000);
        }, 'good')
        .step('common')
        .error(function(err) {
            console.log('has error: ', err);
        })
        // .pend()
    .task('foo2')
        .step('bar2', 'result for next..')
        .bar2(function() {
            var root = this;
            setTimeout(function() {
                root.result('foo2', 500);
                // console.log(root.stepName, Date.now());
                root.done(null);
            }, 1000);
        })
        .step('common')
        // .step('err_test', function() {
        //     console.log(arguments);
        //     setTimeout(function() {
        //         root.done('err_test!!!');
        //     }, 800);
        // })
        .pend()
    .common(function() {
        var root = this;
        setTimeout(function() {
            // console.log(root.stepName, Date.now());
            root.done(null);
        }, 1000);
    })
    .error(function(err) {
        console.log('common error method:', err);
    })
    .finish(function(result) {
        console.log(result);
    })
    .run();

// myTask.finish = function() {
//     console.log('good~~!');
// };

// myTask.error = function(err) {
//     console.log('has error: ', err);
// };

// myTask.run();
