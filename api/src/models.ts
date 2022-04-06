import mongoose from 'mongoose';

export interface ITransaction {
  date: Date,
  amount: mongoose.Types.Decimal128,
  symbol: string,
  category: string,
}

const transactionSchema = new mongoose.Schema<ITransaction>({
  date: Date,
  amount: mongoose.Types.Decimal128,
  symbol: String,
  category: String,
});

const exchangeRateUSDSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  symbol: { type: String, required: true },
  rate: { type: mongoose.Types.Decimal128, required: true },
  inverted: Boolean,
});

exchangeRateUSDSchema.index({ date: 1, symbol: 1 }, { unique: true });

const balanceTotalSchema = new mongoose.Schema({
  dateType: String,
  day: Number,
  month: Number,
  year: Number,
  sumUSD: mongoose.Types.Decimal128,
  sums: [{ symbol: String, sum: mongoose.Types.Decimal128 }],
});

export const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);
export const ExchangeRateUSD = mongoose.model('ExchangeRateUSD', exchangeRateUSDSchema);
export const BalanceTotal = mongoose.model('BalanceTotal', balanceTotalSchema);
