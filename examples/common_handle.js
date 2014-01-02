var fs = require('fs');
var Stepify = require('../index');

// 单任务
Stepify()
    .step('read', __filename)
    .step(function(buf) {
        // buf就是当前文档的内容
        var root = this;
        var writed = 'test.js';

        // 对buffer做更多的操作
        // 这里简单把所有空格去掉
        buf = buf.toString().replace(/\s+/g, '');
        fs.writeFile(writed, buf, function(err) {
            // writed就是写入的文件名，它将作为第一个动态参数传入下一步的函数体，即下一步rread
            root.done(err, writed);
        });
    })
    .step('read')
    // 这里read是一个公共的方法，读取文件内容，可传入不同的path参数
    .read(function(p, encoding) {
        fs.readFile(p, encoding || null, this.done.bind(this));
    })
    .run();
