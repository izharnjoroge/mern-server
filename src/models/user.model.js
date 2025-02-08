const mongoose = require("mongoose");

const userSchema = mongoose.Schema(
  {
    userName: {
      type: String,
      required: [true, "Please enter user name"],
    },

    userEmail: {
      type: String,
      required: [true, "Please enter an email"],
      unique:true
    },

    userPassword: {
      type: String,
      required: [true, "Please enter a password"],
      
    },

    userRole: {
      type: String,
      required:false,
      enum:["admin","customer"],
      default:"customer"
    },
  },
  {
    timestamps: true,
  }
);


const User = mongoose.model("User", userSchema);

module.exports = User;