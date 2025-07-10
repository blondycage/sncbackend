# SearchNorthCyprus Backend API

## 🚀 Overview

The SearchNorthCyprus backend is a comprehensive Node.js/Express API that powers a real estate listing platform for North Cyprus. It provides robust user authentication, listing management, admin controls, and integrations with external services.

## 🛠️ Tech Stack

- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT + bcrypt
- **File Storage**: Cloudinary
- **Email**: Nodemailer (SendGrid/Gmail)
- **Security**: Helmet, CORS, Rate Limiting
- **Validation**: express-validator
- **File Upload**: Multer

## 📋 Features

### Authentication & Users
- 🔐 User registration with email verification
- 🔑 JWT-based authentication
- 📱 Telegram authentication support
- 🔄 Password reset functionality
- 👤 User profile management
- 🔒 Role-based access control (User, Admin)

### Listings Management
- 📝 CRUD operations for property listings
- 🖼️ Multiple image upload with Cloudinary
- 🔍 Advanced search and filtering
- ⭐ Favorites system
- 📊 View tracking
- 🚩 Reporting system
- ✅ Admin moderation

### Admin Panel
- 📈 Dashboard with analytics
- 👥 User management
- 🏠 Listing moderation
- 🔨 Ban/unban functionality
- 📊 Platform statistics

### Security & Performance
- 🛡️ Rate limiting
- 🔒 CORS protection
- ⚡ Response compression
- 📝 Request logging
- 🏥 Health monitoring

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- Cloudinary account
- Email service (SendGrid or Gmail)

### Installation

1. **Clone and setup**:
   ```bash
   cd backend
   npm run setup
   ```

2. **Environment Configuration**:
   ```bash
   cp .env.example .env
   ```

3. **Configure your `.env` file**:
   ```env
   # Server
   NODE_ENV=development
   PORT=5000
   
   # Database
   MONGODB_URI=mongodb://localhost:27017/searchnorthcyprus
   
   # JWT
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRE=30d
   
   # Cloudinary
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   
   # Email (Choose one)
   EMAIL_FROM=noreply@searchnorthcyprus.com
   
   # SendGrid (Production)
   SENDGRID_API_KEY=your-sendgrid-key
   
   # Gmail (Development)
   GMAIL_USER=your-gmail@gmail.com
   GMAIL_PASS=your-app-password
   
   # Frontend
   CLIENT_URL=http://localhost:3000
   ```

4. **Start the server**:
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

5. **Test the API**:
   ```bash
   npm test
   ```

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | User login |
| POST | `/auth/telegram` | Telegram authentication |
| GET | `/auth/me` | Get current user |
| PUT | `/auth/profile` | Update profile |
| PUT | `/auth/password` | Change password |
| POST | `/auth/forgot-password` | Request password reset |
| PUT | `/auth/reset-password/:token` | Reset password |
| GET | `/auth/verify-email/:token` | Verify email |
| POST | `/auth/resend-verification` | Resend verification |
| POST | `/auth/logout` | Logout |

### Listings Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/listings` | Get all listings (with filters) |
| GET | `/listings/:id` | Get single listing |
| POST | `/listings` | Create new listing |
| PUT | `/listings/:id` | Update listing |
| DELETE | `/listings/:id` | Delete listing |
| POST | `/listings/:id/favorite` | Add to favorites |
| DELETE | `/listings/:id/favorite` | Remove from favorites |
| POST | `/listings/:id/inquiry` | Send inquiry |
| POST | `/listings/:id/report` | Report listing |
| GET | `/listings/user/me` | Get my listings |
| GET | `/listings/user/favorites` | Get my favorites |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/dashboard` | Dashboard stats |
| GET | `/admin/users` | Get all users |
| GET | `/admin/users/:id` | Get user details |
| PUT | `/admin/users/:id` | Update user |
| POST | `/admin/users/:id/ban` | Ban user |
| POST | `/admin/users/:id/unban` | Unban user |
| DELETE | `/admin/users/:id` | Delete user |
| GET | `/admin/listings` | Get all listings for moderation |
| PUT | `/admin/listings/:id/moderate` | Moderate listing |
| DELETE | `/admin/listings/:id/flags` | Clear listing flags |
| GET | `/admin/analytics` | Platform analytics |

### Utility Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/status` | API status |

