/**
 * https://www.mongodb.com/docs/drivers/node/current/quick-reference/
 */
const { MongoClient } = require("mongodb"); // using MongoDB Node.js Driver (Not mongoose)

const replicaSet = [
  "127.0.0.1:27017", // mongo1:27017
  "127.0.0.1:27018", // mongo2:27018
  "127.0.0.1:27019", // mongo3:27019
  //   "127.0.0.1:27020",
];

const option = {
  auth: {
    username: "root", // mongosh username
    password: "root!", // mongosh password
  },
  // replicaSet: "myReplicaSet", // replicaSet name
  authSource: "admin", // user's auth database
  serverSelectionTimeoutMS: 2000, // server select timeout limit
  directConnection: true,
};

let mongoClient; // connected mongoDB client
let noReplHosts = [];

const conn = async (index) => {
  try {
    // mongoDB Client connection function
    if (index >= replicaSet.length) {
      throw new Error("Index Over");
    }

    console.log(
      `\n<< Try MongoDB Connection >>\n>> Index ${index} : ${
        replicaSet[index]
      } (${index + 1}/${replicaSet.length})`
    );

    MongoClient.connect(`mongodb://${replicaSet[index]}/test`, option)
      .then(async (client) => {
        // connectoin success mongoDB
        console.log(
          `\n<< Success MongoDB Connection : ${replicaSet[index]} >>`
        );

        const adminDB = client.db().admin();
        let setName, version, me;
        let memberIndex = 0;
        let memberHosts = [];
        let newMembers = [];

        // db.isMaster();
        adminDB.command({ isMaster: 1 }).then(async (res) => {
          // console.log(res);
          console.log(`>> ismaster \t==> ${res.ismaster}`); // replicaSet member? false :  true
          console.log(`>> secondary \t==> ${res.secondary}`); // replicaSet member? true : undefined
          console.log(`>> primary \t==> ${res.primary}`); // replicaSet member? mongo2:27017 : undefined
          console.log(`>> me \t\t==> ${res.me}`); // replicaSet member? mongo1:27017 : undefined
          console.log("<< ========================== >>");

          if (res.me === undefined) {
            // No ReplicaSet MongoDB Server
            console.log("\n<< No ReplicaSet MongoDB>>");
            console.log("==> Retry MongoDB Connection");

            // throw new Error("NoReplicaSet");
            noReplHosts.push(replicaSet[index]);
            await conn(index + 1);
          } else if (res.ismaster) {
            // Primary MongoDB Server
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
              // rs.add && noReplHosts clear
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

            // rs.remove()
            await adminDB.command(dropMember).then((res) => {
              console.log("\n<< Success Drop Members >>");
              console.log(res);
            });
            // rs.add() or rs.reconfig()
            await adminDB
              .command({ replSetReconfig: newConfig })
              .then((res) => {
                console.log("\n<< Success ReplicaSet Reconfig >>");
                console.log(res);
              });

            mongoClient = client; // sync => so, sometimes...client is undefined
            console.log("\n<< Success Set Primary to MongoClient >>");
          } else {
            // Secondary MongoDB Server
            //   } else if (res.secondary) {
            console.log("\n<< This MongoDB is Secondary >>");
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
        console.error(`\n<< MongoDB Connection Error : ${error.message} >>`);
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
    console.error(`\n<< Server Error : ${error.message} >>`);
  }
};

const connV2 = async () => {
  for (const replica of replicaSet) {
    try {
      const client = await MongoClient.connect(
        `mongodb://${replica}/test`,
        option
      );

      if (client) {
        console.log(`\n<< Success Connection >>\n>> ${replica}`);

        const mongoCommand = await client.db().admin().command({ isMaster: 1 });

        if (mongoCommand.ismaster) {
          console.log(`\n<< Master(Primary) MongoDB >>\n>> ${replica}`);
          //   mongoClient = client;
          //   break;
          return client;
        } else {
          continue;
        }
      }
    } catch (error) {
      if (error.message === `connect ECONNREFUSED ${replica}`) {
        console.log("\n<< Retry Connection >>");
        continue;
      } else {
        console.log("\n<< MongoDB Connection Error >>");
        console.error(error);
        throw new Error(error);
      }
    }
  }
};

module.exports = {
  //   conn,
  //   mongoClient,
  connV2,
};
