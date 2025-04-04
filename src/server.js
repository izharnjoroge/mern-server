const express = require('express');
const productRoute = require('./routes/product.route.js');
const authRoute = require('./routes/auth.route.js');
const orderRoute = require('./routes/order.route.js');
const app = express();
const { mongooseConnect } = require('./config/db.config.js');

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

mongooseConnect();

// routes
app.use('/api/v1/auth', authRoute);
app.use('/api/v1/products', productRoute);
app.use('/api/v1/orders', orderRoute);

app.get('/', (req, res) => {
  res.send('Hello from Server Updated');
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
