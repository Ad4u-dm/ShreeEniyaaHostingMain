import mongoose from 'mongoose';

// Get the URI dynamically to ensure fresh environment variable
const getMongoURI = () => process.env.MONGODB_URI || 'mongodb://localhost:27017/chitfund';

const MONGODB_URI = getMongoURI();

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

interface GlobalMongoose {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: GlobalMongoose | undefined;
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  const currentURI = getMongoURI();
  
  if (cached!.conn) {
    return cached!.conn;
  }

  if (!cached!.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached!.promise = mongoose.connect(currentURI, opts).then(async (mongoose) => {
      console.log('Connected to MongoDB');
      
      // Ensure all models are registered
      try {
        await import('@/models/User');
        await import('@/models/ChitPlan');
        await import('@/models/Enrollment');
        await import('@/models/Payment');
        await import('@/models/Invoice');
        await import('@/models/Plan');
        await import('@/models/SMSLog');
      } catch (error) {
        console.warn('Some models could not be imported:', error);
      }
      
      return mongoose;
    });
  }

  try {
    cached!.conn = await cached!.promise;
  } catch (e) {
    cached!.promise = null;
    throw e;
  }

  return cached!.conn;
}

export { getMongoURI };
export default connectDB;