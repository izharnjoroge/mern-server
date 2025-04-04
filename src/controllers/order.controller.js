const Order = require('../models/order.model');
const Product = require('../models/product.model');

async function createOrder(req, res) {
  try {
    const { items, shippingAddress, paymentMethod } = req.body;
    const userId = req.user._id;

    // Validate items and calculate total
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res
          .status(404)
          .json({ message: `Product ${item.product} not found` });
      }

      if (product.quantity < item.quantity) {
        return res.status(400).json({
          message: `Insufficient quantity for product ${product.name}`,
        });
      }

      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        priceAtPurchase: product.price,
      });

      // Update product quantity
      product.quantity -= item.quantity;
      await product.save();
    }

    const order = new Order({
      user: userId,
      items: orderItems,
      totalAmount,
      shippingAddress,
      paymentMethod,
    });

    const savedOrder = await order.save();
    res.status(201).json(savedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function getAllOrders(req, res) {
  try {
    const orders = await Order.find()
      .populate('user', 'name email')
      .populate('items.product', 'name image');
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function getUserOrders(req, res) {
  try {
    const orders = await Order.find({ user: req.user._id }).populate(
      'items.product',
      'name image'
    );
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function getOrderById(req, res) {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('items.product', 'name image price');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // // Check if the user is authorized to view this order
    // if (
    //   order.user._id.toString() !== req.user._id.toString()
    // ) {
    //   return res
    //     .status(403)
    //     .json({ message: 'Not authorized to view this order' });
    // }

    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

async function updateOrderStatus(req, res) {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // List of valid status values
    const validStatuses = [
      'pending',
      'processing',
      'shipped',
      'delivered',
      'cancelled',
    ];

    // Validate the new status
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: 'Invalid status',
        validStatuses: validStatuses,
      });
    }

    // Optional: Add status transition validation
    if (order.status === 'cancelled' && status !== 'cancelled') {
      return res.status(400).json({
        message: 'Cannot change status of a cancelled order',
      });
    }

    if (order.status === 'delivered' && status !== 'delivered') {
      return res.status(400).json({
        message: 'Cannot change status of a delivered order',
      });
    }

    order.status = status;
    const updatedOrder = await order.save();

    res.status(200).json({
      message: 'Order status updated successfully',
      order: updatedOrder,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to update order status',
      error: error.message,
    });
  }
}

module.exports = {
  createOrder,
  updateOrderStatus,
  getAllOrders,
  getOrderById,
  getUserOrders,
};
