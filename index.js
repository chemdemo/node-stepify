/**
 * Define the node-task library.
 * @author <a href="mailto:yangdemo@gmail.com">dmyang</a>
 * @version 0.0.1
 * @usage:
 * ``` js
 * require('node-tasks')()
 *   .register('foo')
 *     .step('bar', fn, *args)
 *     .step('biz', *args)
 *     .biz(*args)
 *     .err(fn)
 *     .end() // optional
 *   .register('foo2')
 *     .step('bar2', fn)
 *     .step('biz2', fn)
 *   .register('foo3')
 *     .step('biz2', fn)
 *   .biz2(*args)
 *   .run('foo', 'foo2', 'foo3');
 * ```
 **/

module.exports = require('lib/taskMgr');
