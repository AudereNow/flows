import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

import { FirestoreStore } from "@google-cloud/connect-firestore";
import { Strategy as LocalStrategy } from "passport-local";
import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import passport from "passport";
import session from "express-session";

const app = express();

app.use(cors());
app.use(
  session({
    store: new FirestoreStore({
      dataset: admin.firestore(),
    }),
    secret: "blah blah",
    resave: false,
    saveUninitialized: true,
  })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new LocalStrategy((username, password, done) => {
    if (username === "test" && password === "test") {
      done(null, { username });
    }
    done(null, false, { message: "Invalid username or password" });
  })
);

passport.serializeUser((user: any, done) => done(null, user.username));
passport.deserializeUser((username: string, done) => done(null, { username }));

app.post(
  "/users/sign_in",
  (req, res, next) => {
    const { user } = req.body;
    req.body.username = user.username;
    req.body.password = user.password;
    next();
  },
  passport.authenticate("local"),
  (req, res) => {
    const { user } = req as any;
    console.log(user);
    res.send({ user: user });
  }
);

app.get("/status", (req, res) => res.send("ok"));

export const api = functions.https.onRequest(app);
