import mongoose from 'mongoose';
import * as fs from 'fs';
import { ExchangeRateUSD } from './models';
import { getTotal } from './controllers';

export const printHelp = () => {
  const help = `Usage: ts-node src/cli.ts COMMAND
Commands: 
importRates - importRates SYMBOL FILE
addTransaction - addTransaction DATE SYMBOL AMOUNT CATEGORY
importTransactions - addTransaction FILE
getTotal`;
  console.log(help);
};
const getArgsForImportRates = () => {
  if (process.argv.length < 5) {
    printHelp();
    process.exit(0);
  }
  const [, , , symbol, filename] = process.argv;
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
export const importRatesCommand = async () => {
  const { symbol, filename } = getArgsForImportRates();
  const data = extractData(filename);
  const rates = data.map((item) => ({
    date: new Date(item.Date),
    symbol,
    rate: item.Close,
  }));
  await mongoose.connect(`mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@localhost/scrooge`);
  await ExchangeRateUSD.insertMany(rates);
};

export const addTransactionCommand = async () => {

};
export const importTransactionsCommand = async () => {

};
export const getTotalCommand = async () => {
  await mongoose.connect(`mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@localhost/scrooge`);
  const date = new Date();
  const total = await getTotal(date);
  console.log(JSON.stringify(total));
};
