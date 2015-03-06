var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bcrypt = require('bcryptjs');
var bodyParser = require('body-parser');
var cors = require('cors');
var jwt = require('jwt-simple');
var moment = require('moment');
var request = require('request');

var routes = require('./routes/index');
var users = require('./routes/users');

var Mongoose = require('mongoose');
var db = Mongoose.createConnection('mongodb://root:free2323@localhost/admin');
var config = require('./dbconfig');
var User = Mongoose.model('User', new Mongoose.Schema({
  facebookId: { type: String, index: true },
  email: { type: String, unique: true, lowercase: true },
  password: { type: String, select: false },
  username: String,
  fullName: String,
  picture: String,
  accessToken: String
}));
 
Mongoose.connect(config.db);

var app = express();

app.clientSecret = "fd8eedba67003b2bd0bfa7306b3d7a02";
app.tokenSecret = "pick a hard to guess string";

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.set('port', process.env.PORT || 3000);
app.use(cors());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});
var corsOptions = {
origin: 'http://smokemeupbro.com',
credentials: true
};

app.use(cors(corsOptions));
// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

function createToken(user) {
  var payload = {
    exp: moment().add(14, 'days').unix(),
    iat: moment().unix(),
    sub: user._id
  };
 
  return jwt.encode(payload, config.tokenSecret);
}
function isAuthenticated(req, res, next) {
  if (!(req.headers && req.headers.authorization)) {
    return res.status(400).send({ message: 'You did not provide a JSON Web Token in the Authorization header.' });
  }
 
  var header = req.headers.authorization.split(' ');
  var token = header[1];
  var payload = jwt.decode(token, config.tokenSecret);
  var now = moment().unix();
 
  if (now > payload.exp) {
    return res.status(401).send({ message: 'Token has expired.' });
  }
 
  User.findById(payload.sub, function(err, user) {
    if (!user) {
      return res.status(400).send({ message: 'User no longer exists.' });
    }
 
    req.user = user;
    next();
  })
}
app.post('/auth/login', function(req, res) {
  User.findOne({ email: req.body.email }, '+password', function(err, user) {
    if (!user) {
      return res.status(401).send({ message: { email: 'Incorrect email' } });
    }
 
    bcrypt.compare(req.body.password, user.password, function(err, isMatch) {
      if (!isMatch) {
        return res.status(401).send({ message: { password: 'Incorrect password' } });
      }
 
      user = user.toObject();
      delete user.password;
 
      var token = createToken(user);
      res.send({ token: token, user: user });
    });
  });
});
app.post('/auth/signup:3000', function(req, res) {
  User.findOne({ email: req.body.email }, function(err, existingUser) {
    if (existingUser) {
      return res.status(409).send({ message: 'Email is already taken.' });
    }
 
    var user = new User({
      email: req.body.email,
      password: req.body.password
    });
 
    bcrypt.genSalt(10, function(err, salt) {
      bcrypt.hash(user.password, salt, function(err, hash) {
        user.password = hash;
 
        user.save(function() {
          var token = createToken(user);
          res.send({ token: token, user: user });
        });
      });
    });
  });
});
 // application -------------------------------------------------------------
    app.get('*', function(req, res) {
        res.sendfile('./public/index.html'); // load the single view file (angular will handle the page changes on the front-end)
    });
    app.post('/auth/facebook', function(req, res) {
          var accessTokenUrl = 'https://www.facebook.com/dialog/oauth';
         
          var params = {
            client_id: req.body.clientId,
            redirect_uri: req.body.redirectUri,
            client_secret: config.clientSecret,
            code: req.body.code,
            grant_type: 'authorization_code'
          };
         
         // Step 1. Exchange authorization code for access token.
          request.post({ url: accessTokenUrl, form: params, json: true }, function(e, r, body) {
            // Step 2a. Link user accounts.
            if (req.headers.authorization) {
                User.findOne({ facebookId: body.user.id }, function(err, existingUser) {
                 
                  var token = req.headers.authorization.split(' ')[1];
                  var payload = jwt.decode(token, config.tokenSecret);
                 
                  User.findById(payload.sub, '+password', function(err, localUser) {
                    if (!localUser) {
                      return res.status(400).send({ message: 'User not found.' });
                    }
                 
                    // Merge two accounts.
                    if (existingUser) {
                 
                      existingUser.email = localUser.email;
                      existingUser.password = localUser.password;
                 
                      localUser.remove();
                 
                      existingUser.save(function() {
                        var token = createToken(existingUser);
                        return res.send({ token: token, user: existingUser });
                      });
                 
                    } else {
                      // Link current email account with the facebooke information.
                      localUser.facebookId = body.user.id;
                      localUser.username = body.user.username;
                      localUser.fullName = body.user.full_name;
                      localUser.picture = body.user.profile_picture;
                      localUser.accessToken = body.access_token;
                 
                      localUser.save(function() {
                        var token = createToken(localUser);
                        res.send({ token: token, user: localUser });
                      });
                 
                    }
                  });
                });
            } else { // Step 2b. Create a new user account or return an existing one.
              User.findOne({ facebookId: body.user.id }, function(err, existingUser) {
                if (existingUser) {
                  var token = createToken(existingUser);
                  return res.send({ token: token, user: existingUser });
                }
         
                var user = new User({
                  facebookId: body.user.id,
                  username: body.user.username,
                  fullName: body.user.full_name,
                  picture: body.user.profile_picture,
                  accessToken: body.access_token
                });
         
                user.save(function() {
                  var token = createToken(user);
                  res.send({ token: token, user: user });
                });
              });
            }
         });
    });
module.exports = app;
app.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + app.get('port'));
});