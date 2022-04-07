import mongoose from 'mongoose';
import * as fs from 'fs';
import { ExchangeRateUSD, Transaction } from './models';
import { getCategories, getSymbols, getTotal } from './controllers';

export const printHelp = () => {
  const help = `Usage: ts-node src/cli.ts COMMAND
Commands: 
importRates - importRates SYMBOL FILE [INVERTED]
addTransaction - addTransaction DATE SYMBOL AMOUNT CATEGORY
importTransactions - addTransaction FILE
getTotal
getCategories
getSymbols`;
  console.log(help);
};
const getArgsForImportRates = () => {
  if (process.argv.length < 5) {
    printHelp();
    process.exit(0);
  }
  const [, , , symbol, filename, inverted = false] = process.argv;
  return { symbol, filename, inverted };
};
const extractDataFromCsv = (filename: string) => {
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
  return data;
};
const filterDataForImportRates = (data: Record<string, string>[]) => data.filter((item) => item.Date !== 'null' && item.Close !== 'null');
export const importRatesCommand = async () => {
  const { symbol, filename, inverted } = getArgsForImportRates();
  const data = extractDataFromCsv(filename);
  const filteredData = filterDataForImportRates(data);
  const rates = filteredData.map((item) => ({
    date: new Date(item.Date),
    symbol,
    rate: item.Close,
    inverted,
  }));
  await mongoose.connect(`mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@localhost/scrooge`);
  await ExchangeRateUSD.insertMany(rates);
};

const getArgsForAddTransactionCommand = () => {
  if (process.argv.length < 7) {
    printHelp();
    process.exit(0);
  }
  const [, , , date, symbol, amount, category] = process.argv;
  return {
    date, symbol, amount, category,
  };
};
export const addTransactionCommand = async () => {
  const {
    date, symbol, amount, category,
  } = getArgsForAddTransactionCommand();
  const dateObj = new Date(date);
  await mongoose.connect(`mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@localhost/scrooge`);
  const transaction = new Transaction({
    date: dateObj,
    amount,
    symbol,
    category,
  });
  await transaction.save();
};

const getArgsForImportTransactionsCommand = () => {
  if (process.argv.length < 4) {
    printHelp();
    process.exit(0);
  }
  const [, , , filename] = process.argv;
  return {
    filename,
  };
};
export const importTransactionsCommand = async () => {
  const { filename } = getArgsForImportTransactionsCommand();
  const data = extractDataFromCsv(filename);
  await mongoose.connect(`mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@localhost/scrooge`);
  await Transaction.insertMany(data);
};
export const getTotalCommand = async () => {
  await mongoose.connect(`mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@localhost/scrooge`);
  const date = new Date();
  const total = await getTotal(date);
  console.log(JSON.stringify(total));
};
export const getSymbolsCommand = async () => {
  await mongoose.connect(`mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@localhost/scrooge`);
  const symbols = await getSymbols();
  console.log(JSON.stringify(symbols));
};
export const getCategoriesCommand = async () => {
  await mongoose.connect(`mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@localhost/scrooge`);
  const categories = await getCategories();
  console.log(JSON.stringify(categories));
};
