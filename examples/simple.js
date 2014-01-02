var request = require('request');
var Stepify = require('../index');

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

// muitiply tasks case
Stepify()
    .step(function() {
        var root = this;
        setTimeout(function() {
            // do some stuff ...
            root.done(null, 'a');
        }, 100);
    })
    .step(function() {
        var root = this;
        setTimeout(function() {
            // do some stuff ...
            root.done();
        }, 100);
    })
    .pend()
    .step(function() {
        var root = this;
        setTimeout(function() {
            // do some stuff ...
            root.done();
        }, 200);
    })
    .step(function() {
        var root = this;
        setTimeout(function() {
            // do some stuff ...
            root.done();
        }, 200);
    })
    .run();