## 📝 Request Examples

### Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "phone": "+905338887766",
    "telegram": "@johndoe"
  }'
```

### Create Listing
```bash
curl -X POST http://localhost:5000/api/listings \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Beautiful Villa in Kyrenia",
    "description": "Stunning 3-bedroom villa with sea view",
    "category": "villa",
    "price": 450000,
    "currency": "USD",
    "location": {
      "address": "Kyrenia, North Cyprus",
      "coordinates": [33.3167, 35.3333]
    },
    "features": {
      "bedrooms": 3,
      "bathrooms": 2,
      "area": 250,
      "parking": true,
      "garden": true
    }
  }'
```

### Search Listings
```bash
curl "http://localhost:5000/api/listings?category=villa&minPrice=300000&maxPrice=500000&location=Kyrenia"
```

## 🗃️ Database Models

### User Schema
```javascript
{
  name: String,
  email: String,
  password: String,
  phone: String,
  telegram: String,
  role: ['user', 'admin'],
  status: ['active', 'suspended', 'banned'],
  isEmailVerified: Boolean,
  avatar: String,
  createdAt: Date,
  lastLogin: Date
}
```

### Listing Schema
```javascript
{
  title: String,
  description: String,
  category: String,
  price: Number,
  currency: String,
  images: [String],
  location: {
    address: String,
    coordinates: [Number]
  },
  features: Object,
  status: ['active', 'pending', 'rejected', 'sold'],
  owner: ObjectId,
  views: Number,
  favorites: [ObjectId],
  reports: [Object],
  createdAt: Date
}
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment (development/production) | Yes |
| `PORT` | Server port | No (default: 5000) |
| `MONGODB_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `JWT_EXPIRE` | JWT expiration time | No (default: 30d) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | Yes |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Yes |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Yes |
| `SENDGRID_API_KEY` | SendGrid API key | Optional |
| `GMAIL_USER` | Gmail username | Optional |
| `GMAIL_PASS` | Gmail app password | Optional |
| `CLIENT_URL` | Frontend URL | Yes |

### Rate Limits

- General API: 100 requests/15 minutes
- Auth endpoints: 5 requests/15 minutes
- Listing creation: 10 requests/hour
- Admin actions: 100 requests/hour

## 🧪 Testing

### Run Tests
```bash
# Test all endpoints
npm test

# Watch mode
npm run test:watch
```

### Manual Testing
```bash
# Check if server is running
curl http://localhost:5000/api/health

# Test authentication
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"test123"}'
```

## 🚀 Deployment

### Production Setup

1. **Environment**: Set `NODE_ENV=production`
2. **Database**: Use MongoDB Atlas
3. **File Storage**: Configure Cloudinary
4. **Email**: Use SendGrid for reliability
5. **Security**: Use strong JWT secrets
6. **SSL**: Enable HTTPS
7. **Process Manager**: Use PM2 or similar

### Docker Deployment
```bash
# Build image
docker build -t searchnorthcyprus-backend .

# Run container
docker run -p 5000:5000 --env-file .env searchnorthcyprus-backend
```

## 📊 Monitoring

### Health Checks
- `/api/health` - Database connection status
- `/api/status` - API operational status

### Logging
- Development: Detailed console logs
- Production: Structured logging with Morgan

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Submit pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Email: support@searchnorthcyprus.com
- Telegram: @searchnorthcyprus

---

## 🎯 Next Steps

1. Set up your environment variables
2. Install dependencies: `npm run setup`
3. Start the server: `npm run dev`
4. Test the API: `npm test`
5. Start building your frontend! 