var Task = require('../lib/TaskMgr');

var myTask = Task()
    .register('foo')
        .step(function() {
            console.log(arguments);
            setTimeout(function() {
                console.log('first');
                this.done(null, 'first');
            }, 1000);
        }, 10)
        .step('bar')
        .bar(function() {
            console.log(arguments);
            setTimeout(function() {
                console.log('second');
                this.done(null, 'second');
            }, 500);
        }, 20, 30)
        .step('biz', function() {
            this.store('key', 100);
            this.done(null, 'biz');
        })
    .run();
