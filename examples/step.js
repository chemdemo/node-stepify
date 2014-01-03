var Stepify = require('../index');

// arguments accessing
// Stepify()
//     .step(function() {
//         var root = this;
//         setTimeout(function() {
//             // 这里n+100即成为下一个stepHandle的动态参数
//             root.done(null, 100);
//         }, 100);
//     })
//     .step(function(start, n) {
//         // start === 50
//         // n === 100
//         var root = this;
//         setTimeout(function() {
//             root.done();
//         }, start + n);
//     }, 50)
//     .run();

// extend prototype chain
Stepify()
    .step('sleep')
    // more step ...
    .step('sleep', 50)
    .sleep(function(start, n) {
        var args = [].slice.call(arguments, 0);
        var root = this;

        n = args.length ? args.reduce(function(mem, arg) {return mem + arg;}) : 100;
        setTimeout(function() {
            root.done(null, n);
        }, n);
    })
    .run();
