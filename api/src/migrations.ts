import mongoose from 'mongoose';
import { ExchangeRateUSD } from './models';

const getTransactions = () => {
  const transactionsData: {
    Date: String,
    Amount: String,
    Category: String
  }[] = require('../transactions.json');
  const transactions = transactionsData
    .filter((t) => t.Date && t.Amount && t.Category)
    .map((t) => {
      const [day, month, year] = t.Date.split('.');
      const match = t.Amount.match(/(.*)\n?/gm);
      const amount = match ? match[0] : null;
      return {
        date: new Date(
          Number.parseInt(year, 10) + 2000,
          Number.parseInt(month, 10) - 1,
          Number.parseInt(day, 10),
        ),
        amount: amount ? amount.replaceAll(/[^-\d,]/g, '') : '',
        category: t.Category,
      };
    })
    .filter((t) => t.amount)
    .map((t) => ({
      ...t,
      amount: Number.parseFloat(t.amount.replace(',', '.')),
      symbol: 'KZT',
    }));
  return transactions;
};

const getExchangesKZT = async () => {
  const data: {
    Date: string,
    Close: string
  }[] = require('../usdkzt.json');
  const rates = data.map((row) => ({
    date: new Date(row.Date),
    symbol: 'KZT',
    rate: row.Close,
  }));
  await ExchangeRateUSD.insertMany(rates);
};

const migrate = async () => {
  await mongoose.connect(`mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@localhost/scrooge`);
  await getExchangesKZT();
};
