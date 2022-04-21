import { Scenes, Markup } from 'telegraf';
import * as fs from 'fs';
import fetch from 'node-fetch';
import { HANDLERS } from './handlers';
import { printExpenses, printTransaction, printTransactionList } from './print';
import { TOKENS, CALLBACK_BUTTONS, COMMANDS } from './tokens';
import { MyContext, DateExpensesResponse } from './types';
import { extractDataFromCsv } from './utils';

export const showDateScene = new Scenes.BaseScene<MyContext>('showDateScene');
showDateScene.enter((ctx) => ctx.reply('Введите дату'));
showDateScene.command(COMMANDS.STOP, async (ctx) => {
  await ctx.scene.leave();
  await HANDLERS.START(ctx);
});
showDateScene.on('text', async (ctx) => {
  const dateString = ctx.message.text;
  const date = new Date(dateString);
  if (date.toString() === 'Invalid Date') {
    ctx.reply(TOKENS.DATE_ERROR);
    return;
  }
  try {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const timezone = ctx.session.timezone || 0;
    const res = await fetch(`${process.env.API_HOST}/date_expenses?year=${year}&month=${month}&day=${day}&timezone=${timezone}`);
    const { date: dateString, expenses } = await res.json() as DateExpensesResponse;
    const resultDate = new Date(dateString);
    const result = printExpenses(resultDate, expenses);
    ctx.replyWithMarkdownV2(result);
    ctx.scene.leave();
  } catch (e) {
    console.error(e);
    console.error(e);
    ctx.reply(TOKENS.FETCH_ERROR);
  }
});

export const setDateScene = new Scenes.BaseScene<MyContext>('setDateScene');
setDateScene.enter((ctx) => ctx.reply(
  TOKENS.SET_DATE_REQUEST,
  Markup.inlineKeyboard([
    Markup.button.callback(
      CALLBACK_BUTTONS.today[0],
      CALLBACK_BUTTONS.today[1],
    ),
    Markup.button.callback(
      CALLBACK_BUTTONS.yesterday[0],
      CALLBACK_BUTTONS.yesterday[1],
    ),
  ]),
));
setDateScene.action(CALLBACK_BUTTONS.today[1], async (ctx) => {
  ctx.session.date = new Date();
  await ctx.reply(ctx.session.date.toLocaleDateString('RU'));
  await ctx.answerCbQuery();
  ctx.scene.enter('setSymbolScene');
});
setDateScene.action(CALLBACK_BUTTONS.yesterday[1], async (ctx) => {
  const yesterday = new Date();
  await ctx.reply(yesterday.toLocaleDateString('RU'));
  yesterday.setDate(yesterday.getDate() - 1);
  ctx.session.date = yesterday;
  await ctx.answerCbQuery();
  ctx.scene.enter('setSymbolScene');
});
setDateScene.command(COMMANDS.STOP, async (ctx) => {
  await ctx.scene.leave();
  await HANDLERS.START(ctx);
});
setDateScene.on('text', async (ctx) => {
  const date = new Date(ctx.message.text);
  if (date.toString() === 'Invalid Date') {
    await ctx.reply(TOKENS.DATE_ERROR);
    return;
  }
  await ctx.reply(date.toLocaleDateString('RU'));
  ctx.session.date = date;
  ctx.scene.enter('setSymbolScene');
});

export const setSymbolScene = new Scenes.BaseScene<MyContext>('setSymbolScene');
setSymbolScene.enter(async (ctx) => {
  try {
    const res = await fetch(`${process.env.API_HOST}/symbols`);
    const symbols = await res.json() as string[];
    const buttons = symbols.map((s) => [Markup.button.callback(s, s)]);
    await ctx.reply(TOKENS.REQUEST_SYMBOL, Markup.inlineKeyboard(buttons));
  } catch (e) {
    console.error(e);
    ctx.reply(TOKENS.FETCH_ERROR);
    ctx.scene.leave();
  }
});
setSymbolScene.on('callback_query', async (ctx) => {
  await ctx.answerCbQuery();
  const query = ctx.callbackQuery as { data: string };
  ctx.session.symbol = query.data;
  ctx.scene.enter('setAmountScene');
});
setSymbolScene.command(COMMANDS.STOP, async (ctx) => {
  await ctx.scene.leave();
  await HANDLERS.START(ctx);
});
setSymbolScene.on('text', async (ctx) => {
  ctx.session.symbol = ctx.message.text;
  ctx.scene.enter('setAmountScene');
});

