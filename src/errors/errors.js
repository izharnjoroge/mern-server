// utils/responseHelpers.js
function successResponse(res, data, statusCode = 200) {
  res.status(statusCode).json({
    success: true,
    data,
  });
}

function errorResponse(res, message, statusCode = 500, error = null) {
  const response = {
    success: false,
    message,
  };

  if (error && process.env.NODE_ENV === 'development') {
    response.error = error.message;
    response.stack = error.stack;
  }

  console.error(`[${statusCode}] ${message}:`, error);
  res.status(statusCode).json(response);
}

function notFoundResponse(res, resource = 'Resource') {
  this.errorResponse(res, `${resource} not found`, 404);
}

function validationError(res, errors) {
  this.errorResponse(res, 'Validation failed', 400, { errors });
}

module.exports = {
  successResponse,
  notFoundResponse,
  validationError,
  errorResponse,
};
