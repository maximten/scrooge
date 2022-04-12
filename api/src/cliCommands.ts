import * as fs from 'fs';
import { ExchangeRateUSD, Transaction } from './models';
import {
  getCategories, getDayExpenses, getSymbols, getTotal,
} from './controllers';

export const printHelp = () => {
  const help = `Usage: ts-node src/cli.ts COMMAND
Commands: 
importRates - importRates SYMBOL FILE [INVERTED]
addTransaction - addTransaction DATE SYMBOL AMOUNT CATEGORY
importTransactions - addTransaction FILE
getTotal
getCategories
getSymbols
getTodayExpenses
getDateExpenses - getDateExpenses YEAR MONTH DAY`;
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
  await Transaction.insertMany(data);
};
export const getTotalCommand = async () => {
  const date = new Date();
  const total = await getTotal(date);
  console.log(JSON.stringify(total));
};
export const getSymbolsCommand = async () => {
  const symbols = await getSymbols();
  console.log(JSON.stringify(symbols));
};
export const getCategoriesCommand = async () => {
  const categories = await getCategories();
  console.log(JSON.stringify(categories));
};
export const getTodayExpensesCommand = async () => {
  const today = new Date();
  const expenses = await getDayExpenses(today);
  console.log(JSON.stringify(expenses));
};

const getArgsForGetDateExpensesCommand = () => {
  if (process.argv.length < 6) {
    printHelp();
    process.exit(0);
  }
  const [, , , yearString, monthString, dayString] = process.argv;
  const year = Number.parseInt(yearString, 10);
  const month = Number.parseInt(monthString, 10);
  const day = Number.parseInt(dayString, 10);
  return {
    year, month, day,
  };
};
export const getDateExpensesCommand = async () => {
  const { year, month, day } = getArgsForGetDateExpensesCommand();
  const date = new Date(year, month - 1, day);
  const expenses = await getDayExpenses(date);
  console.log(JSON.stringify(expenses));
};
