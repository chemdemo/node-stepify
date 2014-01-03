var Stepify = require('../index');
var fs = require('fs');

// Stepify()
//     .step('mkdir', './foo')
//     // 这样定义，在执行到sleep时会抛异常，
//     // 因为这个task上面没定义过sleep的具体操作
//     .step('sleep', 100)
//     .pend()
//     .step('sleep', 200)
//     .step('mkdir', './bar')
//     .sleep(function(n) {
//         var root = this;
//         setTimeout(function() {
//             root.done();
//         }, n);
//     })
//     // 这个pend的调用，使得mkdir方法传入的handle挂在了Stepify handles队列中，
//     // 所以第一个task调用mkdir方法不会抛异常
//     .pend()
//     .mkdir(function(p) {
//         fs.mkdir(p, this.done.bind(this));
//     })
//     .run();

Stepify()
    .step('mkdir', './foo')
    // 定义当前task上的mkdirHandle，这里其实直接.step('mkdir', fn)更清晰
    .mkdir(function(p) {
        fs.mkdir(p, 0755, this.done.bind(this));
    })
    .step('sleep', 100)
    .pend()
    // 这个task上没定义mkdirHandle，会往Stepify类的handles池去找
    .step('mkdir', './bar')
    .step('sleep', 200)
    .pend()
    .sleep(function(n) {
        var root = this;
        setTimeout(function() {
            root.done();
        }, n);
    })
    .mkdir(function(p) {
        fs.mkdir(p, this.done.bind(this));
    })
    .run();
