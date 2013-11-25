var Task = require('../lib/TaskMgr');

var myTask = Task()
    // .debug(true)
    .task('foo')
        .step(function() {
            var root = this;
            var args = arguments;
            setTimeout(function() {
                // console.log(args)
                root.done(null, 'first');
            }, 1000);
        }, 10)
        .step('bar', 1, 2)
        .bar(function(x, y) {
            // console.log(x, y)
            var root = this;
            setTimeout(function() {
                // console.log('index:', root._index);
                root.store('key', 100);
                root.done(null, 'second');
            }, 500);
        })
        .step('x', function() {
            var root = this;
            setTimeout(function() {
                console.log(root.store('key'));
                return root.done('err~~~~');
                root.done(Math.random() > 0.5 ? null: 'Error!!!');
            }, 1000);
        })
        .step('baz', function() {
            var root = this;
            setTimeout(function() {
                root.done(null, 'baz');
            }, 2000);
        })
        .error(function(err) {
            console.log('has error: ', err);
        })
    .finish(function() {
        console.log('good!');
    })
    .run();

// myTask.finish = function() {
//     console.log('good~~!');
// };

// myTask.error = function(err) {
//     console.log('has error: ', err);
// };

// myTask.run();
