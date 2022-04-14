import fetch from 'node-fetch';
import { extractDataFromCsv } from '../utils';
import { ExchangeRateUSD } from '../models';

const SYMBOL_MAP: Record<string, string> = {
  KZT: 'KZT=X',
  BTC: 'BTC-USD',
  ETH: 'ETH-USD',
  EUR: 'EURUSD=X',
  GBP: 'GBPUSD',
  AED: 'AED=X',
};

const INVERT_MAP: Record<string, boolean> = {
  KZT: true,
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
    console.log(`${rates.length} rates saved`);
  },
};
