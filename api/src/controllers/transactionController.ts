import bigDecimal from 'js-big-decimal';
import mongoose from 'mongoose';
import {
  ExchangeRateUSD, Transaction, TransactionDto,
} from '../models';
import {
  convertSum, getDayRange, getMonthDays, getWeekDays,
} from '../utils';
import { exchangesController } from './exchangesController';

export const transactionController = {
  addTransaction: async (dto: TransactionDto) => {
    const transaction = new Transaction({
      ...dto,
    });
    await transaction.validate();
    await transaction.save();
    const transactionsSymbols = await transactionController.getSymbols();
    const symbolsWithRates = await exchangesController.getSymbolsWithRates();
    if (transactionsSymbols.length > symbolsWithRates.length) {
      const diff = transactionsSymbols.filter((s) => !symbolsWithRates.includes(s));
      const promises = diff.map((s) => exchangesController.importRate(s));
      await Promise.all(promises);
    }
  },
  getMonthRange: async () => Transaction.aggregate([
    { $group: { _id: { year: { $year: '$date' }, month: { $month: '$date' } } } },
  ]),
  getSymbols: async () => {
    const symbols: { _id: string }[] = await Transaction.aggregate([
      { $group: { _id: '$symbol', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    const symbolsList = symbols.map((i) => i._id);
    return symbolsList;
  },
  getCategories: async () => {
    const categories: { _id: string }[] = await Transaction.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    const categoriesList = categories.map((i) => i._id);
    return categoriesList;
  },
  getDayExpenses: async (date: Date, timezone: number) => {
    const [start, end] = getDayRange(date, timezone);
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
    const convertedSumBySymbol = await exchangesController.exchangeMap(date, sumsBySymbol);
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
  getExpensesOnDateRangeGroupedByCategory: async (startDate: Date, endDate: Date) => {
    const transactions: {
      _id: { symbol: string, category: string },
      sum: mongoose.Types.Decimal128
    }[] = await Transaction.aggregate([
      { $match: { date: { $gte: startDate, $lte: endDate }, amount: { $lte: 0 } } },
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
      .exchangeMapBySymbol(endDate, transactionsBySymbol);
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
  getSumsOnDateRangeGroupedByCategory: async (startDate: Date, endDate: Date) => {
    const transactions: {
      _id: { symbol: string, category: string },
      sum: mongoose.Types.Decimal128
    }[] = await Transaction.aggregate([
      { $match: { date: { $gte: startDate, $lte: endDate } } },
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
      .exchangeMapBySymbol(endDate, transactionsBySymbol);
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
  getExpensesOnDateRangeGroupedByDay: async (startDate: Date, endDate: Date, timezone: number) => {
    const timezoneString = timezone >= 0 ? `+${timezone.toString().padStart(2, '0')}` : `-${timezone.toString().padStart(2, '0')}`;
    const transactions: {
      _id: { symbol: string, date: string },
      sum: mongoose.Types.Decimal128
    }[] = await Transaction.aggregate([
      { $match: { date: { $gte: startDate, $lte: endDate }, amount: { $lte: 0 } } },
      {
        $group: {
          _id: {
            symbol: '$symbol',
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$date',
                timezone: timezoneString,
              },
            },
          },
          sum: { $sum: '$amount' },
        },
      },
    ]).exec();
    const transactionsBySymbol: Record<string, Record<string, string>> = {};
    transactions.forEach((item) => {
      if (!transactionsBySymbol[item._id.symbol]) {
        transactionsBySymbol[item._id.symbol] = {};
      }
      const date = new Date(item._id.date);
      const dateString = date.toLocaleDateString('RU');
      transactionsBySymbol[item._id.symbol][dateString] = item.sum.toString();
      if (!transactionsBySymbol[item._id.symbol].sum) {
        transactionsBySymbol[item._id.symbol].sum = '0';
      }
      transactionsBySymbol[item._id.symbol].sum = bigDecimal.add(
        transactionsBySymbol[item._id.symbol].sum,
        item.sum.toString(),
      );
    });
    const convertedTransactionsBySymbol = await exchangesController
      .exchangeMapBySymbol(endDate, transactionsBySymbol);
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
  get30DaysExpensesGroupedByCategory: async (date: Date) => {
    const startDate = new Date(date);
    startDate.setDate(startDate.getDate() - 30);
    const result = await transactionController
      .getExpensesOnDateRangeGroupedByCategory(startDate, date);
    return result;
  },
  get30DaysExpensesGroupedByDay: async (date: Date, timezone: number) => {
    const startDate = new Date(date);
    startDate.setDate(startDate.getDate() - 30);
    const result = await transactionController
      .getExpensesOnDateRangeGroupedByDay(startDate, date, timezone);
    return result;
  },
  getWeekExpensesGroupedByCategory: async (date: Date, timezone: number) => {
    const days = getWeekDays(date, timezone);
    const endDate = days[0];
    const startDate = days[days.length - 1];
    const result = await transactionController
      .getExpensesOnDateRangeGroupedByCategory(startDate, endDate);
    return result;
  },
  getWeekExpensesGroupedByDay: async (date: Date, timezone: number) => {
    const days = getWeekDays(date, timezone);
    const endDate = days[0];
    const startDate = days[days.length - 1];
    const result = await transactionController
      .getExpensesOnDateRangeGroupedByDay(startDate, endDate, timezone);
    return result;
  },
  getMonthExpensesGroupedByCategory: async (date: Date, timezone: number) => {
    const days = getMonthDays(date, timezone);
    const endDate = days[0];
    const startDate = days[days.length - 1];
    const result = await transactionController
      .getExpensesOnDateRangeGroupedByCategory(startDate, endDate);
    return result;
  },
  getMonthExpensesGroupedByDay: async (date: Date, timezone: number) => {
    const days = getMonthDays(date, timezone);
    const endDate = days[0];
    const startDate = days[days.length - 1];
    const result = await transactionController
      .getExpensesOnDateRangeGroupedByDay(startDate, endDate, timezone);
    return result;
  },
  getMonthSumsGroupedByCategory: async (date: Date, timezone: number) => {
    const days = getMonthDays(date, timezone);
    const endDate = days[0];
    const startDate = days[days.length - 1];
    const result = await transactionController
      .getSumsOnDateRangeGroupedByCategory(startDate, endDate);
    return result;
  },
  getYearBalance: async (year: number) => {
    const months = [...(new Array(12))].map((i, k) => k)
      .map(m => new Date(`${year}.${m + 1}.01`))
      .map(m => {
        const m2 = new Date(m);
        m2.setMonth(m.getMonth() + 1);
        m2.setDate(-1);
        return m2;
      });
    const lastMonth = new Date(`${year + 1}.02.01`);
    lastMonth.setDate(-1);
    months.push(lastMonth);
    const promises = months.map(m => transactionController.getMonthSumsGroupedByCategory(m, 0));
    const sums = await Promise.all(promises);
    const categories = await transactionController.getCategories();
    const categoriesMap = categories.reduce((res, category, i) => {
      res[category] = i;
      return res;
    }, {} as Record<string, number>);
    const rows = [['', 'sum', ...categories]];
    const sumRow = Array.from(Array(categories.length)).map(i => '0');
    let yearSum = '0';
    months.forEach((m, i) => {
      const month = m.toLocaleString('default', { month: 'long' });
      const row = Array.from(Array(categories.length)).map(i => '0');
      const sum = sums[i];
      const { convertedTransactionsBySymbol, totalSum } = sum;
      Object.values(convertedTransactionsBySymbol).forEach(sums => {
        Object.entries(sums).forEach(([key, val]) => {
          if (key === 'sum')
            return;
          const ind = categoriesMap[key]
          row[ind] = bigDecimal.add(row[ind].toString(), val.toString());
          sumRow[ind] = bigDecimal.add(sumRow[ind].toString(), val.toString());
        })
      });
      const finalRow = [month, totalSum.toString(), ...row];
      yearSum = bigDecimal.add(yearSum, totalSum.toString());
      rows.push(finalRow)
    });
    const meanRow = sumRow.map(sum => bigDecimal.divide(sum, months.length.toString(), 2));
    const yearMean = bigDecimal.divide(yearSum, months.length.toString(), 2);
    rows.push(['Sum', yearSum, ...sumRow]);
    rows.push(['Mean', yearMean, ...meanRow]);
    return rows;
  }
};
