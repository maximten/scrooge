import * as fs from 'fs';
import { ExchangeRateUSD, Transaction } from './models';
import { exchangesController, transactionController } from './controllers';
import { extractDataFromCsv } from './utils';

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
getDateExpenses - getDateExpenses YEAR MONTH DAY
importRate - importRate SYMBOL
export30DaysExpensesGroupedByCategory
updateRates
getWeekExpensesGroupedByCategory
getWeekExpensesGroupedByDay
getMonthExpensesGroupedByCategory
getMonthExpensesGroupedByDay`;
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
const filterDataForImportRates = (data: Record<string, string>[]) => data.filter((item) => item.Date !== 'null' && item.Close !== 'null');
export const importRatesCommand = async () => {
  const { symbol, filename, inverted } = getArgsForImportRates();
  const dataString = fs.readFileSync(filename).toString();
  const data = extractDataFromCsv(dataString);
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
  const dataString = fs.readFileSync(filename).toString();
  const data = extractDataFromCsv(dataString);
  await Transaction.insertMany(data);
};
export const getTotalCommand = async () => {
  const date = new Date();
  const total = await transactionController.getTotal(date);
  console.log(JSON.stringify(total));
};
export const getSymbolsCommand = async () => {
  const symbols = await transactionController.getSymbols();
  console.log(JSON.stringify(symbols));
};
export const getCategoriesCommand = async () => {
  const categories = await transactionController.getCategories();
  console.log(JSON.stringify(categories));
};
export const getTodayExpensesCommand = async () => {
  const today = new Date();
  const expenses = await transactionController.getDayExpenses(today, 0);
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
  const expenses = await transactionController.getDayExpenses(date, 0);
  console.log(JSON.stringify(expenses));
};

const getArgsToImportRateCommand = () => {
  if (process.argv.length < 4) {
    printHelp();
    process.exit(1);
  }
  const [, , , symbol] = process.argv;
  return { symbol };
};

export const importRateCommand = async () => {
  const { symbol } = getArgsToImportRateCommand();
  await exchangesController.importRate(symbol);
  console.log('ok');
};

export const export30DaysExpensesGroupedByCategoryCommand = async () => {
  const date = new Date();
  const {
    transactionsBySymbol,
    convertedTransactionsBySymbol,
    totalSum,
  } = await transactionController
    .get30DaysExpensesGroupedByCategory(date);
  console.log(JSON.stringify(transactionsBySymbol));
  console.log(JSON.stringify(convertedTransactionsBySymbol));
  console.log(JSON.stringify(totalSum));
};

export const updateRatesCommand = async () => {
  const symbols = await transactionController.getSymbols();
  const symbolsPromise = symbols.map((s) => exchangesController.importRate(s));
  await Promise.all(symbolsPromise);
};

export const getWeekExpensesGroupedByCategoryCommand = async () => {
  const date = new Date();
  const expenses = await transactionController.getWeekExpensesGroupedByCategory(date, 0);
  console.log(JSON.stringify(expenses));
};

export const getWeekExpensesGroupedByDayCommand = async () => {
  const date = new Date();
  const expenses = await transactionController.getWeekExpensesGroupedByDay(date, 0);
  console.log(JSON.stringify(expenses));
};

export const getMonthExpensesGroupedByCategoryCommand = async () => {
  const date = new Date();
  const expenses = await transactionController.getMonthExpensesGroupedByCategory(date, 0);
  console.log(JSON.stringify(expenses));
};

export const getMonthExpensesGroupedByDayCommand = async () => {
  const date = new Date();
  const expenses = await transactionController.getMonthExpensesGroupedByDay(date, 0);
  console.log(JSON.stringify(expenses));
};
