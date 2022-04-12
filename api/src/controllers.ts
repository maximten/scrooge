import mongoose from 'mongoose';
import bigDecimal from 'js-big-decimal';
import { ExchangeRateUSD, Transaction } from './models';

// eslint-disable-next-line no-return-await
export const getMonthRange = async () => Transaction.aggregate([
  { $group: { _id: { year: { $year: '$date' }, month: { $month: '$date' } } } },
]);

const getStartEndOfMonth = (year: number, month: number) => {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end };
};

const getDayRange = (date: Date) => {
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0);
  const endDate = new Date(date);
  endDate.setHours(0, 0, 0);
  endDate.setDate(endDate.getDate() + 1);
  return [startDate, endDate];
};

type SymbolTransactions = {
  _id: number,
  detailing: {
    category: string,
    symbol: string,
    sum: mongoose.Types.Decimal128
  } []
} [];

type ExchangeRateMap = Record<string, Record<number, {
  symbol: string,
  date: Date,
  rate: mongoose.Types.Decimal128,
  inverted: boolean
}>>;

const getExchangeRate = (exchangesMap: ExchangeRateMap, symbol: string, day: number) => {
  if (['USD', 'USDT'].includes(symbol)) {
    return undefined;
  }
  let exchangeRate = null;
  let lp = day;
  let rp = day;
  while (!exchangeRate) {
    exchangeRate = exchangesMap[symbol][lp] || exchangesMap[symbol][rp];
    --lp;
    ++rp;
  }
  return exchangeRate;
};

const convertSum = (symbol: string, rate: string, inverted: boolean, sum: string) => {
  if (['USD', 'USDT'].includes(symbol)) {
    return sum;
  }
  if (inverted) {
    return bigDecimal.divide(sum, rate, 2);
  }
  return bigDecimal.multiply(sum, rate);
};

export const getMonthDetailing = async (year: number, month: number) => {
  const { start, end } = getStartEndOfMonth(year, month);
  const symbols = await Transaction.aggregate([
    { $match: { date: { $gte: start, $lt: end } } },
    { $group: { _id: '$symbol' } },
  ]);
  const symbolsStrings = symbols.map((s) => s._id);
  const exchanges: {
    symbol: string,
    date: Date,
    rate: mongoose.Types.Decimal128,
    inverted: boolean
  }[] = await ExchangeRateUSD.find({
    date: { $gte: start, $lt: end },
    symbol: symbolsStrings,
  });
  const exchangesMap = exchanges.reduce((carry, item) => {
    if (!carry[item.symbol]) {
      carry[item.symbol] = {};
    }
    carry[item.symbol][item.date.getDate()] = item;
    return carry;
  }, {} as ExchangeRateMap);
  const transactions: Record<string, any> = {
    sumUSD: {},
  };
  const total: Record<string, string> = {};
  for (const symbol of symbolsStrings) {
    // eslint-disable-next-line no-await-in-loop
    const symbolTransactions: SymbolTransactions = await Transaction.aggregate([
      { $match: { date: { $gte: start, $lt: end }, symbol } },
      { $group: { _id: { day_id: { $dayOfMonth: '$date' }, symbol_id: '$symbol', category_id: '$category' }, sum: { $sum: '$amount' } } },
      { $group: { _id: '$_id.day_id', detailing: { $push: { category: '$_id.category_id', symbol: '$_id.symbol_id', sum: { $sum: '$sum' } } } } },
      { $sort: { _id: 1 } },
    ]);
    const symbolTotal = symbolTransactions.reduce((carry, t) => {
      const dayTotal = t.detailing.reduce((subCarry, c) => bigDecimal.add(subCarry, c.sum.toString()), '0');
      return bigDecimal.add(carry, dayTotal);
    }, '0');
    total[symbol] = symbolTotal;
    const symbolTransactionsMap = symbolTransactions.reduce((carry, day) => {
      carry[day._id] = day.detailing.reduce((subCarry, category) => {
        subCarry[category.category] = category.sum.toString();
        return subCarry;
      }, {} as any);
      return carry;
    }, {} as any);
    symbolTransactions.forEach((day) => {
      if (!transactions.sumUSD[day._id]) {
        transactions.sumUSD[day._id] = {};
      }
      day.detailing.forEach((category) => {
        const rate = getExchangeRate(exchangesMap, symbol, day._id);
        const convertedSum = convertSum(
          symbol,
          rate?.rate.toString() || '',
          rate?.inverted || false,
          category.sum.toString(),
        );
        if (!transactions.sumUSD[day._id][category.category]) {
          transactions.sumUSD[day._id][category.category] = convertedSum;
        } else {
          transactions.sumUSD[day._id][category.category] = bigDecimal.add(
            transactions.sumUSD[day._id][category.category],
            convertedSum,
          );
        }
      });
    });
    transactions[symbol] = symbolTransactionsMap;
  }
  const totalSumUSD = Object.entries(total).reduce((carry, [symbol, sum]) => {
    if (['USD', 'USDT'].includes(symbol)) {
      return bigDecimal.add(carry, sum);
    }
    const rates = Object.values(exchangesMap[symbol]);
    const lastExchangeRate = rates[rates.length - 1];
    const convertedSum = convertSum(
      symbol,
      lastExchangeRate?.rate.toString(),
      lastExchangeRate?.inverted,
      sum,
    );
    return bigDecimal.add(carry, convertedSum);
  }, '0');
  total.sumUSD = totalSumUSD;
  return { transactions, total };
};

