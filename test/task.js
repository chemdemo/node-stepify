var Task = require('../lib/task');

var mv = function(src, dist) {
    require('child_process').exec('mv ' + src + ' ' + dist, this.next);
};

var zip = function() {
    ;
};

var task =
Task()
    .register('exportHtml')
        .step('getWorkData')
        .step('createDir')
        .createDir(function() {
            ;
        })
        .step('copy', function() {
            ;
        })
        .step('zip')
        .pend()
    .register('exportImg')
        .step('getWorkData')
        .step('thumb')
        .step('mv')
        .step('zip')
    .register('exportPdf')
        .step('getWorkData')
        .step('thumb')
        .step('mv')
        .step('genPdf')
        .pend()
    .getWorkData(getWorkData, workid)
    .thumb(thumb)
    .mv(mv)
    .zip(zip)
    .finish(fn);
    .run();

module.exports = function(req, res, next) {
    var wid = req.query.wid;
    var cmd = req.query.cmd;
    var ext = req.query.ext;
    var getWorkData = function(wid) {
        // TODO
        this.store('workdata', data);
    };
    var thumb = function(ext) {
        var workdata = this.store('workdata');
    };

    task.mv = mv;
    task.thumb(thumb, ext);
};
