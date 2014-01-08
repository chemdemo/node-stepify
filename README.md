# stepify
[![Build Status](https://api.travis-ci.org/chemdemo/node-stepify.png)](http://travis-ci.org/chemdemo/node-stepify)
[![NPM version](https://badge.fury.io/js/stepify.png)](https://npmjs.org/package/stepify)

stepify是一个简单易用的Node.js异步流程控制库，提供一种比较灵活的方式完成Node.js（多）任务。

目标是将复杂的任务进行拆分成多步完成，使得每一步的执行过程更加透明，化繁为简。

stepify侧重流程控制，甚至可以和其他异步类库配合使用。

## stepify特点

- 最基本的API的就3个：`step()`，`done()`，`run()`，简单容易理解。

- 精细的粒度划分（同时支持单/多任务），执行顺序可定制化。

- 每一个异步操作都经过特殊的封装，内部只需要关心这个异步的执行过程。

- 链式（chain）调用，代码逻辑看起来比较清晰。

- 灵活的回调函数定制和参数传递。

- 统一处理单个异步操作的异常，也可根据需要单独处理某个任务的异常。

## 最简单的用法

简单实现基于oauth2授权获取用户基本资料的例子：

``` javascript
// Authorizing based on oauth2 workflow
Stepify()
    .step('getCode', function(appId, rUri) {
        var root = this;
        request.get('[authorize_uri]', function(err, res, body) {
            root.done(err, JSON.parse(body).code);
        });
    }, [appId], [redirectUri])
    .step('getToken', function(code) {
        var root = this;
        request.post('[token_uri]', function(err, res, body) {
            root.done(err, JSON.parse(body).access_token);
        });
    })
    .step('getInfo', function(token) {
        request.get('[info_uri]?token=' + token, function(err, res, body) {
            // got user info, pass it to client via http response
        });
    })
    .run();
```

多个step共用一个handle、静态参数、动态参数传递的例子：

``` javascript
Stepify()
    .step('read', __filename)
    .step(function(buf) {
        // buf is the buffer content of __filename
        var root = this;
        var writed = 'test.js';

        // do more stuff with buf
        // this demo just replace all spaces simply
        buf = buf.toString().replace(/\s+/g, '');
        fs.writeFile(writed, buf, function(err) {
            // writed is the name of target file,
            // it will be passed into next step as the first argument
            root.done(err, writed);
        });
    })
    .step('read')
    // `read` here is a common handle stored in workflow
    .read(function(p, encoding) {
        fs.readFile(p, encoding || null, this.done.bind(this));
    })
    .run();
```

这里多了一个`read()`方法，但read方法并不是stepify内置的方法。实际上，您可以任意“扩展”stepify链！它的奥妙在于`step()`方法的参数，详细请看[step调用说明](#step)。

可以看到，一个复杂的异步操作，通过stepify定制，每一步都是那么清晰可读！

## 安装

``` javascript
$ npm install stepify
```

## 运行测试

``` javascript
$ npm install
$ mocha
```

## 灵活使用

``` javascript
var Stepify = require('stepify');
var workflow1 = Stepify().step(fn).step(fn)...run();
// or
var workflow2 = new Stepify().step(fn).step(fn)...run();
// or
var workflow3 = Stepify().step(fn).step(fn);
// do some stuff ...
workflow3.run();
// or
var workflow4 = Stepify().task('foo').step(fn).step(fn).task('bar').step(fn).step(fn);
// do some stuff ...
workflow4.run(['foo', 'bar']);
var workflow5 = Stepify().step(fn).step(fn);
workflow5.debug = true;
workflow5.error = function(err) {};
workflow5.result = function(result) {};
...
workflow5.run();
// more ...
```

注：文档几乎所有的例子都是采用链式调用，但是拆开执行也是没有问题的。

## 原理

概念：

- task：完成一件复杂的事情，可以把它拆分成一系列任务，这些个任务有可能它的执行需要依赖上一个任务的完成结果，它执行的同时也有可能可以和其他一些任务并行，串行并行相结合，这其实跟真实世界是很吻合的。

- step：每一个task里边可再细分，可以理解成“一步一步完成一个任务（Finish a task step by step）”，正所谓“一步一个脚印”是也。

stepify内部实际上有两个主要的类，一个是Stepify，一个是Step。

`Stepify()`的调用会返回一个Stepify实例，在这里称之为workflow，用于调度所有task的执行。

`step()`的调用会创建一个Step实例，用于完成具体的异步操作（当然也可以是同步操作，不过意义不大），step之间使用简单的api（[done](#done)方法和[next](#next)方法）传递。

## API 文档

### Stepify类：

调用Stepify即可创建一个workflow。

- [debug](#debug)

- [task](#task)

- [step](#step)

- [pend](#pend)

- *[stepName](#stepname)*

- [error](#error)

- [result](#result)

- [run](#run)

### Step类：

Step类只在Stepify实例调用step方法时创建，不必显式调用。

- [done](#done)

- [wrap](#wrap)

- [fulfill](#fulfill)

- [vars](#vars)

- [parallel](#parallel)

- [jump](#jump)

- [next](#next)

- [end](#end)

---

#### debug()

描述：开启debug模式，打印一些log，方便开发。

调用：debug(flag)

参数：

- {Boolean} flag 默认是false

例子：

``` javascript
var work = Stepify().debug(true);
// or
var work = Stepify();
work.debug = true;
```

#### task()

描述：显式创建一个task，task()的调用是可选的。在新定制一个task时，如果没有显式调用task()，则这个task的第一个step()内部会先生成一个task，后续的step都是挂在这个task上面，每一个task内部会维持自己的step队列。多个task使用[pend](#pend)方法分割。

调用：task([taskName])

参数：

- {String} taskName 可选参数，默认是`_UNAMED_TASK_[index]`。为这个task分配一个名字，如果有多个task实例并且执行顺序需要（使用run()方法）自定义，则设置下taskName方便一点。

例子：

``` javascript
var myWork1 = Stepify().task('foo').step('step1').step('step2').run();
// equal to
var myWork1 = Stepify().step('step1').step('step2').run();
// multiply tasks
var myWork2 = Stepify()
	.task('foo')
    	.step(fn)
        .step(fn)
    .task('bar')
    	.step(fn)
        .step(fn)
    .task('baz')
    	.step(fn)
        .step(fn)
    .run();
```

#### step()

描述：定义当前task的一个异步操作，每一次step()调用都会实例化一个Step推入task的step队列。**这个方法是整个lib的核心所在。**

调用：step(stepName, stepHandle, *args)

参数：

- {String} stepName 可选参数，但在不传stepHandle时是必传参数。为这个step分配一个名称。当stepHandle没有传入时，会在Stepify原型上扩展一个以stepName命名的方法，而它具体的实现则在调用stepName方法时决定，这个方法详情请看[*stepName说明*](#stepname)。

- {Function} stepHandle 可选参数，但在stepName不传时是必传参数。在里边具体定义一个异步操作的过程。stepHandle的执行分两步，先查找这个step所属的task上有没有stepHandle，找不到则查找Stepify实例上有没有stepHandle，再没有就抛异常。

- {Mix} *args 可选参数，表示这个step的已知参数（即静态参数），在stepHandle执行的时候会把静态参与动态参数（通过[done](#done)或者[next](#next)传入）合并作为stepHandle的最终参数。

例子：

- 参数传递

``` javascript
Stepify()
	.step(function() {
    	var root = this;
        setTimeout(function() {
        	// 这里done的第二个参数（100）即成为下一个stepHandle的动态参数
        	root.done(null, 100);
        }, 100);
    })
    .step(function(start, n) {
    	// start === 50
        // n === 100
        var root = this;
        setTimeout(function() {
        	root.done();
        }, start + n);
    }, 50)
    .run();
```

- 扩展原型链

``` javascript
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
```

#### pend()

描述：结束一个task的定义，会影响扩展到Stepify原型链上的stepName方法的执行。

调用：pend()

参数： 无参数。

例子：见*[stepName](#stepname)*部分

#### *stepName()*

描述：这是一个虚拟方法，它是通过动态扩展Stepify类原型链实现的，具体调用的名称由step方法的`stepName`参数决定。扩展原型链的stepName的必要条件是step方法传了stepName（stepName需要是一个可以通过`.`访问属性的js变量）但是stepHandle没有传，且stepName在原型链上没定义过，当workflow执行结束之后会删除已经扩展到原型链上的所有方法。当调用实例上的stepName方法时，会检测此时有没有在定义的task（使用pend方法结束一个task的定义），如果有则把传入的handle挂到到这个task的handles池里，没有则挂到Stepify的handles池。

调用：stepName(stepHandle)

参数：

- {Function} stepHandle 必传参数，定义stepName对应的stepHandle，可以在多个task之间共享。

例子：

- pend()的影响

``` javascript
Stepify()
    .step('mkdir', './foo')
    // 这样定义，在执行到sleep时会抛异常，
    // 因为这个task上面没定义过sleep的具体操作
    .step('sleep', 100)
    .pend()
    .step('sleep', 200)
    .step('mkdir', './bar')
    .sleep(function(n) {
        var root = this;
        setTimeout(function() {
            root.done();
        }, n);
    })
    // 这个pend的调用，使得mkdir方法传入的handle挂在了Stepify handles池中，
    // 所以第一个task调用mkdir方法不会抛异常
    .pend()
    .mkdir(function(p) {
        fs.mkdir(p, this.done.bind(this));
    })
    .run();
```

- stepHandle的查找

``` javascript
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
```

#### error()

描述：定制task的异常处理函数。

调用：error(errorHandle)

参数：

- {Function} errorHandle 必传参数 **默认会直接抛出异常并中断当前task的执行**。每一个task都可以定制自己的errorHandle，亦可为所有task定制errorHandle。每个step执行如果出错会直接进入这个errorHandle，后面是否继续执行取决于errorHandle内部定义。errorHandle第一个参数便是具体异常信息。

注意：errorHandle的执行环境是发生异常所在的那个step，也就是说Step类定义的所有方法在errorHandle内部均可用，您可以在异常时决定是否继续执行下一步，或者使用`this.taskName`和`this.name`分别访问所属task的名称和step的名称，进而得到更详细的异常信息。

例子：

``` javascript
Stepify()
    .step(fn)
    .step(fn)
    // 这个task的异常会走到这里
    .error(function(err) {
        console.error('Error occurs when running task %s\'s %s step!', this.taskName, this.name);
        if(err.message.match(/can_ignore/)) {
            // 继续执行下一步
            this.next();
        } else {
            throw err;
        }
    })
    .pend()
    .step(fn)
    .step(fn)
    .pend()
    // 所有没显式定义errorHandle的所有task异常都会走到这里
    .error(function(err) {
        console.error(err.stack);
        res.send(500, 'Server error!');
    })
    .run();
```

#### result()

描述：所有task执行完之后，输出结果。在Stepify内部，会保存一份结果数组，通过step的[fulfill方法](#fulfill)可以将结果push到这个数组里，result执行的时候将这个数组传入finishHandle。

调用：result(finishHandle)

参数：

- {Function} finishHandle，result本身是可选调用的，如果调用了result，则finishHandle是必传参数。

例子：

``` javascript
Stepify()
    .step(function() {
        var root = this;
        setTimeout(function() {
            root.fulfill(100);
            root.done(null);
        }, 100);
    })
    .step(function() {
        var root = this;
        fs.readFile(__filename, function(err, buf) {
            if(err) return root.done(err);
            root.fulfill(buf.toString());
            root.done();
        });
    })
    .result(function(r) {
        console.log(r); // [100, fs.readFileSync(__filename).toString()]
    })
    .run();
```

#### run()

描述：开始执行所定制的整个workflow。这里比较灵活，执行顺序可自行定制，甚至可以定义一个workflow，分多种模式执行。

调用：run(*args)

参数：

- {Mix} 可选参数，类型可以是字符串（taskName）、数字（task定义的顺序，从0开始）、数组（指定哪些tasks可以并行），也可以混合起来使用（数组不支持嵌套）。默认是按照定义的顺序串行执行所有tasks。

例子：

``` javascript
function createTask() {
    return Stepify()
        .task('task1')
            .step(function() {
                c1++;
                fs.readdir(__dirname, this.wrap());
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
                    root.done();
                }, 1000);
            })
            .step('sleep')
            .readFile(function(p) {
                fs.readFile(p, this.done.bind(this));
            })
        .task('task4')
            .step('sleep')
            .step(function(p) {
                c4++;
                fs.readFile(p, this.wrap());
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
            exec(cmd.join(' '), this.wrap());
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

var test = function() {
    var t = Date.now();
    var task;

    Object.keys(modes).forEach(function(mode) {
        task = createTask();

        task.result = function() {
            console.log(mode + ' mode finished and took %d ms.', Date.now() - t);
        };

        task.run.apply(task, modes[mode]);
    });

    setTimeout(function() {
        log(c1, c2, c3 ,c4); // [6, 7, 6, 7]
    }, 15000);
};

test();
```

---------

#### done()

描述：标识完成了一个异步操作（step）。

调用：done([err, callback, *args])

参数：

- {String|Error|null} err 错误描述或Error对象实例。参数遵循Node.js的回调约定，可以不传参数，如果需要传递参数，则第一个参数必须是error对象。

- {Function} callback 可选参数 自定义回调函数，默认是next，即执行下一步。

- {Mix} *args 这个参数是传递给callback的参数，也就是作为下一步的动态参数。一般来说是将这一步的执行结果传递给下一步。

例子：

``` javascript
Stepify()
    .step(function() {
        var root = this;
        setTimeout(function() {
            root.done();
        }, 200);
    })
    .step(function() {
        var root = this;
        exec('curl "https://github.com/"', function(err, res) {
            // end this task in error occured
            if(err) root.end();
            else root.done(null, res);
        });
    })
    .step(function(res) {
        var root = this;
        setTimeout(function() {
            // do some stuff with res ...
            console.log(res);
            root.done();
        }, 100);
    })
    .run();
```

#### wrap()

描述：其实就是`this.done.bind(this)`的简写，包装done函数保证它的执行环境是当前step。比如原生的`fs.readFile()`的callback的执行环境被设置为null[fs.js#L91](https://github.com/joyent/node/blob/master/lib/fs.js#L91)。

调用：wrap()

参数：无

例子：

``` javascript
Stepify()
    .step(function() {
        fs.readdir(__dirname, this.done.bind(this));
    })
    .step(function() {
        fs.readFile(__filename, this.wrap());
    })
    .run();
```

#### fulfill()

描述：把step执行的结果推入结果队列，最终传入finishHandle。最终结果数组的元素顺序在传入给finishHandle时不做任何修改。

调用：fulfill(*args)

参数：

- {Mix} 可选参数 可以是一个或者多个参数，会一一push到结果队列。

例子：

``` javascript
// Assuming retrieving user info
Stepify()
    .step(function() {
        var root = this;
        db.getBasic(function(err, basic) {
            root.fulfill(basic || null);
            root.done(err, basic.id);
        });
    })
    .step(function(id) {
        var root = this;
        db.getDetail(id, function(err, detail) {
            root.fulfill(detail || null);
            root.done(err);
        });
    })
    .error(function(err) {
        console.error(err);
        res.send(500, 'Get user info error.');
    })
    .result(function(r) {
        res.render('user', {basic: r[0], detail: r[1]});
    })
    .run();
```

#### vars()

描述：暂存临时变量，在整个workflow的运行期可用。如果不想在workflow之外使用`var`申明别的变量，可以考虑用vars()。

调用：vars(key[, value])

参数：

- {String} key 变量名。访问临时变量。

- {Mix} value 变量值。如果只传入key则是访问变量，如果传入两个值则是写入变量并返回这个value。

例子：

``` javascript
Stepify()
    .step(function() {
        this.vars('foo', 'bar');
        // todo
    })
    .pend()
    .step(function() {
        // todo
        console.log(this.vars('foo')); // bar
    })
    .run();
```

#### parallel()

描述：简单的并发支持。*这里还可以考虑引用其他模块（如：[async](https://github.com/caolan/async)）完成并行任务。*

调用：parallel(arr[, iterator, *args, callback])

参数：

- {Array} arr 必传参数。需要并行执行的一个数组，对于数组元素只有一个要求，就是如果有函数则所有元素都必须是一个函数。

- {Function} iterator 如果arr参数是一个函数数组，这个参数是不用传的，否则是必传参数，它迭代运行arr的每一个元素。iterator的第一个参数是arr中的某一个元素，第二个参数是回调函数（`callback`），当异步执行完之后需要调用`callback(err, data)`。

- {Mix} \*args 传递给iterator的参数，在迭代器执行的时候，arr数组的每一个元素作为iterator的第一个参数，\*args则作为剩下的传入。

- {Function} callback 可选参数（约定当最后一个参数是函数时认为它是回调函数） 默认是next。这个并行任务的执行结果会作为一个数组按arr中定义的顺序传入callback，如果执行遇到错误，则直接交给errHandle处理。

例子：

传入一个非函数数组（parallel(arr, iterator[, *arg, callback])）

``` javascript
Stepify()
    .step(function() {
        fs.readdir(path.resolve('./test'), this.wrap());
    })
    .step(function(list) {
        list = list.filter(function(p) {return path.extname(p).match('js');});
        list.forEach(function(file, i) {list[i] = path.resolve('./test', file);});
        // 注释部分就相当于默认的this.next
        this.parallel(list, fs.readFile, {encoding: 'utf8'}/*, function(bufArr) {this.next(bufArr);}*/);
    })
    .step(function(bufArr) {
        // fs.writeFile('./combiled.js', Buffer.concat(bufArr), this.done.bind(this));
        // or
        this.parallel(bufArr, fs.writeFile.bind(this, './combiled.js'));
    })
    .run();
```

传入函数数组（parallel(fnArr[])）

``` javascript
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
```

下面是一个应用到某项目里的例子：

``` javascript
...
.step('fetch-images', function() {
    var root = this;
    var localQ = [];
    var remoteQ = [];

    // do dome stuff to get localQ and remoteQ

    this.parallel([
        function(callback) {
            root.parallel(localQ, function(frameData, cb) {
                // ...
                db.getContentType(frameData.fileName, function(type) {
                    var imgPath = frameData.fileName + '.' + type;
                    // ...
                    db.fetchByFileName(imgPath).pipe(fs.createWriteStream(targetUrl));
                    cb(null);
                });
            }, function(r) {callback(null, r);});
        },
        function(callback) {
            root.parallel(remoteQ, function(frameData, cb) {
                var prop = frames[frameData['frame']].children[frameData['elem']]['property'];
                // ...
                request({url: prop.src}, function(err, res, body) {
                    // ...
                    cb(null);
                }).pipe(fs.createWriteStream(targetUrl));
            }, function(r) {callback(null, r);});
        },
    ]);
})
...
```

#### jump()

描述：在step之间跳转。**这样会打乱step的执行顺序，谨慎使用jump，以免导致死循环**。

调用：jump(index|stepName)

参数：

- {Number} index 要跳转的step索引。在step创建的时候会自建一个索引属性，使用`this._index`可以访问它。

- {String} stepName step创建时传入的名称。

例子：

``` javascript
Stepify()
    .step('a', fn)
    .step('b', fn)
    .step(function() {
        if(!this.vars('flag')) {
            this.jump('a');
            this.vars('flag', 1)
        } else {
            this.next();
        }

        // 其他的异步操作
    })
    .step('c', fn)
    .run();
```

#### next()

描述：显式调用下一个step，并将数据传给下一step（即下一个step的动态参数）。其实等同于done(null, *args)。

调用：next([*args])

参数：

- {Mix} *args 可选参数 类型不限，数量不限。

例子：

``` javascript
Stepify()
    .step(function() {
        // do some stuff ...
        this.next('foo', 'bar');
    })
    .step(function(a, b, c) {
        a.should.equal('test');
        b.should.equal('foo');
        c.should.equal('bar');
    }, 'test')
    .run();
```

#### end()

描述：终止当前task的执行。如果遇到异常并传递给end，则直接交给errorHandle，和done一样。不传或者传null则跳出所在task执行下一个task，没有则走到result，没有定义result则退出进程。

调用：end(err)

参数：

- {Error|null} err 可选参数， 默认null。

例子：

``` javascript
Stepify()
    .step(fn)
    .step(function() {
        if(Math.random() > 0.5) {
            this.end();
        } else {
            // todo ...
        }
    })
    .step(fn)
    .run();
```

---

最后，欢迎fork或者[提交bug](https://github.com/chemdemo/node-stepify/issues)。

## License

MIT [http://rem.mit-license.org](http://rem.mit-license.org)
