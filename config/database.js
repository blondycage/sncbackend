const mongoose = require('mongoose');

/**
 * Connect to MongoDB database
 */
const connectDB = async () => {
  try {
    // Set mongoose options (removed deprecated options)
    const options = {
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4 // Use IPv4, skip trying IPv6
    };

    // Connect to MongoDB
    const conn = await mongoose.connect(process.env.MONGODB_URI, options);

    console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline.bold);

    // Create indexes after connection is established
    try {
      await createIndexes();
    } catch (error) {
      console.error('Warning: Could not create indexes'.yellow, error.message);
    }

    // Connection event listeners
    mongoose.connection.on('connected', () => {
      console.log('Mongoose connected to MongoDB'.green);
    });

    mongoose.connection.on('error', (err) => {
      console.error(`Mongoose connection error: ${err}`.red);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('Mongoose disconnected from MongoDB'.yellow);
    });

    // Handle application termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('Mongoose connection closed through app termination'.yellow);
      process.exit(0);
    });

    return conn;

  } catch (error) {
    console.error(`Database connection failed: ${error.message}`.red.bold);
    
    // Retry connection after 5 seconds
    console.log('Retrying database connection in 5 seconds...'.yellow);
    setTimeout(connectDB, 5000);
  }
};

/**
 * Close database connection
 */
const closeDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('Database connection closed gracefully.'.yellow);
  } catch (error) {
    console.error('Error closing database connection:'.red, error);
    throw error;
  }
};

/**
 * Check database connection status
 */
const checkDBConnection = () => {
  const state = mongoose.connection.readyState;
  
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  return {
    state: states[state] || 'unknown',
    host: mongoose.connection.host,
    name: mongoose.connection.name,
    port: mongoose.connection.port
  };
};

/**
 * Database health check
 */
const healthCheck = async () => {
  try {
    await mongoose.connection.db.admin().ping();
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      connection: checkDBConnection()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
      connection: checkDBConnection()
    };
  }
};

/**
 * Clear database (for testing purposes only)
 */
const clearDatabase = async () => {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('clearDatabase can only be used in test environment');
  }

  try {
    const collections = mongoose.connection.collections;
    
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
    
    console.log('Database cleared successfully'.yellow);
  } catch (error) {
    console.error(`Error clearing database: ${error.message}`.red);
    throw error;
  }
};

/**
 * Create database indexes
 */
const createIndexes = async () => {
  try {
    // Check if connection is ready
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database connection is not ready');
    }

    console.log('Creating database indexes...'.cyan);

    // Create indexes with error handling for duplicates
    const createIndexSafely = async (collection, indexSpec, options = {}) => {
      try {
        await mongoose.connection.collection(collection).createIndex(indexSpec, options);
      } catch (error) {
        // Ignore duplicate index errors
        if (error.code !== 85 && !error.message.includes('already exists')) {
          throw error;
        }
      }
    };

    // User indexes
    await createIndexSafely('users', { email: 1 }, { unique: true });
    await createIndexSafely('users', { username: 1 }, { unique: true });
    await createIndexSafely('users', { createdAt: -1 });
    await createIndexSafely('users', { role: 1 });
    await createIndexSafely('users', { isActive: 1 });

    // Listing indexes
    await createIndexSafely('listings', { title: 'text', description: 'text' });
    await createIndexSafely('listings', { category: 1 });
    await createIndexSafely('listings', { moderationStatus: 1 });
    await createIndexSafely('listings', { owner: 1 });
    await createIndexSafely('listings', { createdAt: -1 });
    await createIndexSafely('listings', { featured: -1, boostLevel: -1, createdAt: -1 });
    await createIndexSafely('listings', { 'location.city': 1 });
    await createIndexSafely('listings', { 'location.region': 1 });
    await createIndexSafely('listings', { 'location.coordinates': '2dsphere' });
    await createIndexSafely('listings', { 'price.amount': 1 });
    
    // Handle TTL index separately (might conflict with existing)
    try {
      await mongoose.connection.collection('listings').dropIndex('expiresAt_1');
    } catch (error) {
      // Ignore if index doesn't exist
    }
    await createIndexSafely('listings', { expiresAt: 1 }, { expireAfterSeconds: 0 });

    console.log('Database indexes created successfully'.green);
  } catch (error) {
    console.error(`Error creating indexes: ${error.message}`.red);
    throw error;
  }
};

/**
 * Get database statistics
 */
const getDBStats = async () => {
  try {
    const stats = await mongoose.connection.db.stats();
    
    return {
      database: mongoose.connection.name,
      collections: stats.collections,
      documents: stats.objects,
      avgObjSize: stats.avgObjSize,
      dataSize: stats.dataSize,
      storageSize: stats.storageSize,
      indexes: stats.indexes,
      indexSize: stats.indexSize
    };
  } catch (error) {
    console.error(`Error getting database stats: ${error.message}`.red);
    throw error;
  }
};

module.exports = {
  connectDB,
  checkDBConnection,
  healthCheck,
  clearDatabase,
  createIndexes,
  getDBStats,
  closeDB
}; 