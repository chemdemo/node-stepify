## stepify [![Build Status](https://api.travis-ci.org/chemdemo/node-stepify.png)](http://travis-ci.org/chemdemo/node-stepify)

stepify：一个简单易用的Node.js异步流程控制库，它提供一种比较优雅、灵活的方式完成Node.js（多）任务。

stepify的目标是将复杂的任务进行拆分成多步完成，使得每一步的执行过程更加透明，化繁为简，并在此基础上衍生出多种执行模式，进而可能输出多个不同的结果。

stepify和目前流行的一些异步类库（如[async](https://github.com/caolan/async)）有重合的功能，但是并不冲突，stepify侧重流程控制，甚至可以和其他异步类库配合使用。

### stepify特点

- API简单容易理解：只需要要掌握`step()`，`done()`，`run()`三个最基本的方法即可完成一个包含多个异步操作的任务。

- 可以根据任务的复杂度进行粒度拆分，支持单/多任务，其中多任务的执行顺序和执行方式可以根据需要自行定制。

- 移除深度嵌套callback带来的代码难管理的问题，只需要把异步操作简单封装在一个函数里边，在里边只关注这个异步操作的执行结果即可。

- 使用链式（chain）的方式将多个异步的操作过程（其实就是定义一个step）串起来，代码结构看起来比较清晰。

- 单个异步操作的函数体可以被多个任务进行共享，采用静态参数（即任务在开始执行前已知的参数）传递和动态参数传递结合的方式，使得同一个函数体有不同的输入和不同的输出。

- 统一处理单个异步操作的异常，也可根据需要单独处理某个任务的异常。

### 最简单的例子

``` javascript
```

### License

MIT [http://rem.mit-license.org](http://rem.mit-license.org)
