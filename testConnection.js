// test code
const { MongoClient } = require("mongodb");

const testPrimary = "127.0.0.1:27017";

const testConn = () => {
  MongoClient.connect(`mongodb://${testPrimary}/test`, {
    auth: {
      username: "root",
      password: "root!",
    },
    authSource: "admin",
    serverSelectionTimeoutMS: 2000,
    directConnection: true,
  })
    .then(async (client) => {
      const adminDB = client.db().admin();
      let setName, version, me;
      let memberIndex = 0;
      let memberHosts = [];
      let newMembers = [];

      // check pre-version replicaSet config
      // rs.conf() or rs.status()
      // await adminDB.command({ replSetGetConfig: 1 }).then((res) => {
      //   console.log("<< Success Get ReplicaSet Config >>");
      //   console.log(res);
      // });

      // db.isMaster()
      await adminDB.command({ isMaster: 1 }).then((res) => {
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
      });

      if (noReplHosts.length) {
        for (const host of noReplHosts) {
          newMembers.push({ _id: memberIndex, host: host });

          memberIndex++;
        }

        noReplHosts = [];
      }

      console.log("\n<< Success Set New ReplicaSet Members >>");

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
      await adminDB.command({ replSetReconfig: newConfig }).then((res) => {
        console.log("\n<< Success ReplicaSet Reconfig >>");
        console.log(res);
      });
    })
    .catch((error) => {
      console.log(error.message);
      console.log(error.reason);
    });
};

module.exports = {
  testConn,
};
