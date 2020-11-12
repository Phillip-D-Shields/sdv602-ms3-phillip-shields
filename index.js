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

// ! mongoose connection to mongodb
mongoose.connect(process.env.DATABASE_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true,
});

const db = mongoose.connection;

db.on("error", (error) => console.error(error));
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
  // ? check to see if current user already exists
  userModel.exists({ userId: formattedUserId }).then((exists) => {
    if (exists) {
      next();
    } else {
      // ! create new instance for new user
      var profileInstance = new userModel({
        userId: formattedUserId,
        userName: req.user.nickname,
        nextRoom: 0,
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
app.get("/rooms", (req, res, next) => {
  const ROOM_01 = req.user.room01;
  const ROOM_02 = req.user.room02;

  res.render("rooms", {
    roomONE: ROOM_01,
    roomTWO: ROOM_02,
  });
});

// ? room00 route
app.get("/room00", (req, res) => {
  res.render("room00");
});

// ? room01 route
app.get("/room01", (req, res) => {
  res.render("room01");
});

// ? room02 route
app.get("/room02", (req, res) => {
  res.render("room02");
});

/**
 // ! Server Activation
 */
app.listen(port, () => {
  console.log(`Listening to requests on http://localhost:${port}`);
});
