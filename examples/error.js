var Stepify = require('../index');

Stepify()
    .step(fn)
    .step(fn)
    // 这个task的异常会走到这里
    .error(handle)
    .pend()
    .step(fn)
    .step(fn)
    .pend()
    // 所有没显式定义errorHandle的所有task异常都会走到这里
    .error(handle)
    .run();
