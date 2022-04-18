import bigDecimal from 'js-big-decimal';
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

export const getDayRange = (date: Date) => {
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0);
  const endDate = new Date(date);
  endDate.setHours(0, 0, 0);
  endDate.setDate(endDate.getDate() + 1);
  return [startDate, endDate];
};

export const convertSum = (symbol: string, rate: string, inverted: boolean, sum: string) => {
  if (['USD', 'USDT'].includes(symbol)) {
    return sum;
  }
  if (inverted) {
    return bigDecimal.divide(sum, rate, 2);
  }
  return bigDecimal.multiply(sum, rate);
};

export const extractDataFromCsv = (dataString: string) => {
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

export const getWeekDays = (date: Date) => {
  const days = [];
  let currentDate = new Date(date);
  if (currentDate.getDay() === 0) {
    days.push(currentDate);
    currentDate = new Date(currentDate);
    currentDate.setDate(currentDate.getDate() - 1);
  }
  while (currentDate.getDay() >= 1) {
    days.push(currentDate);
    currentDate = new Date(currentDate);
    currentDate.setDate(currentDate.getDate() - 1);
  }
  return days;
};

export const getMonthDays = (date: Date) => {
  const month = date.getMonth();
  const days = [];
  let currentDate = new Date(date);
  while (currentDate.getDate() >= 1 && currentDate.getMonth() === month) {
    days.push(currentDate);
    currentDate = new Date(currentDate);
    currentDate.setDate(currentDate.getDate() - 1);
  }
  return days;
};
