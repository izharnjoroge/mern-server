const express = require('express');
const router = express.Router();
const {
  createOrder,
  updateOrderStatus,
  getAllOrders,
  getOrderById,
  getUserOrders,
} = require('../controllers/order.controller.js');
const verifyToken = require('../middleware/auth.middleware.js');
const verifyRole = require('../middleware/role.middleware.js');

router.post('/', verifyToken, createOrder);

// Get all orders (admin only)
router.get('/', verifyToken, verifyRole('admin'), getAllOrders);

// Get logged in user's orders
router.get('/myOrders', verifyToken, getUserOrders);

// Get order by ID
router.get('/:id', verifyToken, getOrderById);

// Update order status (verifyRole only)
router.put('/:id/status', verifyToken, verifyRole('admin'), updateOrderStatus);

module.exports = router;
