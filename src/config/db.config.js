const mongoose = require("mongoose");
require("dotenv").config();


async function mongooseConnect(){
    mongoose
.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to database!");
  })
  .catch((error) => {
    console.log("Connection failed!",error);
  });
}

module.exports = {mongooseConnect}