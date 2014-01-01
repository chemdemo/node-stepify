var request = require('request');
var Stepify = require('../index');

// simple github authorize
Stepify()
    .step('getCode', function(cId, rUri) {
        // get code
        var root = this;
        request.get(
            'https://github.com/login/oauth/authorize?client_id=' + cId + '&redirect_uri=' + rUri,
            function(err, res, body) {
                root.done(err, );
            }
        );
    }, 'da99f7d527e218b87442', 'http://oauth.dmfeel.com/auth/github/callback')
    .step('getToken', function() {
        ;
    })
    .step('getInfo', function() {
        ;
    })
    .run();
