const express = require("express");
const cookieParser = require("cookie-parser");
const http = require("http");

const app = express();
const server = http.createServer(app);
const port = 9700;

// const { testConn } = require("./testConnection");
const controller = require("./controller");

app.use(express.json());
app.use(cookieParser());
app.use("/", controller);

// testConn(); // test mongoDB replicaSet Connection

server.listen(port, () => {
  console.log(`\n<< Server on ${port} Port >>`);
});
