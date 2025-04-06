const Product = require('../models/product.model');
const {
  successResponse,
  errorResponse,
  notFoundResponse,
  validationError,
} = require('../errors/errors');

const { createClient } = require('redis');

// Initialize Valkey client
const client = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

client.on('error', (err) => console.error('Valkey error:', err));
client.connect();

// Cache TTL (5 minutes)
const CACHE_TTL = 300;

async function getProducts(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;
    const cacheKey = `products:page:${page}:limit:${limit}`;

    // Try cache first
    const cached = await client.get(cacheKey);
    if (cached) {
      return successResponse(res, JSON.parse(cached));
    }

    // Cache miss - fetch from DB
    const [totalProducts, products] = await Promise.all([
      Product.countDocuments({}),
      Product.find({})
        .select('name quantity price image createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const response = {
      products,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalProducts / limit),
        totalProducts,
        hasNextPage: page < Math.ceil(totalProducts / limit),
        hasPreviousPage: page > 1,
      },
    };

    await client.setEx(cacheKey, CACHE_TTL, JSON.stringify(response));
    successResponse(res, response);
  } catch (error) {
    errorResponse(res, 'Failed to fetch products', 500, error);
  }
}

async function getProduct(req, res) {
  try {
    const cacheKey = `product:${req.params.id}`;
    const cached = await client.get(cacheKey);
    if (cached) {
      return successResponse(res, JSON.parse(cached));
    }

    const product = await Product.findById(req.params.id).select('-__v').lean();
    if (!product) {
      return notFoundResponse(res, 'Product');
    }

    await client.setEx(cacheKey, CACHE_TTL, JSON.stringify(product));
    successResponse(res, product);
  } catch (error) {
    errorResponse(res, 'Failed to fetch product', 500, error);
  }
}

async function createProduct(req, res) {
  try {
    if (!req.body.name || !req.body.price) {
      return validationError(res, ['Name and price are required']);
    }

    const product = await Product.create(req.body);
    await client.del('products:*');
    successResponse(res, product, 201);
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 'Product with this name already exists', 400);
    }
    errorResponse(res, 'Failed to create product', 500, error);
  }
}

async function updateProduct(req, res) {
  try {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['name', 'price', 'quantity', 'image'];
    const isValidOperation = updates.every((update) =>
      allowedUpdates.includes(update)
    );

    if (!isValidOperation) {
      return validationError(res, ['Invalid updates!']);
    }

    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).select('-__v');

    if (!product) {
      return notFoundResponse(res, 'Product');
    }

    await Promise.all([
      client.del(`product:${req.params.id}`),
      client.del('products:*'),
    ]);

    successResponse(res, product);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return validationError(
        res,
        Object.values(error.errors).map((e) => e.message)
      );
    }
    errorResponse(res, 'Failed to update product', 500, error);
  }
}

async function deleteProduct(req, res) {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return notFoundResponse(res, 'Product');
    }

    await Promise.all([
      client.del(`product:${req.params.id}`),
      client.del('products:*'),
    ]);

    successResponse(res, { id: product._id, name: product.name });
  } catch (error) {
    errorResponse(res, 'Failed to delete product', 500, error);
  }
}

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
};
