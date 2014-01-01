## stepify [![Build Status](https://api.travis-ci.org/chemdemo/node-stepify.png)](http://travis-ci.org/chemdemo/node-stepify)

stepify：一个简单易用的Node.js异步流程控制库，提供一种比较灵活的方式完成Node.js（多）任务。

stepify的目标是将复杂的任务进行拆分成多步完成，使得每一步的执行过程更加透明，化繁为简。stepify侧重流程控制，甚至可以和其他异步类库配合使用。

### stepify特点

- 最基本的API的就3个：`step()`，`done()`，`run()`，简单容易理解。

- 精细的粒度划分（同时支持单/多任务），执行顺序可定制化。

- 每一个异步操作都被看成是一个`step`封装，内部只需要关心这个异步的执行过程。

- 链式（chain）调用，代码逻辑看起来比较清晰。

- 灵活的回调函数定制和参数传递。

- 统一处理单个异步操作的异常，也可根据需要单独处理某个任务的异常。

### 简单的例子

单任务：简单实现基于oauth2授权获取用户基本资料的例子：

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
            // got user info, return to client via http response
        });
    })
    .run();
```

多任务：

## License

MIT [http://rem.mit-license.org](http://rem.mit-license.org)
