import User from "../models/User.js";
import { io } from "../webSocketServer.js";
import { promisify } from "util";

export const index = (req, res, next) => {
  res.locals.error = "";
  res.locals.name = "";
  res.locals.email = "";
  res.locals.newAccount = req.query.newAccount === "true";
  res.locals.redir = req.query.redir || "";
  res.render("login");
};

export async function loginUser(req, res, next) {
  try {
    const { name, email, password, confirmPassword } = req.body;
    const redir = (req.body.redir || req.query.redir || "/").trim();
    const newAccount = req.query.newAccount === "true";
    const __ = res.__;

    if (!email || !password) {
      res.locals.error = __("Email and password required.");
      res.locals.email = "";
      res.locals.newAccount = newAccount;
      res.locals.redir = redir;
      return res.render("login");
    }

    if (newAccount) {
      const userId = req.session.userId;
      if (!confirmPassword || password !== confirmPassword) {
        res.locals.error = __("Passwords not match.");
        res.locals.name = name;
        res.locals.email = email;
        res.locals.newAccount = true;
        return res.render("login");
      }

      if (await User.isEmailExist(email)) {
        res.locals.error = __("Email already exists.");
        res.locals.name = name;
        res.locals.email = email;
        res.locals.newAccount = true;
        return res.render("login");
      }

      const user = new User({
        name,
        email,
        password: await User.hashPassword(password),
        owner: userId,
      });
      await user.save();
      req.session.userId = user.id;
      user.sendEmail("Bienvenido", `Bienvenido a Nodepop ${user.name}.`);
      return res.redirect("/");
    }

    // Login
    const user = await User.findOne({ email: email });

    if (!user || !(await user.comparePassword(password))) {
      res.locals.error = __("Credentials not valid.");
      res.locals.email = email;
      res.locals.newAccount = false;
      res.locals.redir = redir;
      return res.render("login");
    }

    req.session.userId = user.id;
    req.session.name = user.name;

    const welcomeMessage = __("Welcome back to Nodepop, {{name}}!", {
      name: user.name
    });
    req.session.welcomeMessage = welcomeMessage;
    io.to(user.id).emit("session-login", welcomeMessage);

    req.session.save((err) => {
      if (err) return next(err);
    });
    res.redirect(redir ? redir : "/");
  } catch (error) {
    next(error);
    return;
  }
}

export async function logout(req, res, next) {
  const oldSessionId = req.session.id;
  try {
    const userId = req.session.userId;
    const __ = res.__;
    const user = await User.findById(userId);
    const logoutMessage = __("See you soon, {{name}}!", { name: user.name });
    req.session.logoutMessage = logoutMessage;
    io.to(oldSessionId).emit("session-logout", logoutMessage);

    const regenerate = promisify(req.session.regenerate).bind(req.session);
    await regenerate();

    res.redirect("login");
  } catch (error) {
    next(error);
  }
}
