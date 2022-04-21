import mongoose from 'mongoose';

export interface ITransaction {
  date: Date,
  amount: mongoose.Types.Decimal128,
  symbol: string,
  category: string,
}

const transactionSchema = new mongoose.Schema<ITransaction>({
  date: { type: Date, required: true },
  amount: { type: mongoose.Types.Decimal128, required: true },
  symbol: { type: String, required: true },
  category: { type: String, required: true },
});

export interface IExchangeRateUSD {
  date: Date,
  symbol: string,
  rate: mongoose.Types.Decimal128,
  inverted: Boolean,
}

const exchangeRateUSDSchema = new mongoose.Schema<IExchangeRateUSD>({
  date: { type: Date, required: true },
  symbol: { type: String, required: true },
  rate: { type: mongoose.Types.Decimal128, required: true },
  inverted: Boolean,
});

exchangeRateUSDSchema.index({ date: 1, symbol: 1 }, { unique: true });

export const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);
export const ExchangeRateUSD = mongoose.model<IExchangeRateUSD>('ExchangeRateUSD', exchangeRateUSDSchema);

export type TransactionDto = {
  date: string,
  amount: string,
  symbol: string,
  category: string
};
