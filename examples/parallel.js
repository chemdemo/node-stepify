var Stepify = require('../index');

var fs = require('fs');
var path = require('path');

// 非函数数组
// Stepify()
//     .step(function() {
//         fs.readdir(path.resolve('./test'), this.wrap());
//     })
//     .step(function(list) {
//         list = list.filter(function(p) {return path.extname(p).match('js');});
//         list.forEach(function(file, i) {list[i] = path.resolve('./test', file);});
//         // 注释部分就相当于默认的this.next
//         this.parallel(list, fs.readFile, {encoding: 'utf8'}/*, function(bufArr) {this.next(bufArr);}*/);
//     })
//     .step(function(bufArr) {
//         // fs.writeFile('./combiled.js', Buffer.concat(bufArr), this.done.bind(this));
//         // or
//         this.parallel(bufArr, fs.writeFile.bind(this, './combiled.js'));
//     })
//     .run();

// 函数数组
Stepify()
    .step(function() {
        this.parallel([
            function(callback) {
                fs.readFile(__filename, callback);
            },
            function(callback) {
                setTimeout(function() {
                    callback(null, 'some string...');
                }, 500);
            }
        ]);
    })
    .step(function(list) {
        console.log(list); // [fs.readFileSync(__filename), 'some string...']
        // todo...
    })
    .run();
