require("dotenv").config();
const express = require("express");
const app = express();
const multer = require("multer");
const AWS = require("aws-sdk");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const { authenticate } = require("passport");

const BucketName = process.env.BUCKET_NAME;
var folder = " ";

//MIDDLEWARE
app.use(bodyParser.json());
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
mongoose.set('strictQuery', true);

AWS.config.update({
  accessKeyId: process.env.ACCESS_KEY,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
  region: process.env.REGION
})

const storage = multer.memoryStorage()
const upload = multer({ storage })

app.use(
  session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

const mongoURI = process.env.MONGO_LINK;
mongoose.connect(mongoURI)

//FOR AUTHENTICATION
const IdandpassSchema = new mongoose.Schema({
  username: String,
  userid: String,
  password: String,
});

IdandpassSchema.plugin(passportLocalMongoose);
const Idandpass = mongoose.model("idandpass", IdandpassSchema);

passport.use(Idandpass.createStrategy());
passport.serializeUser(Idandpass.serializeUser());
passport.deserializeUser(Idandpass.deserializeUser());

app.get("/", function (req, res) {
  res.render("main.ejs");
});

app.get("/register", function (req, res) {
  res.render("register.ejs");
});

app.post("/register", function (req, res) {
  const username = req.body.username;
  const userid = req.body.usermail;
  const p1 = req.body.password;
  const p2 = req.body.confirmPassword;

  if (p1 === p2) {
    Idandpass.register({ username: username, userid: userid }, p1, function (err, user) {
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, function () {
          res.redirect("/home");
        });
      }
    });
  } else {
    res.send("<h1>Password and confirm password fields doesnot match, go back and Retry.</h1>");
  }

});

app.get("/login", function (req, res) {
  res.render("login.ejs");
});

app.post("/login", function (req, res) {
  const loginId = req.body.username;
  const loginPassword = req.body.password;
  folder = loginId;
  const user = new Idandpass({
    username: loginId,
    password: loginPassword,
  });

  req.login(user, function (err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/home");
      });
    }
  });
});

app.get("/home", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("home");
  } else {
    res.redirect("/");
  }
});

app.get("/logout", function (req, res) {
  res.redirect("/");
});

app.get("/upload", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("upload");
  } else {
    res.redirect("/");
  }
});

app.post("/upload", upload.array("files"), (req, res) => {
  if (req.isAuthenticated()) {
    if (!req.files || req.files.length === 0) {
      return res.status(400).send("No file has been selected")
    }

    const s3 = new AWS.S3()
    const uploadPromises = req.files.map((file) => {
      const uploadParams = {
        Bucket: BucketName,
        Key: folder + "/" + file.originalname,
        Body: file.buffer,
      };
      return s3.upload(uploadParams).promise()
    })
    Promise.all(uploadPromises)
      .then((data) => {
        data.forEach((uploadResult) => {
          console.log("File Uploaded Successfully");
          res.redirect("/upload");
        })
      })
  } else {
    res.redirect("/");
  }
  console.log(folder);
})

app.get("/files", (req, res) => {
  if (req.isAuthenticated()) {
    const s3 = new AWS.S3()

    const listParams = {
      Bucket: BucketName,
      Prefix: folder
    }

    s3.listObjectsV2(listParams, (err, data) => {
      if (err) {
        console.error("Error fetching files", err);
        return res.status(500).send("Internal Server Error");
      } else {
        const files = data.Contents;
        if (files.length == 0) {
          res.send("<h1>NO Files To Display !")
        } else {
          res.render("files", { files: files })
        }
      }
    })
  } else {
    res.redirect("/")
  }
})

app.post("/files", (req, res) => {
  if (req.isAuthenticated()) {
    const filekey = req.body.filename;
    const s3 = new AWS.S3()
    const deleteParams = {
      Bucket: BucketName,
      Key: filekey
    }

    s3.deleteObject(deleteParams, (err, data) => {
      if (err) {
        console.error("Error deleting file: ", err);
        return res.status(500).send("Internal Server Error");
      }
      res.redirect("/files")
    })
  } else {
    res.redirect("/")
  }
})

app.get("/download", (req, res) => {
  if (req.isAuthenticated()) {
    const s3 = new AWS.S3()

    const listParams = {
      Bucket: BucketName,
      Prefix: folder
    }

    s3.listObjectsV2(listParams, (err, data) => {
      if (err) {
        console.error("Error fetching files", err);
        return res.status(500).send("Internal Server Error");
      } else {
        const files = data.Contents;
        if (files.length == 0) {
          res.send("<h1>NO Files To Display !")
        } else {
          res.render("download", { files: files })
        }
      }
    })
  } else {
    res.redirect("/")
  }
})

app.post("/download", (req, res) => {
  if (req.isAuthenticated()) {
    const filekey = req.body.filename;
    const s3 = new AWS.S3()
    const downloadParams = {
      Bucket: BucketName,
      Key: filekey
    }

    s3.getObject(downloadParams, (err, data) => {
      if (err) {
        console.error("Error deleting file: ", err);
        return res.status(500).send("Internal Server Error");
      } else {
        res.attachment(filekey)
        res.send(data.Body);
      }
    })
  } else {
    res.redirect("/download")
  }
})

const port = process.env.PORT || 3000;

app.listen(port, function () {
  console.log("Server has started Successfully.");
});
