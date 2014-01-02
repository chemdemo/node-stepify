var Stepify = require('../index');

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
