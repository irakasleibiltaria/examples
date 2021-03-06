var express = require('express'),
    restful = require('node-restful'),
    // mongoose = require('mongoose');
    mongoose = restful.mongoose;

// Make a new Express app
var app = module.exports = express();

// Connect to mongodb
mongoose.connect("mongodb://localhost/restful");

// Use middleware to parse POST data and use custom HTTP methods
app.use(express.bodyParser());
app.use(express.methodOverride());


var hashPassword = function(req, res, next) {
  if (!req.body.password)
    return next({ status: 400, err: "No password!" }); // We can also throw an error from a before route
  req.body.password = bcrypt.hashSync(req.body.password, 10); // Using bcrypt
  return next(); // Call the handler
}

var sendEmail = function(req, res, next) {
  // We can get the user from res.bundle and status code from res.status and
  // trigger an error by calling next(err) or populate information that would otherwise be miggins
  next(); // I'll just pass though
}

var User = app.resource = restful.model('user', mongoose.Schema({
    username: 'string',
    password_hash: 'string',
  }))
  .methods(['get', 'put', 'delete', 'post'])
  .before('post', hashPassword) // Before we make run the default POST to create a user, we want to hash the password (implementation omitted)
  .after('post', sendEmail); // After we register them, we will send them a confirmation email

User.register(app, '/user'); // Register the user model at the localhost:3000/user


var validateUser = function(req, res, next) {
  if (!req.body.creator) {
    return next({ status: 400, err: "Notes need a creator" });
  }
  User.Model.findById(req.body.creator, function(err, model) {
    if (!model) return next(restful.objectNotFound());
    return next();
  });
}

var Note = app.resource = new restful.model('note', mongoose.Schema({
    title: { type: 'string', required: true},
    body: { type: 'string', required: true},
    creator: { type: 'ObjectId', ref: 'user', require: true},
  }))
  .methods(['get', 'delete', 'post', 'put'])
  .before('post', validateUser)
  .after('put', validateUser);

Note.register(app, '/note');


User.route("notes", {
  handler: function(req, res, next, err, model) { // we get err and model parameters on detail routes (model being the one model that was found)
    Note.Model.find({ creator: model._id }, function(err, list) {
      if (err) return next({ status: 500, err: "Something went wrong" });
      //res.status is the status code
      res.status = 200;

      // res.bundle is what is returned, serialized to JSON
      res.bundle = list;
      return next();
    });
  },
  detail: true, // detail routes operate on a single instance, i.e. /user/:id
  methods: ['get'], // only respond to GET requests
});

app.listen(3000);
console.log("http://localhost:3000/")