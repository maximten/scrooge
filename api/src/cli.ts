import * as fs from 'fs';
import mongoose from 'mongoose';
import { ExchangeRateUSD } from './models';

require('dotenv').config();

const printHelp = () => {
  console.log('Usage: yarn importRates symbol filename');
};
const getArgs = () => {
  if (process.argv.length < 4) {
    printHelp();
    process.exit(0);
  }
  const [, , symbol, filename] = process.argv;
  return { symbol, filename };
};
const extractData = (filename: string) => {
  const buffer = fs.readFileSync(filename);
  const dataString = buffer.toString();
  const rows = dataString.split('\n');
  const grid = rows.map((row) => row.split(','));
  const headers = grid[0];
  const data = grid.slice(1).reduce((carry, row) => {
    const item = row.reduce((subCarry, col, index) => {
      subCarry[headers[index]] = col;
      return subCarry;
    }, {} as Record<string, string>);
    carry.push(item);
    return carry;
  }, [] as Record<string, string>[]);
  return data.filter((item) => item.Date !== 'null' && item.Close !== 'null');
};
const run = async () => {
  const { symbol, filename } = getArgs();
  const data = extractData(filename);
  const rates = data.map((item) => ({
    date: new Date(item.Date),
    symbol,
    rate: item.Close,
  }));
  await mongoose.connect(`mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@localhost/scrooge`);
  await ExchangeRateUSD.insertMany(rates);
  process.exit(0);
};
run();
