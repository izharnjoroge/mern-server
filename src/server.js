const express = require("express");
const productRoute = require("./routes/product.route.js");
const authRoute = require("./routes/auth.route.js");
const app = express();
const { mongooseConnect} = require("./config/db.config.js")

// middleware
app.use(express.json());
app.use(express.urlencoded({extended: false}));


mongooseConnect()


// routes
app.use("/api/auth", authRoute);
app.use("/api/products", productRoute);




app.get("/", (req, res) => {
  res.send("Hello from Node API Server Updated");
});


app.listen(3000, () => {
  console.log("Server is running on port 3000");
});



