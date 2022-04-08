import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import {
  getCategories,
  getMonthDetailing, getMonthRange, getSymbols, getTotal,
} from './controllers';
import { Transaction } from './models';
import { connectToMongo } from './utils';

export const initApp = async () => {
  const app = express();
  app.use(bodyParser.json());
  app.use(cors());
  await connectToMongo();
  app.get('/range', async (req, res) => {
    const monthRange = await getMonthRange();
    res.send(monthRange);
  });
  app.get('/month', async (req, res) => {
    const { year, month } = req.query;
    if (!year || !month) {
      res.sendStatus(400);
    }
    const yearNum = Number.parseInt(year as string, 10);
    const monthNum = Number.parseInt(month as string, 10);
    if (Number.isNaN(yearNum) || Number.isNaN(monthNum)) {
      res.sendStatus(400);
    }
    const detailing = await getMonthDetailing(yearNum, monthNum);
    res.send(detailing);
  });
  app.get('/total', async (req, res) => {
    const date = new Date();
    const total = await getTotal(date);
    res.send(total);
  });
  app.get('/symbols', async (req, res) => {
    const symbols = await getSymbols();
    res.send(symbols);
  });
  app.get('/categories', async (req, res) => {
    const categories = await getCategories();
    res.send(categories);
  });
  app.post('/transaction', async (req, res) => {
    const { body } = req;
    const transaction = new Transaction({
      date: body.date,
      symbol: body.symbol,
      amount: body.amount,
      category: body.category,
    });
    try {
      await transaction.validate();
      await transaction.save();
      res.sendStatus(200);
    } catch {
      res.sendStatus(400);
    }
  });
  app.listen(8080, () => {
    console.log('listening on 8080');
  });
};
