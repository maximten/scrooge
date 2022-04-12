import {
  addTransactionCommand,
  getCategoriesCommand,
  getDateExpensesCommand,
  getSymbolsCommand,
  getTodayExpensesCommand,
  getTotalCommand,
  importRatesCommand,
  importTransactionsCommand,
  printHelp,
} from './cliCommands';
import { connectToMongo } from './utils';

require('dotenv').config();

const COMMAND_MAP = {
  importRates: importRatesCommand,
  addTransaction: addTransactionCommand,
  importTransactions: importTransactionsCommand,
  getTotal: getTotalCommand,
  getSymbols: getSymbolsCommand,
  getCategories: getCategoriesCommand,
  getTodayExpenses: getTodayExpensesCommand,
  getDateExpenses: getDateExpensesCommand,
};
type Command = keyof typeof COMMAND_MAP;

const getCommandHandler = (command: Command) => COMMAND_MAP[command];
const getCommandFromArgs = () => {
  if (process.argv.length < 3) {
    printHelp();
    process.exit(1);
  }
  return process.argv[2] as Command;
};
const run = async () => {
  const command = getCommandFromArgs();
  const commandHandler = getCommandHandler(command);
  await connectToMongo(process.env.MONGO_HOST_CLI as string);
  await commandHandler();
  process.exit(0);
};
run();
