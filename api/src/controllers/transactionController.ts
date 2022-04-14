import bigDecimal from 'js-big-decimal';
import mongoose from 'mongoose';
import { ExchangeRateUSD, Transaction } from '../models';
import { convertSum, getDayRange } from '../utils';

export const transactionController = {
  getMonthRange: async () => Transaction.aggregate([
    { $group: { _id: { year: { $year: '$date' }, month: { $month: '$date' } } } },
  ]),
  getSymbols: async () => {
    const symbols: { _id: string }[] = await Transaction.aggregate([
      { $group: { _id: '$symbol' } },
    ]);
    const symbolsList = symbols.map((i) => i._id);
    return symbolsList;
  },
  getCategories: async () => {
    const categories: { _id: string }[] = await Transaction.aggregate([
      { $group: { _id: '$category' } },
    ]);
    const categoriesList = categories.map((i) => i._id);
    return categoriesList;
  },
  getDayExpenses: async (date: Date) => {
    const [start, end] = getDayRange(date);
    const result = await Transaction.find({
      date: { $gte: start, $lt: end },
      amount: { $lt: 0 },
    }, {
      _id: 0,
      _v: 0,
    });
    const mappedResult = result.map((item) => ({
      amount: item.amount.toString(),
      symbol: item.symbol,
      category: item.category,
    }));
    return mappedResult;
  },
  getTotal: async (date: Date) => {
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
      const convertedSum = convertSum(
        s._id,
        rate?.rate.toString(),
        rate?.inverted,
        s.sum.toString(),
      );
      return bigDecimal.add(carry, convertedSum);
    }, '0');
    const totalUSDrounded = bigDecimal.round(totalUSD, 2);
    const sumsMap = sums.reduce((carry, s) => {
      carry[s._id] = s.sum.toString();
      return carry;
    }, {} as Record<string, string>);
    return { sums: sumsMap, totalUSD: totalUSDrounded };
  },
};
