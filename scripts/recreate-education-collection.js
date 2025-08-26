const mongoose = require('mongoose');
require('dotenv').config();

async function recreateEducationCollection() {
  let connection;
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/searchnorthcyprus';
    connection = await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('educationalprograms');

    // Get all documents first (without the language field that's causing issues)
    const allDocs = await collection.find({}).toArray();
    console.log(`Found ${allDocs.length} education documents`);

    if (allDocs.length > 0) {
      console.log('Backing up and recreating collection...');

      // Create backup collection
      const backupCollection = db.collection('educationalprograms_backup');
      await backupCollection.insertMany(allDocs);
      console.log('Created backup collection');

      // Drop the original collection
      await collection.drop();
      console.log('Dropped original collection');

      // Recreate documents with proper language field
      const cleanedDocs = allDocs.map(doc => {
        // Remove the problematic language field and set a proper one
        const cleanDoc = { ...doc };
        delete cleanDoc.language; // Remove any problematic language field
        
        // Set proper language field structure
        cleanDoc.language = {
          instruction: 'English',
          requirements: ''
        };

        return cleanDoc;
      });

      // Insert cleaned documents
      await collection.insertMany(cleanedDocs);
      console.log(`Recreated collection with ${cleanedDocs.length} documents`);

      // Verify the fix worked
      const testDoc = await collection.findOne({ _id: allDocs[0]._id });
      console.log('Sample document language field:', testDoc.language);
    }

    console.log('Education collection has been successfully recreated!');
    
  } catch (error) {
    console.error('Error recreating education collection:', error);
  } finally {
    if (connection) {
      await mongoose.connection.close();
      console.log('Connection closed');
    }
    process.exit(0);
  }
}

// Run the fix
recreateEducationCollection();