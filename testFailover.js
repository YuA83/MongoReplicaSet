const express = require("express");
const cookieParser = require("cookie-parser");
const http = require("http");
const { MongoClient } = require("mongodb"); // using MongoDB Node.js Driver (Not mongoose)

const app = express();
const server = http.createServer(app);
const port = 9700;

app.use(express.json());
app.use(cookieParser());

const replicaSet = ["127.0.0.1:27017", "127.0.0.1:27019", "127.0.0.1:27018"];

let mongoClient; // connected mongoDB client

const conn = async () => {
  //connect ECONNREFUSED 127.0.0.1:27017
  for (const replica of replicaSet) {
    try {
      const client = await MongoClient.connect(`mongodb://${replica}/test`, {
        auth: {
          username: "root", // mongosh username
          password: "root!", // mongosh password
        },
        authSource: "admin", // user's auth database
        serverSelectionTimeoutMS: 2000, // server select timeout limit
        directConnection: true,
      });

      if (client) {
        console.log(`success connection => ${replica}`);

        const mongoCommand = await client.db().admin().command({ isMaster: 1 });

        if (mongoCommand.ismaster) {
          console.log(`${replica} is master`);
          mongoClient = client;
          break;
        } else {
          continue;
        }
      }
    } catch (error) {
      if (error.message === `connect ECONNREFUSED ${replica}`) {
        console.log("retry connection");
        continue;
      } else {
        console.log("mongo connection error");
        console.error(error);
      }
    }
  }
};

app.get("/read", async (req, res, next) => {
  // testing mongoDB client read
  try {
    await conn();

    const db = mongoClient.db("test"); // using "test" database
    const users = db.collection("users"); // using "users" collection
    const userList = await users.find().toArray(); // require toArray() if you want to get all data

    console.log("Read OK");

    res.send(userList);
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
    await conn();

    const db = mongoClient.db("test"); // using "test" database
    const users = db.collection("users"); // using "users" collection

    const { username, password } = req.body;
    const userdata = {
      username: username,
      password: password,
    };

    users.insertOne(userdata);

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
  console.log(`\n<< Server on ${port} Port >>`);
});
