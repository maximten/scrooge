import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import { getMonthDetailing, getMonthRange, getTotal } from './controllers';

export const initApp = async () => {
  const app = express();
  app.use(bodyParser.json());
  app.use(cors());
  await mongoose.connect(`mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@localhost/scrooge`);
  app.get('/range', async (req, res) => {
    const monthRange = await getMonthRange();
    res.send(monthRange);
  });
  app.get('/month', async (req, res) => {
    const { year, month } = req.query;
    if (!year || !month) {
      res.status(400).end();
    }
    const yearNum = Number.parseInt(year as string, 10);
    const monthNum = Number.parseInt(month as string, 10);
    if (Number.isNaN(yearNum) || Number.isNaN(monthNum)) {
      res.status(400).end();
    }
    const detailing = await getMonthDetailing(yearNum, monthNum);
    res.send(detailing);
  });
  app.get('/total', async (req, res) => {
    const date = new Date();
    const total = await getTotal(date);
    res.send(total);
  });
  app.listen(8080, () => {
    console.log('listening on 8080');
  });
};