export const setAmountScene = new Scenes.BaseScene<MyContext>('setAmountScene');
setAmountScene.enter((ctx) => ctx.reply(TOKENS.SET_AMOUNT_REQUEST));
setAmountScene.command(COMMANDS.STOP, async (ctx) => {
  await ctx.scene.leave();
  await HANDLERS.START(ctx);
});
setAmountScene.command(COMMANDS.STOP, async (ctx) => {
  await ctx.scene.leave();
  await HANDLERS.START(ctx);
});
setAmountScene.on('text', async (ctx) => {
  const amountString = ctx.message.text;
  const amount = Number.parseFloat(amountString);
  if (Number.isNaN(amount)) {
    await ctx.reply(TOKENS.AMOUNT_ERROR);
    return;
  }
  ctx.session.amount = amount;
  await ctx.scene.enter('setCategoryScene');
});

export const setCategoryScene = new Scenes.BaseScene<MyContext>('setCategoryScene');
setCategoryScene.enter(async (ctx) => {
  try {
    const res = await fetch(`${process.env.API_HOST}/categories`);
    const categories = await res.json() as string[];
    const buttons = categories.map((c) => Markup.button.callback(c, c));
    const grid = buttons.reduce((carry, item, index) => {
      if (index % 2 === 0) {
        carry.push([item]);
      } else {
        carry[carry.length - 1].push(item);
      }
      return carry;
    }, [] as typeof buttons[]);
    await ctx.reply(TOKENS.CHOOSE_CATEGORY, Markup.inlineKeyboard(grid));
  } catch (e) {
    console.error(e);
    ctx.reply(TOKENS.FETCH_ERROR);
  }
});
setCategoryScene.on('callback_query', async (ctx) => {
  await ctx.answerCbQuery();
  const query = ctx.callbackQuery as { data: string };
  ctx.session.category = query.data;
  ctx.scene.enter('confirmTransactionScene');
});
setCategoryScene.command(COMMANDS.STOP, async (ctx) => {
  await ctx.scene.leave();
  await HANDLERS.START(ctx);
});
setCategoryScene.on('text', async (ctx) => {
  ctx.session.category = ctx.message.text;
  ctx.scene.enter('confirmTransactionScene');
});

export const confirmTransactionScene = new Scenes.BaseScene<MyContext>('confirmTransactionScene');
confirmTransactionScene.enter(async (ctx) => {
  const transaction = {
    date: new Date(ctx.session.date),
    symbol: ctx.session.symbol,
    amount: ctx.session.amount,
    category: ctx.session.category,
  };
  const transactionString = printTransaction(transaction);
  await ctx.replyWithMarkdownV2(transactionString);
  await ctx.reply(TOKENS.REQUEST_TRANSACTION_CONFIRMATION, Markup.inlineKeyboard([
    Markup.button.callback(CALLBACK_BUTTONS.yes[0], CALLBACK_BUTTONS.yes[1]),
    Markup.button.callback(CALLBACK_BUTTONS.no[0], CALLBACK_BUTTONS.no[1]),
  ]));
});
confirmTransactionScene.on('callback_query', async (ctx) => {
  await ctx.answerCbQuery();
  const query = ctx.callbackQuery as { data: string };
  if (query.data === CALLBACK_BUTTONS.yes[1]) {
    const transaction = {
      date: ctx.session.date,
      symbol: ctx.session.symbol,
      amount: ctx.session.amount,
      category: ctx.session.category,
    };
    try {
      const res = await fetch(`${process.env.API_HOST}/transaction`, {
        method: 'POST',
        headers: {
          'Content-type': 'application/json',
        },
        body: JSON.stringify(transaction),
      });
      if (res.status !== 200) {
        ctx.reply(TOKENS.FETCH_ERROR);
        return;
      }
      await ctx.reply(TOKENS.TRANSACTION_SAVE_SUCCESS);
      ctx.scene.leave();
    } catch (e) {
      console.error(e);
      await ctx.reply(TOKENS.FETCH_ERROR);
    }
    await HANDLERS.START(ctx);
  } else {
    await ctx.scene.leave();
    await HANDLERS.START(ctx);
  }
});

