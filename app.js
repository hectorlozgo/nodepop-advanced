/**
 * Imports
 */
import path from "path";
import express from "express";
import createError from "http-errors";
import cookieParser from "cookie-parser";
import logger from "morgan";
import cors from "cors";

import connectMongoose from "./lib/connectMongoose.js";

import i18n from "./lib/i18nConfigure.js";
import * as sessionManager from "./lib/sessionManager.js";
import { corsOptions } from "./lib/corsConfigure.js";
import swaggerMiddleware from "./lib/swaggerMiddleware.js";
import changeLang from "./controllers/langLocaleController.js";

import webRoutes from "./routes/webRoutes.js";
import apiRoutes from "./routes/apiRoutes.js";

await connectMongoose();
console.log("Connected to MongoDB");
const app = express();
app.disable("x-powered-by");

// view engine setup
app.set("views", "views");
app.set("view engine", "ejs");

// Locals variables
app.locals.titleApp = "Nodepop";

/**
 * Use middlewares
 */
app.use(cors(corsOptions));
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(import.meta.dirname, "public"), {
  setHeaders: function (res, path) {
    res.set("X-Owner", "HLozano87");
  }
}));

// Middlewares to sessionUsers
app.use(sessionManager.sessionUser);
app.use(sessionManager.useSessionUsersInViews);

/**
 * Internationalization
 */
app.use(i18n.init);
app.use((req, res, next) => {
  res.locals.__ = res.__;
  next();
});
app.get("/lang-change/:locale", changeLang);

/**
 * Routes
 */
app.use("/api", apiRoutes);
app.use("/", webRoutes);
app.use("/api-docs", swaggerMiddleware);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  const err = createError(404);
  err.message = "Not Found";
  next(err);
});

// error handler
app.use(function (err, req, res, next) {

  if (res.headersSent) {
    return next(err);
  }

  // Manage validation errors
  const __ = res.__;
  if (err.array) {
    const validationDetails = err
      .array()
      .map((e) => `${e.location} ${e.type} "${e.path}" ${e.msg}`)
      .join(", ");

    err.message = __(err.validation) + ": " + validationDetails;
    err.status = 422;
  }

  res.status(err.status || 500);
  // For API errors response must be JSON
  if (req.url.startsWith("/api/")) {
    return res.json({ error: err.message });
  }
  // set locals, only providing error in development
  res.locals.message = __(err.message);
  res.locals.error = process.env.NODEPOP_ENV === "development" ? err : {};

  // render the error page
  return res.render("error");
});

export default app;
