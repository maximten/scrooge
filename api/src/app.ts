require("dotenv").config()
import mongoose from "mongoose";
import { getTotal } from "./controllers";
import { ExchangeRateUSD, Transaction, BalanceTotal } from "./models";
import { initApp } from "./routes";

const getDateRange = async () => {
    const [{max, min}] = await Transaction.aggregate([{ $group: { _id: null, max: { $max: "$date" }, min: { $min: "$date" } } }])
    return {max, min}
}

const getDatePlusOne = (date: Date) => {
    const datePlusOne = new Date(date)
    datePlusOne.setDate(datePlusOne.getDate() + 1)
    return datePlusOne
}

const getDateMinusTwo = (date: Date) => {
    const dateMinusTwo = new Date(date)
    dateMinusTwo.setDate(dateMinusTwo.getDate() - 2)
    return dateMinusTwo 
}

const getDayTransactions = async (date: Date) => {
    const datePlusOne = getDatePlusOne(date)
    return await Transaction.find({
        date: { $gte: date, $lt: datePlusOne}
    })
}

// const getDaySum = async (date: Date) => {
//     const datePlusOne = getDatePlusOne(date)
//     const sumsData: {
//         _id: string,
//         sum: number
//     }[] = await Transaction.aggregate([
//         { $match: { date: { $gte: date, $lt: datePlusOne }}},
//         { $group: { _id: "$symbol", sum: {$sum: "$amount"} }}
//     ])
//     const sums = sumsData.reduce((carry, sum) => {
//         carry[sum._id] = sum.sum
//         return carry
//     }, {} as Record<string, number>)
//     // const sums = sumsData.map(sum => ({symbol: sum._id, sum: sum.sum}))

//     const sumsUSD = await Promise.all(Object.entries(sums).map(async ([symbol, sum]) => {
//         if (symbol === "USD") {
//             return sum
//         } else {
//             const newSum = {...sum}
//             const exchangeRate = await getSymbolRateAtDate(date, symbol)
//             newSum.sum = sum.sum / exchangeRate
//             return newSum
//         }
//     }))
//     const sumUSD = sumsUSD.reduce((carry, sum) => carry + sum.sum, 0)
//     return { sums, sumUSD }
// }

const saveDaySum = async (date: Date, { sums, sumUSD }: { sums: {
    symbol: string,
    sum: number
}[], sumUSD: number }) => {
    const total = new BalanceTotal({
        dateType: "day",
        day: date.getDate(),
        month: date.getMonth(),
        year: date.getFullYear(),
        sumUSD,
        sums
    })
    await total.save()
}

const getMonthDays = (year: number, month: number) => {
    let current = new Date(year, month - 1, 1)
    const days = []
    while (current.getMonth() < month) {
        if (current.getMonth() === month - 1) {
            days.push(current)
        }
        current = new Date(current)
        current.setDate(current.getDate() + 1)
    }
    return days
}

// const initMonthDaysSum = async (year: number, month: number) => {
//     const days = await getMonthDays(year, month)
//     const daysSums = await Promise.all(days.map(async (date) => {
//         const sums = await getDaySum(date)
//         return {date, sums}
//     }))
//     for (const item of daysSums) {
//         const {date, sums} = item
//         await saveDaySum(date, sums)
//     }
// }

// const initMonthsSums = async () => {
//     const range = await getMonthRange()
//     for (const month of range) {
//         await initMonthDaysSum(month._id.year, month._id.month)
//     }
// }

const getDayDetailing = async (date: Date) => {
    const datePlusOne = getDatePlusOne(date)
    return await Transaction.aggregate([
        { $match: { date: { $gte: date, $lt: datePlusOne } } },
        { $group: { _id: { symbol_id: "$symbol", category_id: "$category" }, sum: { $sum: "$amount" } } },
    ])
}

const getStartEndOfMonth = (year: number, month: number) => {
    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 1)
    return {start, end}
}

const getSymbolRateAtDate = async (date: Date, symbol: string) => {
    const dateMinusTwo = getDateMinusTwo(date)
    const rates = await ExchangeRateUSD.find({
        date: {$gte: dateMinusTwo, $lte: date},
        symbol 
    }).sort({date: -1})
    if (rates.length < 1) {
        // TODO: API CALL
    } else {
        return rates[0].rate
    }
}

const test = async () => {
    await mongoose.connect(`mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@localhost/scrooge`)
    const date = new Date()
    await getTotal(date)
    // await getTotal(date)

}

const init = async () => {
    await initApp()
    // await migrate()
    // await test()
}

init().catch(err => console.error(err))

/**
 * * Month detailing
 *      transactions
 *          in usd
 *      balance
 * * Total balance at date
 *      assets sum
 *      total sum in usd
 * * Total balance diff
 *      day to day
 *      month to month
 *      year to year
 */