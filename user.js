const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const UserSchema = new Schema(
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

const Users = model("Users", UserSchema);
module.exports = UserSchema;
