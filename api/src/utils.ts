import mongoose from 'mongoose';

export const connectToMongo = async (host: string) => {
  if (!process.env.MONGO_USER) {
    console.error('MONGO_USER not configured');
    process.exit(1);
  }
  if (!process.env.MONGO_PASS) {
    console.error('MONGO_PASS not configured');
    process.exit(1);
  }
  if (!host) {
    console.error('Mongo host not configured');
    process.exit(1);
  }
  await mongoose.connect(`mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@${host
  }/scrooge`);
};
