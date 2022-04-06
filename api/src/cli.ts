import {
  addTransactionCommand, getTotalCommand, importRatesCommand, importTransactionsCommand, printHelp,
} from './cliCommands';

require('dotenv').config();

const COMMAND_MAP = {
  importRates: importRatesCommand,
  addTransaction: addTransactionCommand,
  importTransactions: importTransactionsCommand,
  getTotal: getTotalCommand,
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
  await commandHandler();
  process.exit(0);
};
run();
