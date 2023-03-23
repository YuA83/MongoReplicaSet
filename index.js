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

const replicaSet = [
  "127.0.0.1:27017",
  "127.0.0.1:27018",
  "127.0.0.1:27019",
  "127.0.0.1:27020",
]; // replicaSet hosts => error.reason => servers.Map(3)
// const replicaSet = ["mongo1:27017", "mongo2:27018", "mongo3:27019"]; // replicaSet hosts => error.reason => servers.Map(1)
// const replicaSet = ["127.0.0.1:27018", "127.0.0.1:27019"];
// const replicaSet = ["127.0.0.1:27019"];

let mongoClient; // connected mongoDB client
let noReplMongo = [];

const conn = async (index) => {
  try {
    // mongoDB Client connection function
    if (index >= replicaSet.length) {
      throw new Error("Index Over");
    }

    console.log(
      `Try MongoDB Connection - Index ${index} : ${replicaSet[index]} (${
        index + 1
      }/${replicaSet.length})`
    );

    MongoClient.connect(`mongodb://${replicaSet[index]}/test`, {
      auth: {
        username: "root", // mongosh username
        password: "root!", // mongosh password
      },
      // replicaSet: "myReplicaSet", // replicaSet name
      authSource: "admin", // user's auth database
      serverSelectionTimeoutMS: 2000, // server select timeout limit
      directConnection: true,
    })
      .then((client) => {
        // connectoin success mongoDB
        console.log(`<< Success MongoDB Connection : ${replicaSet[index]} >>`);

        client // excute mongosh command db.isMaster();
          .db()
          .command({ isMaster: 1 })
          .then(async (res) => {
            // console.log(res);
            console.log(`>> ismaster \t==> ${res.ismaster}`); // false, true
            console.log(`>> secondary \t==> ${res.secondary}`); // true, undefined
            console.log(`>> primary \t==> ${res.primary}`); // mongo2:27017, undefined
            console.log(`>> me \t\t==> ${res.me}`); // mongo1:27017, undefined
            console.log("<< ========================== >>");

            if (res.me === undefined) {
              /*
              replicaSet에 add 하고 mongoClient = client; => X
              에러 처리 하고 변수에 넣어서 primary 연결까지 loop 돌다가 primary 만나면 rs.add & 변수에서 제거
              */
              console.log("<< No ReplicaSet MongoDB>>");
              console.log("==> Retry MongoDB Connection");

              // throw new Error("NoReplicaSet");
              noReplMongo.push(replicaSet[index]);
              await conn(index + 1);
            } else if (res.ismaster) {
              mongoClient = client; // sync => so, sometimes...client is undefined
              console.log("<< Success Set Primary to MongoClient >>");

              if (noReplMongo.length) {
                // rs.add && noReplMongo clear
                cli;
              }
            } else {
              //   } else if (res.secondary) {
              console.log("<< This MongoDB is Secondary >>");
              console.log("==> Retry MongoDB Connection");

              // throw new Error("Secondary");
              await conn(index + 1);
            }
          });

        /**
         * mongosh command test
        // client // excute mongosh command db.hostInfo();
        //   .db()
        //   .command({ hostInfo: 1 })
        //   .then((res) => console.log(res));

        // client
        //   .db()
        //   .stats()
        //   .then((res) => console.log(res));
         */
      })
      .catch(async (error) => {
        // connection fail mongoDB
        console.error(`<< MongoDB Connection Error : ${error.message} >>`);
        if (
          //   index < replicaSet.length &&
          error.message === `connect ECONNREFUSED ${replicaSet[index]}` // if mongoDB server down
        ) {
          console.log("==> Retry MongoDB Connection");

          await conn(index + 1); // retry another replicaSet mongoDB
        } else {
          // other error
          console.log("==> MongoDB Server Error (May or may not...)");
          console.error(error.reason);
        }
      });
  } catch (error) {
    console.error(`<< Server Error : ${error.message} >>`);
  }
};

// conn(0); // try connect mongoDB replicaSet

MongoClient.connect("mongodb://127.0.0.1:27018/test", {
  auth: {
    username: "root",
    password: "root!",
  },
  authSource: "admin",
  serverSelectionTimeoutMS: 2000,
  directConnection: true,
})
  .then((client) => {
    client
      .db()
      .admin()
      .command({ replSetGetConfig: 1 })
      //   .command({ replSetReconfig: 1 })
      .then((res) => {
        console.log(res);
      });
  })
  .catch((error) => {
    console.log(error.message);
    console.log(error.reason);
  });

app.get("/read", async (req, res, next) => {
  // testing mongoDB client read
  try {
    const db = mongoClient.db("test"); // using "test" database
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
    const db = mongoClient.db("test"); // using "test" database
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
