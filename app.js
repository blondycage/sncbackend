// Import admin routes
const adminListingsRoutes = require('./routes/admin/listings.routes');

// Register admin routes
app.use('/api/admin/listings', adminListingsRoutes); 