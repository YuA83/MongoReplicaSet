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

// const replicaSet = ["127.0.0.1:27017", "127.0.0.1:27018", "127.0.0.1:27019"];
const replicaSet = ["127.0.0.1:27017", "127.0.0.1:27019", "127.0.0.1:27018"];

let mongoClient; // connected mongoDB client
let noReplHosts = [];
let setName, version, me;
let memberIndex = 0;
let memberHosts = [];
let newMembers = [];

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
          return client;
          //   break;
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

  /*
  MongoClient.connect(`mongodb://${replica}/test`, {
    auth: {
      username: "root", // mongosh username
      password: "root!", // mongosh password
    },
    authSource: "admin", // user's auth database
    serverSelectionTimeoutMS: 2000, // server select timeout limit
    directConnection: true,
  })
    .then(async (client) => {
      console.log(`\n<< Success MongoDB Connection : ${replica} >>`);

      const adminDB = client.db().admin();
      // db.isMaster();
      adminDB.command({ isMaster: 1 }).then(async (res) => {
        if (res.me === undefined) {
          console.log("\n<< No ReplicaSet MongoDB>>");
          console.log("==> Retry MongoDB Connection");

          noReplHosts.push(replica);
          return false;
        } else if (res.ismaster) {
          setName = res.setName;
          version = res.setVersion;
          me = res.me;

          for (const host of res.hosts) {
            newMembers.push({ _id: memberIndex, host: host });
            memberIndex++;

            if (host === me) {
              continue;
            }

            memberHosts.push(host);
          }

          if (noReplHosts.length) {
            for (const host of noReplHosts) {
              newMembers.push({ _id: memberIndex, host: host });
              memberIndex++;
            }

            noReplHosts = [];
          }

          console.log("\n<< Success Set New ReplicaSet Members >>");
          console.log(newMembers);

          const dropMember = {
            dropConnections: 1,
            hostAndPort: memberHosts,
          };
          const newConfig = {
            _id: setName,
            version: version + 1,
            members: newMembers,
          };

          await adminDB.command(dropMember).then((res) => {
            console.log("\n<< Success Drop Members >>");
            console.log(res);
          });

          await adminDB.command({ replSetReconfig: newConfig }).then((res) => {
            console.log("\n<< Success ReplicaSet Reconfig >>");
            console.log(res);
          });

          console.log("\n<< Success Set Primary to MongoClient >>");

          memberIndex = 0;
          memberHosts = [];
          newMembers = [];

          return client;
        } else {
          console.log("\n<< This MongoDB is Secondary >>");
          console.log("==> Retry MongoDB Connection");

          return false;
        }
      });
    })
    .catch(async (error) => {
      console.error(`\n<< MongoDB Connection Error : ${error.message} >>`);
      if (
        error.message === `connect ECONNREFUSED ${replica}` // if mongoDB server down
      ) {
        console.log("==> Retry MongoDB Connection");

        return false;
      } else {
        console.log("==> MongoDB Server Error (May or may not...)");
        console.error(error.reason);
        throw new Error(error);
      }
    });
    */
};

// conn(0); // try connect mongoDB replicaSet
// conn();

app.get("/read", async (req, res, next) => {
  // testing mongoDB client read
  try {
    const client = await conn();

    // const db = mongoClient.db("test"); // using "test" database
    const db = client.db("test"); // using "test" database
    const users = db.collection("users"); // using "users" collection
    // const user = await users.findOne();
    const userList = await users.find().toArray(); // require toArray() if you want to get all data

    console.log("Read OK");
    // res.send({
    //   user: user,
    //   userList: userList,
    // });
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
    const client = await conn();

    // const db = mongoClient.db("test"); // using "test" database
    const db = client.db("test"); // using "test" database
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
