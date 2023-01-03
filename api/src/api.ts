import bodyParser from 'body-parser';
import express from 'express';
import { Transaction } from './models';
import { connectToMongo, getTimezone } from './utils';
import { exchangesController, transactionController } from './controllers';

require('dotenv').config();

const init = async () => {
  const app = express();
  app.use(bodyParser.json());
  await connectToMongo(process.env.MONGO_HOST as string);
  app.use((req, res, next) => {
    console.log(req.path);
    next();
  });
  app.get('/total', async (req, res) => {
    const date = new Date();
    const total = await transactionController.getTotal(date);
    res.send(total);
  });
  app.get('/symbols', async (req, res) => {
    const symbols = await transactionController.getSymbols();
    res.send(symbols);
  });
  app.get('/categories', async (req, res) => {
    const categories = await transactionController.getCategories();
    res.send(categories);
  });
  app.post('/transaction', async (req, res) => {
    const { body } = req;
    const dto = {
      date: body.date,
      symbol: body.symbol,
      amount: body.amount,
      category: body.category,
    };
    try {
      await transactionController.addTransaction(dto);
      res.sendStatus(200);
    } catch (e) {
      console.error(e);
      res.sendStatus(400);
    }
  });
  app.post('/transactionList', async (req, res) => {
    const { body } = req;
    try {
      Transaction.insertMany(body);
      res.sendStatus(200);
    } catch {
      res.sendStatus(400);
    }
  });
  app.get('/day_expenses', async (req, res) => {
    const timezone = getTimezone(req.query.timezone);
    const today = new Date();
    const expenses = await transactionController.getDayExpenses(today, timezone);
    res.send({
      date: today,
      expenses,
    });
  });
  app.get('/date_expenses', async (req, res) => {
    const timezone = getTimezone(req.query.timezone);
    const { year, month, day } = req.query;
    if (!year || !month || !day) {
      res.sendStatus(400);
    }
    const yearNum = Number.parseInt(year as string, 10);
    const monthNum = Number.parseInt(month as string, 10);
    const dayNum = Number.parseInt(day as string, 10);
    if (Number.isNaN(yearNum) || Number.isNaN(monthNum) || Number.isNaN(dayNum)) {
      res.sendStatus(400);
    }
    const date = new Date(yearNum, monthNum - 1, dayNum);
    const expenses = await transactionController.getDayExpenses(date, timezone);
    res.send({
      date,
      expenses,
    });
  });
  app.get('/30_day_expenses_by_category', async (req, res) => {
    const date = new Date();
    const {
      transactionsBySymbol,
      convertedTransactionsBySymbol,
      totalSum,
    } = await transactionController
      .get30DaysExpensesGroupedByCategory(date);
    res.send({
      transactionsBySymbol,
      convertedTransactionsBySymbol,
      totalSum,
    });
  });
  app.get('/30_day_expenses_by_day', async (req, res) => {
    const timezone = getTimezone(req.query.timezone);
    const date = new Date();
    const {
      transactionsBySymbol,
      convertedTransactionsBySymbol,
      totalSum,
    } = await transactionController
      .get30DaysExpensesGroupedByDay(date, timezone);
    res.send({
      transactionsBySymbol,
      convertedTransactionsBySymbol,
      totalSum,
    });
  });
  app.get('/week_expenses_by_category', async (req, res) => {
    const timezone = getTimezone(req.query.timezone);
    const date = new Date();
    const {
      transactionsBySymbol,
      convertedTransactionsBySymbol,
      totalSum,
    } = await transactionController
      .getWeekExpensesGroupedByCategory(date, timezone);
    res.send({
      transactionsBySymbol,
      convertedTransactionsBySymbol,
      totalSum,
    });
  });
  app.get('/week_expenses_by_day', async (req, res) => {
    const timezone = getTimezone(req.query.timezone);
    const date = new Date();
    const {
      transactionsBySymbol,
      convertedTransactionsBySymbol,
      totalSum,
    } = await transactionController
      .getWeekExpensesGroupedByDay(date, timezone);
    res.send({
      transactionsBySymbol,
      convertedTransactionsBySymbol,
      totalSum,
    });
  });
  app.get('/month_expenses_by_category', async (req, res) => {
    const timezone = getTimezone(req.query.timezone);
    const date = new Date();
    const {
      transactionsBySymbol,
      convertedTransactionsBySymbol,
      totalSum,
    } = await transactionController
      .getMonthExpensesGroupedByCategory(date, timezone);
    res.send({
      transactionsBySymbol,
      convertedTransactionsBySymbol,
      totalSum,
    });
  });
  app.get('/month_expenses_by_day', async (req, res) => {
    const timezone = getTimezone(req.query.timezone);
    const date = new Date();
    const {
      transactionsBySymbol,
      convertedTransactionsBySymbol,
      totalSum,
    } = await transactionController
      .getMonthExpensesGroupedByDay(date, timezone);
    res.send({
      transactionsBySymbol,
      convertedTransactionsBySymbol,
      totalSum,
    });
  });
  app.get('/update_rates', async (req, res) => {
    const symbols = await transactionController.getSymbols();
    const symbolsPromise = symbols.map((s) => exchangesController.importRate(s));
    await Promise.all(symbolsPromise);
    res.send('ok');
  });
  app.get('/year_balance', async (req, res) => {
    const year = parseInt(req.query.year?.toString() || '', 10);
    const result = await transactionController.getYearBalance(year);
    const csv = result.map(row => row.join(',')).join("\n");
    res.send(csv);
  });
  app.listen(8080, () => {
    console.log('listening on 8080');
  });
};

init().catch((err) => console.error(err));
