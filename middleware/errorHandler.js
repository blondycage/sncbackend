const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  console.log(req.body,"req.body")
  // Log error
  console.error('Error:', err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = {
      message,
      statusCode: 404
    };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    let message = 'Duplicate field value entered';
    
    // Extract field name from error
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    
    if (field === 'email') {
      message = 'Email address is already registered';
    } else if (field === 'username') {
      message = 'Username is already taken';
    } else if (field === 'telegramId') {
      message = 'Telegram account is already linked to another user';
    } else {
      message = `${field} '${value}' is already in use`;
    }
    
    error = {
      message,
      statusCode: 400
    };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = {
      message,
      statusCode: 400
    };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = {
      message,
      statusCode: 401
    };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = {
      message,
      statusCode: 401
    };
  }

  // Multer errors (file upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = 'File size too large';
    error = {
      message,
      statusCode: 400
    };
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    const message = 'Too many files uploaded';
    error = {
      message,
      statusCode: 400
    };
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    const message = 'Unexpected file field';
    error = {
      message,
      statusCode: 400
    };
  }

  // Stripe errors
  if (err.type && err.type.includes('Stripe')) {
    let message = 'Payment processing error';
    
    switch (err.type) {
      case 'StripeCardError':
        message = 'Your card was declined';
        break;
      case 'StripeRateLimitError':
        message = 'Too many requests made to Stripe API';
        break;
      case 'StripeInvalidRequestError':
        message = 'Invalid payment request';
        break;
      case 'StripeAPIError':
        message = 'Payment service temporarily unavailable';
        break;
      case 'StripeConnectionError':
        message = 'Network error during payment processing';
        break;
      case 'StripeAuthenticationError':
        message = 'Payment authentication failed';
        break;
      default:
        message = 'Payment processing error';
    }
    
    error = {
      message,
      statusCode: 400
    };
  }

  // Cloudinary errors
  if (err.message && err.message.includes('cloudinary')) {
    const message = 'Image upload failed';
    error = {
      message,
      statusCode: 400
    };
  }

  // Rate limiting errors
  if (err.status === 429) {
    const message = 'Too many requests, please try again later';
    error = {
      message,
      statusCode: 429
    };
  }

  // MongoDB connection errors
  if (err.name === 'MongoError' || err.name === 'MongooseError') {
    const message = 'Database connection error';
    error = {
      message,
      statusCode: 500
    };
  }

  // Default error response
  const statusCode = error.statusCode || err.statusCode || 500;
  const message = error.message || 'Server Error';

  // Prepare error response
  const errorResponse = {
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      error: err
    })
  };

  // Add specific error codes for client handling
  if (statusCode === 400) {
    errorResponse.code = 'VALIDATION_ERROR';
  } else if (statusCode === 401) {
    errorResponse.code = 'AUTHENTICATION_ERROR';
  } else if (statusCode === 403) {
    errorResponse.code = 'AUTHORIZATION_ERROR';
  } else if (statusCode === 404) {
    errorResponse.code = 'NOT_FOUND';
  } else if (statusCode === 429) {
    errorResponse.code = 'RATE_LIMIT_ERROR';
  } else if (statusCode >= 500) {
    errorResponse.code = 'SERVER_ERROR';
  }

  res.status(statusCode).json(errorResponse);
};

// Not found middleware
const notFound = (req, res, next) => {
  const error = new Error(`Not found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Async error handler wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Custom error class
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Error types for consistent error handling
const ErrorTypes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_ERROR: 'DUPLICATE_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  UPLOAD_ERROR: 'UPLOAD_ERROR',
  PAYMENT_ERROR: 'PAYMENT_ERROR',
  SERVER_ERROR: 'SERVER_ERROR'
};

// Helper function to create standardized errors
const createError = (message, statusCode, type) => {
  const error = new AppError(message, statusCode);
  error.type = type;
  return error;
};

// Validation error helper
const validationError = (message) => {
  return createError(message, 400, ErrorTypes.VALIDATION_ERROR);
};

// Authentication error helper
const authenticationError = (message = 'Authentication required') => {
  return createError(message, 401, ErrorTypes.AUTHENTICATION_ERROR);
};

// Authorization error helper
const authorizationError = (message = 'Insufficient permissions') => {
  return createError(message, 403, ErrorTypes.AUTHORIZATION_ERROR);
};

// Not found error helper
const notFoundError = (message = 'Resource not found') => {
  return createError(message, 404, ErrorTypes.NOT_FOUND);
};

// Server error helper
const serverError = (message = 'Internal server error') => {
  return createError(message, 500, ErrorTypes.SERVER_ERROR);
};

module.exports = {
  errorHandler,
  notFound,
  asyncHandler,
  AppError,
  ErrorTypes,
  createError,
  validationError,
  authenticationError,
  authorizationError,
  notFoundError,
  serverError
}; 