const express = require("express");
const router = express.Router();

const { connV2 } = require("./mongoConnection");

router.get("/read", async (req, res, next) => {
  // testing mongoDB client read
  try {
    const mongoClient = await connV2();
    const db = mongoClient.db("test"); // using "test" database
    const users = db.collection("users"); // using "users" collection
    // const user = await users.findOne();
    const userList = await users.find().toArray(); // require toArray() if you want to get all data

    console.log("\n<< Success Data Read >>");
    res.send(userList);
  } catch (error) {
    console.log("\n<< API ERROR >>");
    console.error(error);

    res.send("ERROR");
  }
});

router.get("/write", async (req, res, next) => {
  // testing mongoDB client write
  try {
    const mongoClient = await connV2();
    const db = mongoClient.db("test"); // using "test" database
    const users = db.collection("users"); // using "users" collection

    const { username, password } = req.body;
    const userdata = {
      username: username,
      password: password,
    };

    await users.insertOne(userdata);

    console.log("\n<< Success Data Write >>");

    res.send("OK");
  } catch (error) {
    console.log("\n<< API ERROR >>");
    console.error(error);

    res.send("ERROR");
  }
});

module.exports = router;
