const mongoose = require('mongoose');

const BlogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Blog title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  excerpt: {
    type: String,
    required: [true, 'Blog excerpt is required'],
    trim: true,
    maxlength: [300, 'Excerpt cannot exceed 300 characters']
  },
  content: {
    type: String,
    required: [true, 'Blog content is required']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  featuredImage: {
    url: {
      type: String,
      required: [true, 'Featured image is required']
    },
    alt: {
      type: String,
      trim: true
    },
    caption: {
      type: String,
      trim: true
    }
  },
  media: [{
    type: {
      type: String,
      enum: ['image', 'video'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    alt: {
      type: String,
      trim: true
    },
    caption: {
      type: String,
      trim: true
    },
    thumbnail: {
      type: String // For video thumbnails
    },
    duration: {
      type: Number // For video duration in seconds
    },
    order: {
      type: Number,
      default: 0
    }
  }],
  categories: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'password_protected'],
    default: 'public'
  },
  password: {
    type: String,
    trim: true
  },
  publishedAt: {
    type: Date
  },
  scheduledFor: {
    type: Date
  },
  featured: {
    type: Boolean,
    default: false
  },
  allowComments: {
    type: Boolean,
    default: true
  },
  comments: [{
    author: {
      name: {
        type: String,
        required: true,
        trim: true
      },
      email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
      },
      website: {
        type: String,
        trim: true
      },
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    },
    content: {
      type: String,
      required: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters']
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    parentComment: {
      type: mongoose.Schema.Types.ObjectId
    },
    replies: [{
      type: mongoose.Schema.Types.ObjectId
    }],
    createdAt: {
      type: Date,
      default: Date.now
    },
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    moderatedAt: {
      type: Date
    }
  }],
  seo: {
    metaTitle: {
      type: String,
      trim: true,
      maxlength: [60, 'Meta title cannot exceed 60 characters']
    },
    metaDescription: {
      type: String,
      trim: true,
      maxlength: [160, 'Meta description cannot exceed 160 characters']
    },
    metaKeywords: [{
      type: String,
      trim: true
    }],
    ogImage: {
      type: String,
      trim: true
    },
    canonicalUrl: {
      type: String,
      trim: true
    }
  },
  readingTime: {
    type: Number, // in minutes
    default: 0
  },
  views: {
    type: Number,
    default: 0
  },
  shares: {
    facebook: { type: Number, default: 0 },
    twitter: { type: Number, default: 0 },
    linkedin: { type: Number, default: 0 },
    whatsapp: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  relatedPosts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Blog'
  }],
  lastModified: {
    type: Date,
    default: Date.now
  },
  version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

// Indexes for better query performance
BlogSchema.index({ slug: 1 });
BlogSchema.index({ status: 1, publishedAt: -1 });
BlogSchema.index({ author: 1 });
BlogSchema.index({ categories: 1 });
BlogSchema.index({ tags: 1 });
BlogSchema.index({ featured: 1, publishedAt: -1 });
BlogSchema.index({ title: 'text', content: 'text', excerpt: 'text' });
BlogSchema.index({ views: -1 });
BlogSchema.index({ createdAt: -1 });

// Virtual for comment count
BlogSchema.virtual('commentCount').get(function() {
  return this.comments ? this.comments.filter(comment => comment.status === 'approved').length : 0;
});

// Virtual for like count
BlogSchema.virtual('likeCount').get(function() {
  return this.likes ? this.likes.length : 0;
});

// Virtual for reading time calculation
BlogSchema.virtual('estimatedReadingTime').get(function() {
  if (!this.content) return 0;
  const wordsPerMinute = 200;
  const wordCount = this.content.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
});

// Pre-save middleware to generate slug
BlogSchema.pre('save', function(next) {
  if (this.isModified('title') || !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }
  
  // Update reading time
  if (this.isModified('content')) {
    this.readingTime = this.estimatedReadingTime;
  }
  
  // Update last modified
  if (this.isModified() && !this.isNew) {
    this.lastModified = new Date();
    this.version += 1;
  }
  
  // Set published date when status changes to published
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  next();
});

// Static method to get published blogs
BlogSchema.statics.getPublished = function(options = {}) {
  const query = {
    status: 'published',
    visibility: 'public',
    publishedAt: { $lte: new Date() }
  };
  
  return this.find(query, null, options)
    .populate('author', 'firstName lastName username email')
    .sort({ publishedAt: -1 });
};

// Static method to get featured blogs
BlogSchema.statics.getFeatured = function(limit = 5) {
  return this.find({
    status: 'published',
    visibility: 'public',
    featured: true,
    publishedAt: { $lte: new Date() }
  })
  .populate('author', 'firstName lastName username email')
  .sort({ publishedAt: -1 })
  .limit(limit);
};

// Instance method to increment views
BlogSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save({ validateBeforeSave: false });
};

// Instance method to add like
BlogSchema.methods.addLike = function(userId) {
  const existingLike = this.likes.find(like => like.user.toString() === userId.toString());
  if (!existingLike) {
    this.likes.push({ user: userId });
    return this.save();
  }
  return Promise.resolve(this);
};

// Instance method to remove like
BlogSchema.methods.removeLike = function(userId) {
  this.likes = this.likes.filter(like => like.user.toString() !== userId.toString());
  return this.save();
};

// Comment submission methods removed - comments are display only

// Ensure virtual fields are serialized
BlogSchema.set('toJSON', { virtuals: true });
BlogSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Blog', BlogSchema);