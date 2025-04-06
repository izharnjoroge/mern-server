const Order = require('../models/order.model');
const Product = require('../models/product.model');
const { createClient } = require('redis');
const {
  successResponse,
  errorResponse,
  notFoundResponse,
  validationError,
} = require('../errors/errors');

// Initialize Valkey client
const client = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

client.on('error', (err) => console.error('Valkey error:', err));
client.connect();

// Cache TTL (1 hour for orders)
const ORDER_CACHE_TTL = 3600;

async function createOrder(req, res) {
  try {
    const { items, shippingAddress, paymentMethod } = req.body;
    const userId = req.user._id;

    if (!items || !items.length) {
      return validationError(res, ['At least one item is required']);
    }

    let totalAmount = 0;
    const orderItems = [];
    const productUpdates = [];

    // Validate items and calculate total
    for (const item of items) {
      const product = await Product.findById(item.product).lean();
      if (!product) {
        return notFoundResponse(res, `Product ${item.product}`);
      }

      if (product.quantity < item.quantity) {
        return errorResponse(
          res,
          `Insufficient quantity for product ${product.name}`,
          400
        );
      }

      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        priceAtPurchase: product.price,
      });

      // Prepare product quantity updates
      productUpdates.push(
        Product.findByIdAndUpdate(
          product._id,
          { $inc: { quantity: -item.quantity } },
          { new: true }
        )
      );
    }

    // Execute all product updates
    await Promise.all(productUpdates);

    const order = await Order.create({
      user: userId,
      items: orderItems,
      totalAmount,
      shippingAddress,
      paymentMethod,
    });

    // Invalidate user's order cache
    await client.del(`user_orders:${userId}`);

    successResponse(res, order, 201);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return validationError(
        res,
        Object.values(error.errors).map((e) => e.message)
      );
    }
    errorResponse(res, 'Failed to create order', 500, error);
  }
}

async function getAllOrders(req, res) {
  try {
    const cacheKey = 'all_orders';
    console.time('getOrder');
    console.log('called');
    const cached = await client.get(cacheKey);

    if (cached) {
      console.timeEnd('getOrder');
      return successResponse(res, JSON.parse(cached));
    }

    const orders = await Order.find()
      .populate('user', 'name email')
      .populate('items.product', 'name image')
      .lean();

    await client.setEx(cacheKey, ORDER_CACHE_TTL, JSON.stringify(orders));
    successResponse(res, orders);
  } catch (error) {
    errorResponse(res, 'Failed to fetch orders', 500, error);
  }
}

async function getUserOrders(req, res) {
  try {
    const userId = req.user._id;
    const cacheKey = `user_orders:${userId}`;
    const cached = await client.get(cacheKey);

    if (cached) {
      return successResponse(res, JSON.parse(cached));
    }

    const orders = await Order.find({ user: userId })
      .populate('items.product', 'name image')
      .sort({ createdAt: -1 })
      .lean();

    await client.setEx(cacheKey, ORDER_CACHE_TTL, JSON.stringify(orders));
    successResponse(res, orders);
  } catch (error) {
    errorResponse(res, 'Failed to fetch user orders', 500, error);
  }
}

async function getOrderById(req, res) {
  try {
    const orderId = req.params.id;
    const cacheKey = `order:${orderId}`;
    const cached = await client.get(cacheKey);

    if (cached) {
      const parsedOrder = JSON.parse(cached);
      // Check authorization if needed
      // if (parsedOrder.user.toString() !== req.user._id.toString()) {
      //   return forbiddenResponse(res);
      // }
      return successResponse(res, parsedOrder);
    }

    const order = await Order.findById(orderId)
      .populate('user', 'name email')
      .populate('items.product', 'name image price')
      .lean();

    if (!order) {
      return notFoundResponse(res, 'Order');
    }

    // Authorization check
    // if (order.user._id.toString() !== req.user._id.toString()) {
    //   return forbiddenResponse(res);
    // }

    await client.setEx(cacheKey, ORDER_CACHE_TTL, JSON.stringify(order));
    successResponse(res, order);
  } catch (error) {
    errorResponse(res, 'Failed to fetch order', 500, error);
  }
}

async function updateOrderStatus(req, res) {
  try {
    const { status } = req.body;
    const validStatuses = [
      'pending',
      'processing',
      'shipped',
      'delivered',
      'cancelled',
    ];

    if (!validStatuses.includes(status)) {
      return validationError(res, ['Invalid status'], { validStatuses });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return notFoundResponse(res, 'Order');
    }

    // Status transition validation
    if (order.status === 'cancelled' && status !== 'cancelled') {
      return errorResponse(
        res,
        'Cannot change status of a cancelled order',
        400
      );
    }

    if (order.status === 'delivered' && status !== 'delivered') {
      return errorResponse(
        res,
        'Cannot change status of a delivered order',
        400
      );
    }

    order.status = status;
    const updatedOrder = await order.save();

    // Invalidate relevant caches
    await Promise.all([
      client.del(`order:${order._id}`),
      client.del(`user_orders:${order.user}`),
      status === 'cancelled' && client.del('all_orders'),
    ]);

    successResponse(res, {
      message: 'Order status updated successfully',
      order: updatedOrder,
    });
  } catch (error) {
    errorResponse(res, 'Failed to update order status', 500, error);
  }
}

module.exports = {
  createOrder,
  updateOrderStatus,
  getAllOrders,
  getOrderById,
  getUserOrders,
};
