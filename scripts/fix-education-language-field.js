const mongoose = require('mongoose');
require('dotenv').config();

async function fixLanguageFields() {
  let connection;
  try {
    // Connect to MongoDB directly without using the model
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/searchnorthcyprus';
    connection = await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('educationalprograms');

    // First, let's find all documents and see what the language field looks like
    const allDocs = await collection.find({}, { projection: { _id: 1, language: 1 } }).toArray();
    console.log(`Total documents: ${allDocs.length}`);

    let fixedCount = 0;

    // Process each document individually
    for (const doc of allDocs) {
      try {
        let needsUpdate = false;
        let updateObj = {};

        // Check if language field exists and what type it is
        if (!doc.language) {
          // Missing language field
          updateObj.$set = {
            'language': {
              instruction: 'English',
              requirements: ''
            }
          };
          needsUpdate = true;
          console.log(`Document ${doc._id}: Adding missing language field`);
        } else if (typeof doc.language === 'string') {
          // Language is a string instead of object
          updateObj.$set = {
            'language': {
              instruction: doc.language || 'English',
              requirements: ''
            }
          };
          needsUpdate = true;
          console.log(`Document ${doc._id}: Converting language from string to object`);
        } else if (doc.language && typeof doc.language === 'object') {
          // Check if language.instruction is not a string
          if (doc.language.instruction && typeof doc.language.instruction !== 'string') {
            updateObj.$set = {
              'language.instruction': 'English'
            };
            needsUpdate = true;
            console.log(`Document ${doc._id}: Fixing non-string language.instruction`);
          }
        }

        // Apply the update if needed
        if (needsUpdate) {
          // First, unset the entire language field to clear any problematic values
          await collection.updateOne({ _id: doc._id }, { $unset: { language: "" } });
          
          // Then set the correct language structure
          await collection.updateOne({ _id: doc._id }, updateObj);
          fixedCount++;
        }

      } catch (updateError) {
        console.error(`Error updating document ${doc._id}:`, updateError.message);
      }
    }

    console.log(`Fixed ${fixedCount} documents`);
    console.log('All language fields have been processed!');
    
  } catch (error) {
    console.error('Error fixing language fields:', error);
  } finally {
    if (connection) {
      await mongoose.connection.close();
      console.log('Connection closed');
    }
    process.exit(0);
  }
}

// Run the fix
fixLanguageFields();