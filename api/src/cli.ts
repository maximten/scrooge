import * as fs from 'fs';

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
    carry[row[0]] = item;
    return carry;
  }, {} as Record<string, Record<string, string>>);
  return data;
};
const run = async () => {
  const { symbol, filename } = getArgs();
  const data = extractData(filename);
};
run();
