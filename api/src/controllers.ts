import mongoose from "mongoose"
import bigDecimal from "js-big-decimal"
import { ExchangeRateUSD, Transaction } from "./models"

export const getMonthRange = async () => {
    return await Transaction.aggregate([
        { $group: { _id: { year: { $year: "$date" }, month: { $month: "$date" } } } },
    ])
}

const getStartEndOfMonth = (year: number, month: number) => {
    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 1)
    return { start, end }
}

type SymbolTransactions = {
    _id: number,
        detailing: {
        category: string,
            symbol: string,
                sum: mongoose.Types.Decimal128
    } []
} []

type ExchangeRateMap = Record<string, Record<number, mongoose.Types.Decimal128>>

const getExchangeRate = (exchangesMap: ExchangeRateMap, symbol: string, day: number) => {
    let exchangeRate = null
    let lp = day
    let rp = day
    while (!exchangeRate) {
        exchangeRate = exchangesMap[symbol][lp] || exchangesMap[symbol][rp]
        --lp
        ++rp
    }
    return exchangeRate
}

export const getMonthDetailing = async (year: number, month: number) => {
    const { start, end } = getStartEndOfMonth(year, month)
    const symbols = await Transaction.aggregate([
        { $match: { date: { $gte: start, $lt: end } } },
        { $group: { _id: "$symbol" } }
    ])
    const symbolsStrings = symbols.map(s => s._id)
    const exchanges: {
        symbol: string,
        date: Date,
        rate: mongoose.Types.Decimal128
    }[] = await ExchangeRateUSD.find({
        date: { $gte: start, $lt: end },
        symbol: symbolsStrings
    })
    const exchangesMap = exchanges.reduce((carry, item) => {
        if (!carry[item.symbol]) {
            carry[item.symbol] = {}
        }
        carry[item.symbol][item.date.getDate()] = item.rate
        return carry
    }, {} as ExchangeRateMap)
    const transactions: Record<string, any> = {
        "sumUSD": {}
    }
    const total: Record<string, string> = {}
    for (const symbol of symbolsStrings) {
        const symbolTransactions: SymbolTransactions = await Transaction.aggregate([
            { $match: { date: { $gte: start, $lt: end }, symbol } },
            { $group: { _id: { day_id: { $dayOfMonth: "$date" }, symbol_id: "$symbol", category_id: "$category" }, sum: { $sum: "$amount" } } },
            { $group: { _id: "$_id.day_id", detailing: { $push: { category: "$_id.category_id", symbol: "$_id.symbol_id", sum: { $sum: "$sum" } } } } },
            { $sort: { _id: 1 } }
        ])
        const symbolTotal = symbolTransactions.reduce((carry, t) => {
            const dayTotal = t.detailing.reduce((carry, c) => bigDecimal.add(carry, c.sum.toString()), "0")
            return bigDecimal.add(carry, dayTotal)
        }, "0")
        total[symbol] = symbolTotal
        const symbolTransactionsMap = symbolTransactions.reduce((carry, day) => {
            carry[day._id] = day.detailing.reduce((carry, category) => {
                carry[category.category] = category.sum.toString()
                return carry
            }, {} as any)
            return carry
        }, {} as any)
        symbolTransactions.forEach((day) => {
            if (!transactions["sumUSD"][day._id]) {
                transactions["sumUSD"][day._id] = {}
            }
            day.detailing.forEach((category) => {
                const rate = getExchangeRate(exchangesMap, symbol, day._id)
                const convertedSum = bigDecimal.divide(category.sum.toString(), rate.toString(), 2)
                if (!transactions["sumUSD"][day._id][category.category]) {
                    transactions["sumUSD"][day._id][category.category] = 
                        bigDecimal.add(
                            transactions["sumUSD"][day._id][category.category],
                            convertedSum
                        )
                } else {
                    transactions["sumUSD"][day._id][category.category] = convertedSum
                }
            })
        })
        transactions[symbol] = symbolTransactionsMap
    }
    const totalSumUSD = Object.entries(total).reduce((carry, [symbol, sum]) => {
        if (symbol === "USD") {
            return bigDecimal.add(carry, sum)
        }
        const rates = Object.values(exchangesMap[symbol])
        const lastExchangeRate = rates[rates.length - 1]
        const convertedSum = bigDecimal.divide(sum, lastExchangeRate, 2)
        return bigDecimal.add(carry, convertedSum)
    }, "0")
    total.sumUSD = totalSumUSD
    return { transactions, total }
}

export const getTotal = async (date: Date) => {
    const sums: { _id: string, sum: mongoose.Types.Decimal128 }[] = await Transaction.aggregate([
        { $match: { date: { $lte: date } } },
        { $group: { _id: "$symbol", sum: { $sum: "$amount" } } }
    ])
    const rates: { 
        _id: string, 
        rate: mongoose.Types.Decimal128
    }[] = await ExchangeRateUSD.aggregate([
        { $sort: { date: -1 } },
        { $group: { _id: "$symbol", rate: { $first: '$rate' } } }
    ])
    const ratesMap = rates.reduce((carry, r) => {
        carry[r._id] = r.rate
        return carry
    }, {} as Record<string, mongoose.Types.Decimal128>)
    const totalUSD = sums.reduce((carry, s) => {
        const rate = ratesMap[s._id]
        const convertedSum = s._id === "USD" ? s.sum.toString() 
            : bigDecimal.divide(s.sum.toString(), rate.toString(), 2)
        return bigDecimal.add(carry, convertedSum)
    }, "0")
    const sumsMap = sums.reduce((carry, s) => {
        carry[s._id] = s.sum.toString()
        return carry
    }, {} as Record<string, string>)
    return { sums: sumsMap, totalUSD }
}