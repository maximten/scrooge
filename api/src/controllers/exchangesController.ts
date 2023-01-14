import fetch from 'node-fetch';
import mongoose from 'mongoose';
import { convertSum, extractDataFromCsv } from '../utils';
import { ExchangeRateUSD } from '../models';

const SYMBOL_MAP: Record<string, string> = {
  KZT: 'KZT=X',
  BTC: 'BTC-USD',
  ETH: 'ETH-USD',
  EUR: 'EURUSD=X',
  GBP: 'GBPUSD',
  AED: 'AED=X',
  ILS: 'ILSUSD=X',
  PROPORTUNITY: 'KZT=X',
  IKAPITALIST: 'KZT=X',
  MYTAXI: 'KZT=X',
};

const INVERT_MAP: Record<string, boolean> = {
  KZT: true,
  PROPORTUNITY: true,
  IKAPITALIST: true,
  MYTAXI: true,
  AED: true,
};

const getFetchUrl = (symbol: string, startDate: Date, endDate: Date) => {
  const startTime = Math.ceil(startDate.getTime() / 1000);
  const endTime = Math.ceil(endDate.getTime() / 1000);
  const symbolPath = SYMBOL_MAP[symbol] || symbol;
  return `https://query1.finance.yahoo.com/v7/finance/download/${symbolPath}?period1=${startTime}&period2=${endTime}&interval=1d&events=history&includeAdjustedClose=true`;
};

const getStartEndDate = () => {
  const endDate = new Date();
  endDate.setHours(0, 0, 0, 0);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 7);
  return {
    startDate,
    endDate,
  };
};

export const exchangesController = {
  getSymbolsWithRates: async () => {
    const symbols: { _id: string }[] = await ExchangeRateUSD.aggregate([
      { $group: { _id: '$symbol' } },
    ]).exec();
    return symbols.map((i) => i._id);
  },
  importRate: async (symbol: string) => {
    const { startDate, endDate } = getStartEndDate();
    const existingRates = await ExchangeRateUSD.find({
      date: { $gte: startDate, $lte: endDate },
      symbol,
    }).exec();
    const existingDates: Record<string, Date> = existingRates.reduce((carry, item) => {
      carry[item.date.toLocaleDateString('RU')] = item.date;
      return carry;
    }, {} as Record<string, Date>);
    const fetchUrl = getFetchUrl(symbol, startDate, endDate);
    const res = await fetch(fetchUrl);
    const dataString = await res.text();
    const data = extractDataFromCsv(dataString);
    const rates = data.map((item) => ({
      date: new Date(item.Date),
      symbol,
      rate: item.Close,
      inverted: Boolean(INVERT_MAP[symbol]),
    })).filter((item) => !existingDates[item.date.toLocaleDateString('RU')]);
    if (rates.length > 0) {
      await ExchangeRateUSD.insertMany(rates);
    }
    console.log(`${rates.length} rates for ${symbol} saved`);
  },
  getRatesOfSymbolsByDate: async (date: Date, symbols: string[]) => {
    const rates: {
      _id: string,
      rate: mongoose.Types.Decimal128,
      inverted: boolean
    }[] = await ExchangeRateUSD.aggregate([
      { $match: { date: { $lte: date }, symbol: { $in: symbols } } },
      { $sort: { date: -1 } },
      { $group: { _id: '$symbol', rate: { $first: '$rate' }, inverted: { $first: '$inverted' } } },
    ]);
    const ratesMap = rates.reduce((carry, item) => {
      carry[item._id] = { rate: item.rate.toString(), inverted: item.inverted };
      return carry;
    }, {} as Record<string, {
      rate: string,
      inverted: boolean
    }>);
    ratesMap['USDT'] = { rate: '1', inverted: false };
    return ratesMap;
  },
  exchangeMapBySymbol: async (
    date: Date,
    mapBySymbols: Record<string, Record<string, string>>,
  ) => {
    const symbols = Object.keys(mapBySymbols);
    const ratesMap = await exchangesController.getRatesOfSymbolsByDate(date, symbols);
    const convertedCategoriesBySymbols = Object.entries(mapBySymbols)
      .map(([symbol, categories]) => {
        const rate = ratesMap[symbol];
        const convertedCategories = Object.entries(categories)
          .map(([category, amount]) => ([
            category,
            convertSum(symbol, rate.rate, rate.inverted, amount),
          ]))
          .reduce((carry, [category, amount]) => {
            carry[category] = amount;
            return carry;
          }, {} as Record<string, string>);
        return [symbol, convertedCategories];
      })
      .reduce((carry, item) => {
        const [symbol, categories] = item as [string, Record<string, string>];
        carry[symbol] = categories;
        return carry;
      }, {} as Record<string, Record<string, string>>);
    return convertedCategoriesBySymbols;
  },
  exchangeMap: async (date: Date, map: Record<string, string>) => {
    const symbols = Object.keys(map);
    const ratesMap = await exchangesController.getRatesOfSymbolsByDate(date, symbols);
    const convertedMap = Object.entries(map)
      .map(([symbol, amount]) => {
        const rate = ratesMap[symbol];
        return {
          symbol, amount: convertSum(symbol, rate.rate, rate.inverted, amount),
        };
      })
      .reduce((carry, { symbol, amount }) => {
        carry[symbol] = amount;
        return carry;
      }, {} as Record<string, string>);
    return convertedMap;
  },
  exchangeListsBySymbol: async (date: Date, listsBySymbol: Record<string, {
    category: string;
    amount: string;
  }[]>) => {
    const symbols = Object.keys(listsBySymbol);
    const ratesMap = await exchangesController.getRatesOfSymbolsByDate(date, symbols);
    const convertedListsBySymbol = Object.entries(listsBySymbol)
      .map(([symbol, list]) => {
        const rate = ratesMap[symbol];
        const convertedList = list.map(({ category, amount }) => ({
          category,
          amount: convertSum(symbol, rate.rate, rate.inverted, amount),
        }));
        return {
          symbol,
          list: convertedList,
        };
      })
      .reduce((carry, { symbol, list }) => {
        carry[symbol] = list;
        return carry;
      }, {} as Record<string, {
        category: string,
        amount: string
      }[]>);
    return convertedListsBySymbol;
  },
};