export const getTotal = async (date: Date) => {
  const sums: { _id: string, sum: mongoose.Types.Decimal128 }[] = await Transaction.aggregate([
    { $match: { date: { $lte: date } } },
    { $group: { _id: '$symbol', sum: { $sum: '$amount' } } },
  ]);
  const rates: {
    _id: string,
    rate: mongoose.Types.Decimal128,
    inverted: boolean
  }[] = await ExchangeRateUSD.aggregate([
    { $sort: { date: -1 } },
    { $group: { _id: '$symbol', rate: { $first: '$rate' }, inverted: { $first: '$inverted' } } },
  ]);
  const ratesMap = rates.reduce((carry, r) => {
    carry[r._id] = r;
    return carry;
  }, {} as Record<string, {
    _id: string,
    rate: mongoose.Types.Decimal128,
    inverted: boolean
  }>);
  const totalUSD = sums.reduce((carry, s) => {
    const rate = ratesMap[s._id];
    const convertedSum = convertSum(s._id, rate?.rate.toString(), rate?.inverted, s.sum.toString());
    return bigDecimal.add(carry, convertedSum);
  }, '0');
  const sumsMap = sums.reduce((carry, s) => {
    carry[s._id] = s.sum.toString();
    return carry;
  }, {} as Record<string, string>);
  return { sums: sumsMap, totalUSD };
};

export const getSymbols = async () => {
  const symbols: { _id: string }[] = await Transaction.aggregate([
    { $group: { _id: '$symbol' } },
  ]);
  const symbolsList = symbols.map((i) => i._id);
  return symbolsList;
};

export const getCategories = async () => {
  const categories: { _id: string }[] = await Transaction.aggregate([
    { $group: { _id: '$category' } },
  ]);
  const categoriesList = categories.map((i) => i._id);
  return categoriesList;
};

export const getDayExpenses = async (date: Date) => {
  const [start, end] = getDayRange(date);
  const result = await Transaction.find({
    date: { $gte: start, $lt: end },
    amount: { $lt: 0 },
  }, {
    _id: 0,
    _v: 0,
  });
  const mappedResult = result.map((item) => ({
    sum: `${item.amount.toString()} ${item.symbol}`,
    category: item.category,
  }));
  return mappedResult;
};