export const addTransactionFileScene = new Scenes.BaseScene<MyContext>('addTransactionFile');
addTransactionFileScene.enter(async (ctx) => {
  await ctx.reply(TOKENS.REQUEST_TRANSACTION_FILE, Markup.inlineKeyboard([
    Markup.button.callback(CALLBACK_BUTTONS.exit[0], CALLBACK_BUTTONS.exit[1]),
  ]));
  await ctx.replyWithDocument({
    source: fs.readFileSync('/app/transactions.csv'),
    filename: 'example.csv',
  });
});
addTransactionFileScene.action(CALLBACK_BUTTONS.exit[1], (ctx) => ctx.scene.leave());
addTransactionFileScene.on('document', async (ctx) => {
  const { file_id: fileId } = ctx.message.document;
  const url = await ctx.telegram.getFileLink(fileId);
  const res = await fetch(url.href);
  const csvData = await res.text();
  const data = extractDataFromCsv(csvData);
  const transactionList = data
    .filter((item) => item.date
            && item.symbol
            && item.amount
            && item.category)
    .map((item) => ({
      date: new Date(item.date),
      symbol: item.symbol,
      amount: Number.parseFloat(item.amount),
      category: item.category,
    })).filter((item) => (item.date.toString() !== 'Inlvalid Date' && !Number.isNaN(item.amount))) as {
    date: Date,
    symbol: string,
    amount: number,
    category: string,
  }[];
  ctx.session.transactionList = transactionList;
  ctx.scene.enter('confirmTransactionFile');
});
addTransactionFileScene.command(COMMANDS.STOP, async (ctx) => {
  await ctx.scene.leave();
  await HANDLERS.START(ctx);
});

export const confirmTransactionFileScene = new Scenes.BaseScene<MyContext>('confirmTransactionFile');
confirmTransactionFileScene.enter(async (ctx) => {
  const { transactionList } = ctx.session;
  const transactionListString = printTransactionList(transactionList);
  await ctx.reply(transactionListString);
  await ctx.reply(TOKENS.REQUEST_TRANSACTION_CONFIRMATION, Markup.inlineKeyboard([
    Markup.button.callback(CALLBACK_BUTTONS.yes[0], CALLBACK_BUTTONS.yes[1]),
    Markup.button.callback(CALLBACK_BUTTONS.no[0], CALLBACK_BUTTONS.no[1]),
  ]));
});
confirmTransactionFileScene.on('callback_query', async (ctx) => {
  await ctx.answerCbQuery();
  const query = ctx.callbackQuery as { data: string };
  if (query.data === CALLBACK_BUTTONS.yes[1]) {
    const { transactionList } = ctx.session;
    try {
      const res = await fetch(`${process.env.API_HOST}/transactionList`, {
        method: 'POST',
        headers: {
          'Content-type': 'application/json',
        },
        body: JSON.stringify(transactionList),
      });
      if (res.status !== 200) {
        await ctx.reply(TOKENS.FETCH_ERROR);
        return;
      }
      await ctx.reply(TOKENS.TRANSACTION_LIST_SAVE_SUCCESS);
      await ctx.scene.leave();
      await HANDLERS.START(ctx);
    } catch (e) {
      await ctx.reply(TOKENS.FETCH_ERROR);
    }
  } else {
    await ctx.scene.leave();
    await HANDLERS.START(ctx);
  }
});
confirmTransactionFileScene.command(COMMANDS.STOP, async (ctx) => {
  await ctx.scene.leave();
  await HANDLERS.START(ctx);
});

export const setTimezoneScene = new Scenes.BaseScene<MyContext>('setTimezoneScene');
setTimezoneScene.enter(async (ctx) => {
  const { timezone } = ctx.session || 0;
  const timezoneString = timezone > 0 ? `+${timezone}` : timezone;
  await ctx.reply(`${TOKENS.CURRENT_TIMEZONE} ${timezoneString}`);
  await ctx.reply(TOKENS.SET_TIMEZONE_REQUEST);
});
setTimezoneScene.command(COMMANDS.STOP, async (ctx) => {
  await ctx.scene.leave();
  await HANDLERS.START(ctx);
});
setTimezoneScene.on('text', async (ctx) => {
  const { text } = ctx.message;
  const timezone = Number.parseInt(text, 10);
  if (Number.isNaN(timezone)) {
    await ctx.reply(TOKENS.TIMEZONE_ERROR);
    return;
  }
  if (Math.abs(timezone) > 24) {
    await ctx.reply(TOKENS.TIMEZONE_ERROR);
    return;
  }
  ctx.session.timezone = timezone;
  await ctx.reply(TOKENS.SET_TIMEZONE_SUCCESS);
  await ctx.scene.leave();
});
