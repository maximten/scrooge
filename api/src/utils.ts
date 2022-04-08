import mongoose from 'mongoose';

export const connectToMongo = async () => {
  if (!process.env.MONGO_USER) {
    console.error('MONGO_USER not configured');
    process.exit(1);
  }
  if (!process.env.MONGO_PASS) {
    console.error('MONGO_PASS not configured');
    process.exit(1);
  }
  if (!process.env.MONGO_HOST) {
    console.error('MONGO_HOST not configured');
    process.exit(1);
  }
  await mongoose.connect(`mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@${process.env.MONGO_HOST
  }/scrooge`);
};
