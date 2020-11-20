// index.js

/**
//  ! Required External Modules
 */
const express = require("express");
const path = require("path");

const expressSession = require("express-session");
const passport = require("passport");
const Auth0Strategy = require("passport-auth0");

require("dotenv").config();

const authRouter = require("./auth");

const mongoose = require("mongoose");
// const roomsRouter = require("./routes/rooms");

const userModel = require("./models/profile");
const { Recoverable } = require("repl");
const { profile } = require("console");

/**
// ! App Variables
 */
const app = express();
const port = process.env.PORT || "8000";

// const UserProfile = {
//   id: null,
//   name: null,
//   lastRoomCompleted: null,
//   createDate: null,
// };

/**
 // ! Session Configuration 
 */
const session = {
  secret: process.env.SESSION_SECRET,
  cookie: {},
  resave: false,
  saveUninitialized: false,
};

if (app.get("env") === "production") {
  // Serve secure cookies, requires HTTPS
  session.cookie.secure = true;
}

/**
// ! Passport Configuration 
 */
const strategy = new Auth0Strategy(
  {
    domain: process.env.AUTH0_DOMAIN,
    clientID: process.env.AUTH0_CLIENT_ID,
    clientSecret: process.env.AUTH0_CLIENT_SECRET,
    callbackURL: process.env.AUTH0_CALLBACK_URL,
  },
  function (accessToken, refreshToken, extraParams, profile, done) {
    /**
     * Access tokens are used to authorize users to an API
     * (resource server)
     * accessToken is the token to call the Auth0 API
     * or a secured third-party API
     * extraParams.id_token has the JSON Web Token
     * profile has all the information from the user
     */
    return done(null, profile);
  }
);

/**
// !  App Configuration
 */
// ! pug configs
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");
// ! serve static assets
app.use(express.static(path.join(__dirname, "public")));
// ! rooms routes config
// app.use("/rooms", roomsRouter);
// ! expressSession middleware
app.use(expressSession(session));
// ! passport js
passport.use(strategy);

// ? must ensure that passport.initialize() and passport.session() are added after binding the express-session middleware, expressSession(session), to the application-level middleware.
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// ! Creating custom middleware with Express
// ? res.locals is a property used to expose request-level information, such as the authenticated user and user settings
app.use((req, res, next) => {
  res.locals.isAuthenticated = req.isAuthenticated();
  next();
});

// ! Router mounting
app.use("/", authRouter);

app.use(
  express.urlencoded({
    extended: true,
  })
);

// ! mongoose connection to mongodb
mongoose.connect(process.env.DATABASE_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true,
});

const db = mongoose.connection;
// ! test connection for errors
db.on("error", (error) => console.error(error));
// ! alert that db is connected
db.once("open", () => {
  console.log(`db is connected`);
});

/**
 // ! Routes Definitions
 */
const secured = (req, res, next) => {
  if (req.user) {
    return next();
  }
  req.session.returnTo = req.originalUrl;
  res.redirect("/login");
};

// ! defined routes
// ? index route
app.get("/", (req, res) => {
  res.render("index", { title: "Lubyanka, 1991" });
});

// ? user route
app.get("/user", secured, (req, res, next) => {
  var { _raw, _json, ...userProfile } = req.user;

  // ? this is ok for dev, but would need a salt or hash instead of using the auth0 user id
  var unformattedUserId = req.user.id;
  var formattedUserId = unformattedUserId.slice(6);
  var nickName = req.user.nickname;
  var newUserId = `${nickName}-${formattedUserId}`;

  // ? check to see if current user already exists

  userModel.exists({ userId: newUserId }).then((exists) => {
    if (exists) {
      next();
    } else {
      // ! create new instance for new user
      var profileInstance = new userModel({
        userId: newUserId,
        userName: nickName,
        roomsCompleted: [true, false, false]
      });

      // ? save instance
      profileInstance.save((err) => console.error(err));
    }
  });

  res.render("user", {
    title: "Profile",
    userProfile: userProfile,
  });
});

// ? rooms route
app.get("/rooms", async (req, res, next) => {

  const USER_ID = req.user.id;
  const USER_NICKNAME = req.user.nickname;
  var formattedUserId = USER_ID.slice(6);
  var nickName = USER_NICKNAME;
  var _userId = `${nickName}-${formattedUserId}`;
  // var instance = new userModel();

  let instance = await userModel.findOne(
    { userId: _userId }
  );

  const _roomsDone = instance.roomsCompleted;

  instance.save((err)=> console.log(err));

  res.render("rooms", {
    roomsDone: _roomsDone,
    rm01: _roomsDone[1],
    rm02: _roomsDone[2]
  });
});

// ? room00 route
app.get("/room00", (req, res) => {
  // const USER_ID = req.user.id;

  res.render("room00", {
    // userId: USER_ID,
    reply: "try your luck",
  });
});

// ! room00 input check
app.post("/check_answer00", async (req, res) => {
  const PASS = "gun";
  const INPUT = req.body.commandInput;
  const USER_ID = req.user.id;
  const USER_NICKNAME = req.user.nickname;
  var formattedUserId = USER_ID.slice(6);
  var nickName = USER_NICKNAME;
  var _userId = `${nickName}-${formattedUserId}`;
  

  // TODO add logic to save and add button after correct answer
  if (INPUT === PASS) {
    
    
    let instance = await userModel.findOneAndUpdate(
      { userId: _userId },
      { roomsCompleted: [true, true, false] },
      { new: true } 
    );

    instance.save((err)=> console.log(err));

    res.render("room00", { userId: USER_ID, reply: "correct", isOpen: true });
  } else {
    res.render("room00", { userId: USER_ID, reply: "wrong" });
  }
});

// ? room01 route
app.get("/room01", (req, res) => {
  const user = req.user;
  const userProfile = JSON.stringify(user, null, 2);

  res.render("room01", {
    userProfile: userProfile,
  });
});

// ! room01 input check
app.post("/check_answer01", (req, res) => {
  const PASS = "1 5 10 10 5 1";
  const INPUT = req.body.commandInput;
  const USER_ID = req.user.id;

  // TODO add logic to save and add button after correct answer
  if (INPUT === PASS) {
    res.render("room01", { userId: USER_ID, reply: "correct", isOpen: true });
  } else {
    res.render("room01", { userId: USER_ID, reply: "wrong" });
  }
});
// ? room02 route
app.get("/room02", (req, res) => {
  const userProfile = req.user;
  res.render("room02", {
    userProfile: userProfile,
  });
});

// ! room02 input check
app.post("/check_answer02", (req, res) => {
  const PASS = "phill";
  const INPUT = req.body.commandInput;
  const USER_ID = req.user.id;

  // TODO add logic to save and add button after correct answer
  if (INPUT === PASS) {
    res.render("room02", { userId: USER_ID, reply: "correct", isOpen: true });
  } else {
    res.render("room02", { userId: USER_ID, reply: "wrong" });
  }
});
/**
 // ! Server Activation
 */
app.listen(port, () => {
  console.log(`Listening to requests on http://localhost:${port}`);
});
