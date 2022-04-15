import bigDecimal from 'js-big-decimal';
import mongoose from 'mongoose';
import { ExchangeRateUSD, Transaction } from '../models';
import { convertSum, getDayRange } from '../utils';
import { exchangesController } from './exchangesController';

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
    const expenses = await Transaction.find({
      date: { $gte: start, $lt: end },
      amount: { $lt: 0 },
    }, {
      _id: 0,
      _v: 0,
    });
    const sumsBySymbol: Record<string, string> = {};
    const expensesBySymbol = expenses.reduce((carry, item) => {
      carry[item.symbol] ??= [];
      sumsBySymbol[item.symbol] ??= '0';
      carry[item.symbol].push({ category: item.category, amount: item.amount.toString() });
      sumsBySymbol[item.symbol] = bigDecimal.add(sumsBySymbol[item.symbol], item.amount.toString());
      return carry;
    }, {} as Record<string, { category: string, amount: string }[]>);
    const convertedSumBySymbol = await exchangesController.exchagneMap(date, sumsBySymbol);
    const convertedExpensesBySymbol = await exchangesController
      .exchangeListsBySymbol(date, expensesBySymbol);
    const totalSum = Object.values(convertedSumBySymbol)
      .reduce((carry, amount) => bigDecimal.add(carry, amount), '0');
    return {
      expensesBySymbol,
      sumsBySymbol,
      convertedSumBySymbol,
      convertedExpensesBySymbol,
      totalSum,
    };
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
  get30DaysExpenses: async (date: Date) => {
    const startDate = new Date(date);
    startDate.setDate(startDate.getDate() - 30);
    const transactions: {
      _id: { symbol: string, category: string },
      sum: mongoose.Types.Decimal128
    }[] = await Transaction.aggregate([
      { $match: { date: { $gte: startDate, $lte: date }, amount: { $lte: 0 } } },
      { $group: { _id: { symbol: '$symbol', category: '$category' }, sum: { $sum: '$amount' } } },
    ]).exec();
    const transactionsBySymbol: Record<string, Record<string, string>> = {};
    transactions.forEach((item) => {
      if (!transactionsBySymbol[item._id.symbol]) {
        transactionsBySymbol[item._id.symbol] = {};
      }
      transactionsBySymbol[item._id.symbol][item._id.category] = item.sum.toString();
      if (!transactionsBySymbol[item._id.symbol].sum) {
        transactionsBySymbol[item._id.symbol].sum = '0';
      }
      transactionsBySymbol[item._id.symbol].sum = bigDecimal.add(
        transactionsBySymbol[item._id.symbol].sum,
        item.sum.toString(),
      );
    });
    const convertedTransactionsBySymbol = await exchangesController
      .exchangeMapBySymbol(date, transactionsBySymbol);
    const totalSum = Object.entries(convertedTransactionsBySymbol)
      .reduce((carry, [, categories]) => {
        carry = bigDecimal.add(carry, categories.sum);
        return carry;
      }, '0');
    return {
      transactionsBySymbol,
      convertedTransactionsBySymbol,
      totalSum,
    };
  },
};
