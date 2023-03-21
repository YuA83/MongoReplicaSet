const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const User = new Schema(
  {
    username: {
      type: String,
    },
    password: {
      type: String,
    },
  },
  { timestamps: true }
);

const Users = model("Users", User);
module.exports = Users;
