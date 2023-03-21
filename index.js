const express = require("express");
const cookieParser = require("cookie-parser");
const http = require("http");
const mongoose = require("mongoose");

const app = express();
const server = http.createServer(app);
const port = 9700;
const mongoURI =
  //   "mongodb://root:root!@127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+1.8.0";
  //   "mongodb://root:root!@127.0.0.1:27017,127.0.0.1:27018,127.0.0.1:27019/?authSource=admin&replicaSet=myReplicaSet&readPreference=primaryPreferred";
  //   "mongodb://root:root!@127.0.0.1:27017/?authSource=admin&replicaSet=myReplicaSet&readPreference=primaryPreferred";
  // "mongodb://root:root!@localhost:27017,localhost:27018,localhost:27019/?replicaSet=myReplicaSet";
  "mongodb://root:root!@127.0.0.1:27017/?directConnection=true";

const Users = require("./user");

app.use(express.json());
app.use(cookieParser());

mongoose
  .connect(mongoURI, { dbName: "test" })
  .then(() => {
    console.log("mongo connection success");
  })
  .catch((error) => {
    console.error("mongo connection error" + error);
  });

app.get("/", (req, res, next) => {
  try {
    const { username, password } = req.body;
    console.log(
      `Request User Data\n username: ${username}, password: ${password}`
    );

    const userdata = new Users({
      username: username,
      password: password,
    });

    userdata.save();

    res.send("OK");
  } catch (error) {
    console.log("[ E R R O R=====================================E R R O R ]");
    console.error(error);
    console.log("[ E R R O R=====================================E R R O R ]");

    res.send("ERROR");
  }
});

server.listen(port, () => {
  console.log("server on " + port);
});
