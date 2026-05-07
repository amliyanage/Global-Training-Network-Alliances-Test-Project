import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_MONGODB_URI = 'mongodb://127.0.0.1:27017/mentecart?directConnection=true';

const getMongoUri = () => {
  const configuredUri = process.env.MONGODB_URI || DEFAULT_MONGODB_URI;

  if (!configuredUri.includes('replicaSet=') || configuredUri.includes('directConnection=')) {
    return configuredUri;
  }

  return configuredUri.replace(/replicaSet=[^&]+/i, 'directConnection=true');
};

const clearDB = async () => {
  try {
    const mongoUri = getMongoUri();
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection was not established');
    }

    const collections = await db.collections();
    const userCollections = collections.filter(
      (collection) => !collection.collectionName.startsWith('system.'),
    );

    if (userCollections.length === 0) {
      console.log('No user collections found. Nothing to clear.');
      return;
    }

    let totalDeletedDocuments = 0;

    for (const collection of userCollections) {
      const result = await collection.deleteMany({});
      const deletedCount = result.deletedCount || 0;
      totalDeletedDocuments += deletedCount;
      console.log(`Cleared "${collection.collectionName}": ${deletedCount} documents deleted`);
    }

    console.log(
      `Database clear complete. Collections cleared: ${userCollections.length}, total documents deleted: ${totalDeletedDocuments}`,
    );
  } catch (error) {
    console.error('Error clearing database:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
};

clearDB();
