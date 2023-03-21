const express = require("express");
const cookieParser = require("cookie-parser");
const http = require("http");

/**
 * https://www.mongodb.com/docs/drivers/node/current/quick-reference/
 */
const { MongoClient } = require("mongodb"); // using MongoDB Node.js Driver (Not mongoose)

const app = express();
const server = http.createServer(app);
const port = 9700;

app.use(express.json());
app.use(cookieParser());

// const replicaSet = ["127.0.0.1:27017", "127.0.0.1:27018", "127.0.0.1:27019"]; // replicaSet hosts => error.reason => servers.Map(3)
const replicaSet = ["mongo1:27017", "mongo2:27018", "mongo3:27019"]; // replicaSet hosts => error.reason => servers.Map(1)
// const replicaSet = ["127.0.0.1:27018", "127.0.0.1:27019"];
// const replicaSet = ["127.0.0.1:27019"];

let client; // connected mongoDB client

const conn = async (index) => {
  // mongoDB Client connection function
  console.log(index);
  console.log(replicaSet[index]);

  MongoClient.connect(`mongodb://${replicaSet[index]}/test`, {
    auth: {
      username: "root", // mongosh username
      password: "root!", // mongosh password
    },
    replicaSet: "myReplicaSet", // replicaSet name
    authSource: "admin", // user's auth database
    serverSelectionTimeoutMS: 2000, // server select timeout limit
  })
    .then((result) => {
      // connectoin success mongoDB
      console.log("ok");
      client = result; // sync => so, sometimes...client is undefined
    })
    .catch(async (error) => {
      // connection fail mongoDB
      if (
        index < replicaSet.length &&
        error.message === `connect ECONNREFUSED ${replicaSet[index]}` // if mongoDB server down
      ) {
        console.log("retry..");
        await conn(index + 1); // retry another replicaSet mongoDB
      } else {
        // other error
        // console.log(error.message);
        console.log("no...");
        // console.error(error);
        console.error(error.reason);
      }
    });
};

conn(0); // try connect mongoDB replicaSet

app.get("/read", async (req, res, next) => {
  // testing mongoDB client read
  try {
    const db = client.db("test"); // using "test" database
    const users = db.collection("users"); // using "users" collection
    const user = await users.findOne();
    const userList = await users.find().toArray(); // require toArray() if you want to get all data

    console.log("Read OK");
    res.send({
      user: user,
      userList: userList,
    });
  } catch (error) {
    console.log(
      "[ E R R O R ===================================== E R R O R ]"
    );
    console.error(error);
    console.log(
      "[ E R R O R ===================================== E R R O R ]"
    );

    res.send("ERROR");
  }
});

app.get("/write", async (req, res, next) => {
  // testing mongoDB client write
  try {
    const db = client.db("test"); // using "test" database
    const users = db.collection("users"); // using "users" collection

    const { username, password } = req.body;
    const userdata = {
      username: username,
      password: password,
    };

    await users.insertOne(userdata);

    console.log("Write OK");
    res.send("OK");
  } catch (error) {
    console.log(
      "[ E R R O R ===================================== E R R O R ]"
    );
    console.error(error);
    console.log(
      "[ E R R O R ===================================== E R R O R ]"
    );

    res.send("ERROR");
  }
});

server.listen(port, () => {
  console.log(`Server on ${port} Port`);
});
