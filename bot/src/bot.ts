import {
  Telegraf,
  Scenes,
} from 'telegraf';
import fetch from 'node-fetch';
import RedisSession from 'telegraf-session-redis';
import {
  TotalResponse, MyContext, DateExpensesResponse,
} from './types';
import {
  printExpenses,
  printTotal,
} from './print';
import { CALLBACK_BUTTONS, COMMANDS, TOKENS } from './tokens';
import { HANDLERS } from './handlers';
import {
  showDateScene,
  setSymbolScene,
  setAmountScene,
  setCategoryScene,
  confirmTransactionScene,
  addTransactionFileScene,
  confirmTransactionFileScene,
  setDateScene,
  setTimezoneScene,
} from './scenes';

require('dotenv').config();

if (!process.env.BOT_TOKEN) {
  console.error('token not configured');
}

if (!process.env.API_HOST) {
  console.error('api host not configured');
}

if (!process.env.AUTHORIZED_USER) {
  console.error('authorized user not configured');
}

const stage = new Scenes.Stage<MyContext>([
  showDateScene,
  setDateScene,
  setSymbolScene,
  setAmountScene,
  setCategoryScene,
  confirmTransactionScene,
  addTransactionFileScene,
  confirmTransactionFileScene,
  setTimezoneScene,
]);

const init = async () => {
  const bot = new Telegraf<MyContext>(
    process.env.BOT_TOKEN as string,
  );
  const session = new RedisSession({
    store: {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: process.env.REDIS_PORT || 6379,
    },
  });
  bot.use(session);
  bot.use(stage.middleware());
  bot.on('text', async (ctx, next) => {
    if (ctx.from.username !== process.env.AUTHORIZED_USER) {
      ctx.reply(TOKENS.WRONG_USER_ERROR);
    } else {
      await next();
    }
  });
  bot.command(COMMANDS.START, HANDLERS.START);
  bot.action(CALLBACK_BUTTONS.addTransaction[1], async (ctx) => {
    await ctx.answerCbQuery();
    ctx.scene.enter('setDateScene');
  });
  bot.action(CALLBACK_BUTTONS.showDateExpenses[1], async (ctx) => {
    await ctx.answerCbQuery();
    ctx.scene.enter('showDateScene');
  });
  bot.action(CALLBACK_BUTTONS.showTodayExpenses[1], async (ctx) => {
    await ctx.answerCbQuery();
    try {
      const timezone = ctx.session.timezone || 0;
      const res = await fetch(`${process.env.API_HOST}/day_expenses?timezone=${timezone}`);
      const { date: dateString, expenses } = await res.json() as DateExpensesResponse;
      const resultDate = new Date(dateString);
      const result = printExpenses(resultDate, expenses);
      ctx.replyWithMarkdownV2(result);
      ctx.scene.leave();
    } catch (e) {
      console.error(e);
      ctx.reply(TOKENS.FETCH_ERROR);
    }
  });
  bot.action(CALLBACK_BUTTONS.addTransactionFile[1], async (ctx) => {
    await ctx.answerCbQuery();
    ctx.scene.enter('addTransactionFile');
  });
  bot.action(CALLBACK_BUTTONS.showTotal[1], async (ctx) => {
    await ctx.answerCbQuery();
    try {
      const res = await fetch(`${process.env.API_HOST}/total`);
      const total = await res.json() as TotalResponse;
      const totalString = printTotal(total);
      await ctx.replyWithMarkdownV2(totalString);
    } catch (e) {
      await ctx.reply(TOKENS.FETCH_ERROR);
    }
  });
  bot.action(CALLBACK_BUTTONS.show30DayExpensesByCategory[1], async (ctx) => {
    await HANDLERS.RANGE_EXPENSES_CATEGORIES(ctx, '/30_day_expenses_by_category', 'Расходы за 30 дней');
  });
  bot.action(CALLBACK_BUTTONS.show30DayExpensesByDay[1], async (ctx) => {
    await HANDLERS.RANGE_EXPENSES_DAYS(ctx, '/30_day_expenses_by_day', 'Расходы за 30 дней');
  });
  bot.action(CALLBACK_BUTTONS.showWeekExpensesByCategory[1], async (ctx) => {
    await HANDLERS.RANGE_EXPENSES_CATEGORIES(ctx, '/week_expenses_by_category', 'Расходы за неделю');
  });
  bot.action(CALLBACK_BUTTONS.showWeekExpensesByDay[1], async (ctx) => {
    await HANDLERS.RANGE_EXPENSES_DAYS(ctx, '/week_expenses_by_day', 'Расходы за неделю');
  });
  bot.action(CALLBACK_BUTTONS.showMonthExpensesByCategory[1], async (ctx) => {
    await HANDLERS.RANGE_EXPENSES_CATEGORIES(ctx, '/month_expenses_by_category', 'Расходы за месяц');
  });
  bot.action(CALLBACK_BUTTONS.showMonthExpensesByDay[1], async (ctx) => {
    await HANDLERS.RANGE_EXPENSES_DAYS(ctx, '/month_expenses_by_day', 'Расходы за месяц');
  });
  bot.action(CALLBACK_BUTTONS.setTimezone[1], async (ctx) => {
    await ctx.answerCbQuery();
    ctx.scene.enter('setTimezoneScene');
  });
  process.once('SIGINT', () => {
    bot.stop('SIGINT');
  });
  process.once('SIGTERM', () => {
    bot.stop('SIGTERM');
  });
  bot.launch();
};

init();
