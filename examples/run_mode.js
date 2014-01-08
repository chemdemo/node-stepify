var Stepify = require('../index');

var fs = require('fs');
var path = require('path');
var exec = require('child_process').exec;

var c1 = 0, c2 = 0, c3 = 0, c4 = 0;

function createTask() {
    return Stepify()
        .task('task1')
            .step(function() {c1++;
                var root = this;
                fs.readdir(__dirname, function(err) {
                    if(err) throw err;
                    root.done(null);
                });
            })
            .step('sleep')
            .step('exec', 'cat', __filename)
        .task('task2')
            .step('sleep')
            .step(function() {
                c2++;
                var root = this;
                setTimeout(function() {
                    root.done(null);
                }, 1500);
            })
            .step('exec', 'ls', '-l')
        .task('task3')
            .step('readFile', __filename)
            .step('timer', function() {
                c3++;
                var root = this;
                setTimeout(function() {
                    console.log('task3-timer')
                    root.done();
                }, 1000);
            })
            .step('sleep')
            .readFile(function(p) {
                var root = this;
                fs.readFile(p, function(err) {
                    if(err) throw err;
                    console.log('task3-readFile')
                    root.done(null);
                });
            })
        .task('task4')
            .step('sleep')
            .step(function(p) {
                c4++;
                var root = this;
                fs.readFile(p, function(err) {
                    if(err) throw err;
                    console.log('task4-readFile')
                    root.done(null);
                });
            }, __filename)
        .pend()
        .sleep(function() {
            console.log('Task %s sleep.', this.taskName);
            var root = this;
            setTimeout(function() {
                root.done(null);
            }, 2000);
        })
        .exec(function(cmd, args) {
            cmd = [].slice.call(arguments, 0);
            var root = this;
            exec(cmd.join(' '), function(err) {
                if(err) throw err;
                root.done(null);
            });
        });
};

var modes = {
    'Default(serial)': [], // 10621 ms.
    'Customized-serial': ['task1', 'task3', 'task4', 'task2'], // 10624 ms.
    'Serial-mix-parallel-1': ['task1', ['task3', 'task4'], 'task2'], // 8622 ms.
    'Serial-mix-parallel-2': [['task1', 'task3', 'task4'], 'task2'], // 6570 ms.
    'Serial-mix-parallel-3': [['task1', 'task3'], ['task4', 'task2']], // 6576 ms.
    'All-parallel': [['task1', 'task3', 'task4', 'task2']], // 3552 ms.
    'Part-of': ['task2', 'task4'] // 5526 ms.
};

var test = module.exports = function() {
    var t = Date.now();
    var task;
    var log = console.log;

    console.log = function() {};

    Object.keys(modes).forEach(function(mode) {
        task = createTask();

        task.result = function() {
            log(mode + ' mode finished and took %d ms.', Date.now() - t);
        };

        task.run.apply(task, modes[mode]);
    });

    setTimeout(function() {
        log(c1, c2, c3 ,c4); // [6, 7, 6, 7]
    }, 15000);
};

test();
