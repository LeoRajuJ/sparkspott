const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const User = require("./models/User");
const Post = require("./models/Post");
const bcrypt = require("bcryptjs");
const app = express();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const uploadMiddleware = multer({ dest: "/tmp" });
const fs = require("fs");

const salt = bcrypt.genSaltSync(10);
const secret = "asdfe45we45w345wegw345werjktjwertkj";

app.use(cors({ credentials: true, origin: "https://sparkspott.vercel.app" }));
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(__dirname + "/uploads"));

mongoose.connect(
  "mongodb+srv://blog-test:p0MGbYggLfMAk4W8@cluster0.boo57j8.mongodb.net/?retryWrites=true&w=majority"
);

app.post("api/register", async (req, res) => {
  mongoose.connect(
    "mongodb+srv://blog-test:p0MGbYggLfMAk4W8@cluster0.boo57j8.mongodb.net/?retryWrites=true&w=majority"
  );
  const { username, password } = req.body;
  try {
    const userDoc = await User.create({
      username,
      password: bcrypt.hashSync(password, salt),
    });
    res.json(userDoc);
  } catch (e) {
    console.log(e);
    res.status(400).json(e);
  }
});

app.post("api/login", async (req, res) => {
  mongoose.connect(
    "mongodb+srv://blog-test:p0MGbYggLfMAk4W8@cluster0.boo57j8.mongodb.net/?retryWrites=true&w=majority"
  );
  const { username, password } = req.body;
  const userDoc = await User.findOne({ username });
  const passOk = bcrypt.compareSync(password, userDoc.password);
  if (passOk) {
    // logged in
    jwt.sign({ username, id: userDoc._id }, secret, {}, (err, token) => {
      if (err) throw err;
      res.cookie("token", token).json({
        id: userDoc._id,
        username,
      });
    });
  } else {
    res.status(400).json("wrong credentials");
  }
});

app.get("api/profile", (req, res) => {
  mongoose.connect(
    "mongodb+srv://blog-test:p0MGbYggLfMAk4W8@cluster0.boo57j8.mongodb.net/?retryWrites=true&w=majority"
  );
  const { token } = req.cookies;
  jwt.verify(token, secret, {}, (err, info) => {
    if (err) throw err;
    res.json(info);
  });
});

app.post("api/logout", (req, res) => {
  mongoose.connect(
    "mongodb+srv://blog-test:p0MGbYggLfMAk4W8@cluster0.boo57j8.mongodb.net/?retryWrites=true&w=majority"
  );
  res.cookie("token", "").json("ok");
});

app.post("api/post", uploadMiddleware.single("file"), async (req, res) => {
  mongoose.connect(
    "mongodb+srv://blog-test:p0MGbYggLfMAk4W8@cluster0.boo57j8.mongodb.net/?retryWrites=true&w=majority"
  );
  const { originalname, path } = req.file;
  const parts = originalname.split(".");
  const ext = parts[parts.length - 1];
  const newPath = path + "." + ext;
  fs.renameSync(path, newPath);

  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) throw err;
    const { title, summary, content } = req.body;
    const postDoc = await Post.create({
      title,
      summary,
      content,
      cover: newPath,
      author: info.id,
    });
    res.json(postDoc);
  });
});

app.put("api/post", uploadMiddleware.single("file"), async (req, res) => {
  mongoose.connect(
    "mongodb+srv://blog-test:p0MGbYggLfMAk4W8@cluster0.boo57j8.mongodb.net/?retryWrites=true&w=majority"
  );
  let newPath = null;
  if (req.file) {
    const { originalname, path } = req.file;
    const parts = originalname.split(".");
    const ext = parts[parts.length - 1];
    newPath = path + "." + ext;
    fs.renameSync(path, newPath);
  }

  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) throw err;
    const { id, title, summary, content } = req.body;
    const postDoc = await Post.findById(id);
    const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
    if (!isAuthor) {
      return res.status(400).json("you are not the author");
    }
    await postDoc.update({
      title,
      summary,
      content,
      cover: newPath ? newPath : postDoc.cover,
    });

    res.json(postDoc);
  });
});

app.get("api/post", async (req, res) => {
  mongoose.connect(
    "mongodb+srv://blog-test:p0MGbYggLfMAk4W8@cluster0.boo57j8.mongodb.net/?retryWrites=true&w=majority"
  );
  res.json(
    await Post.find()
      .populate("author", ["username"])
      .sort({ createdAt: -1 })
      .limit(20)
  );
});

app.get("api/post/:id", async (req, res) => {
  mongoose.connect(
    "mongodb+srv://blog-test:p0MGbYggLfMAk4W8@cluster0.boo57j8.mongodb.net/?retryWrites=true&w=majority"
  );
  const { id } = req.params;
  const postDoc = await Post.findById(id).populate("author", ["username"]);
  res.json(postDoc);
});

app.listen(4000);
//
module.exports = app;
