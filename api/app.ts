require("dotenv").config()
import mongoose from "mongoose";
import express from "express"
import bodyParser from "body-parser";
import cors from "cors"

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
    symbol: String,
    isConvertedTotal: Boolean
})

const Transaction = mongoose.model("Transaction", transactionSchema)
const ExchangeRateUSD = mongoose.model("ExchangeRateUSD", exchangeRateUSDSchema)
const BalanceTotal = mongoose.model("BalanceTotal", balanceTotalSchema)

const getTransactions = () => {
    const transactionsData: {
        Date: String,
        Amount: String,
        Category: String
    }[] = require("../transactions.json")
    const transactions = transactionsData
        .filter(t => t.Date && t.Amount && t.Category)
        .map(t => {
            const [day, month, year] = t.Date.split('.')
            const match = t.Amount.match(/(.*)\n?/gm)
            const amount = match ? match[0] : null
            return {
                date: new Date(Number.parseInt(year, 10) + 2000, Number.parseInt(month, 10) - 1, Number.parseInt(day, 10)),
                amount: amount ? amount.replaceAll(/[^-\d,]/g, "") : "",
                category: t.Category,
            }
        })
        .filter(t => t.amount)
        .map(t => ({
            ...t,
            amount: Number.parseFloat(t.amount.replace(",", ".")),
            symbol: "KZT"
        }))
    return transactions
}

const getDateRange = async () => {
    const [{max, min}] = await Transaction.aggregate([{ $group: { _id: null, max: { $max: "$date" }, min: { $min: "$date" } } }])
    return {max, min}
}

const getMonthRange = async () => {
    return await Transaction.aggregate([
        { $group: { _id: { year: { $year: "$date" }, month: { $month: "$date" } } } },
    ])
}

const getDatePlusOne = (date: Date) => {
    const datePlusOne = new Date(date)
    datePlusOne.setDate(datePlusOne.getDate() + 1)
    return datePlusOne
}

const getDayTransactions = async (date: Date) => {
    const datePlusOne = getDatePlusOne(date)
    return await Transaction.find({
        date: { $gte: date, $lt: datePlusOne}
    })
}

const getDaySum = async (date: Date) => {
    const datePlusOne = getDatePlusOne(date)
    return await Transaction.aggregate([
        { $match: { date: { $gte: date, $lt: datePlusOne }}},
        { $group: { _id: "$symbol", sum: {$sum: "$amount"} }}
    ])
}

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

const getMonthDetailing = async (year: number, month: number) => {
    const {start, end} = getStartEndOfMonth(year, month)
    return await Transaction.aggregate([
        { $match: { date: { $gte: start, $lt: end } } },
        { $group: { _id: { day_id: { $dayOfMonth: "$date"}, symbol_id: "$symbol", category_id: "$category" }, sum: { $sum: "$amount" } } },
        { $group: { _id: "$_id.day_id", detailing: { $push: { category: "$_id.category_id", symbol: "$_id.symbol_id", sum: { $sum: "$sum" } } } } }
    ])
}

const init = async () => {
    const app = express()
    app.use(bodyParser.json())
    app.use(cors())
    await mongoose.connect(`mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@localhost/scrooge`)
    app.get("/range", async (req, res) => {
        const monthRange = await getMonthRange()    
        res.send(monthRange)
    })
    app.get("/month", async (req, res) => {
        const {year, month} = req.query
        if (!year || !month) {
            res.status(400).end()
        } 
        const yearNum = Number.parseInt(year as string)
        const monthNum = Number.parseInt(month as string)
        if (Number.isNaN(yearNum) || Number.isNaN(monthNum)) {
            res.status(400).end()
        }
        const detailing = await getMonthDetailing(yearNum, monthNum)
        res.send(detailing)
    })
    app.listen(8080, () => {
        console.log('listening on 8080')
    })
}

init().catch(err => console.error(err))
