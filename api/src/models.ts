import mongoose from "mongoose"

const transactionSchema = new mongoose.Schema({
    date: Date,
    amount: mongoose.Types.Decimal128,
    symbol: String,
    category: String
})

const exchangeRateUSDSchema = new mongoose.Schema({
    date: Date,
    symbol: String,
    rate: mongoose.Types.Decimal128
})

const balanceTotalSchema = new mongoose.Schema({
    dateType: String,
    day: Number,
    month: Number,
    year: Number,
    sumUSD: mongoose.Types.Decimal128,
    sums: [{ symbol: String, sum: mongoose.Types.Decimal128 }]
})

export const Transaction = mongoose.model("Transaction", transactionSchema)
export const ExchangeRateUSD = mongoose.model("ExchangeRateUSD", exchangeRateUSDSchema)
export const BalanceTotal = mongoose.model("BalanceTotal", balanceTotalSchema)
