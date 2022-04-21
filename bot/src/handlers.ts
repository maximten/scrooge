import { Markup } from 'telegraf';
import fetch from 'node-fetch';
import { printExpensesBySymbolsByCategories, printExpensesBySymbolsByDays } from './print';
import { TOKENS, CALLBACK_BUTTONS } from './tokens';
import { MyContext, RangeExpensesResponse } from './types';

export const HANDLERS = {
  START: async (ctx: MyContext) => {
    await ctx.reply(TOKENS.GREETINS, Markup.inlineKeyboard([
      [Markup.button.callback(
        CALLBACK_BUTTONS.addTransaction[0],
        CALLBACK_BUTTONS.addTransaction[1],
      )],
      [Markup.button.callback(
        CALLBACK_BUTTONS.addTransactionFile[0],
        CALLBACK_BUTTONS.addTransactionFile[1],
      )],
      [Markup.button.callback(
        CALLBACK_BUTTONS.showTodayExpenses[0],
        CALLBACK_BUTTONS.showTodayExpenses[1],
      )],
      [Markup.button.callback(
        CALLBACK_BUTTONS.showDateExpenses[0],
        CALLBACK_BUTTONS.showDateExpenses[1],
      )],
      [Markup.button.callback(
        CALLBACK_BUTTONS.show30DayExpensesByCategory[0],
        CALLBACK_BUTTONS.show30DayExpensesByCategory[1],
      )],
      [Markup.button.callback(
        CALLBACK_BUTTONS.show30DayExpensesByDay[0],
        CALLBACK_BUTTONS.show30DayExpensesByDay[1],
      )],
      [Markup.button.callback(
        CALLBACK_BUTTONS.showWeekExpensesByCategory[0],
        CALLBACK_BUTTONS.showWeekExpensesByCategory[1],
      )],
      [Markup.button.callback(
        CALLBACK_BUTTONS.showWeekExpensesByDay[0],
        CALLBACK_BUTTONS.showWeekExpensesByDay[1],
      )],
      [Markup.button.callback(
        CALLBACK_BUTTONS.showMonthExpensesByCategory[0],
        CALLBACK_BUTTONS.showMonthExpensesByCategory[1],
      )],
      [Markup.button.callback(
        CALLBACK_BUTTONS.showMonthExpensesByDay[0],
        CALLBACK_BUTTONS.showMonthExpensesByDay[1],
      )],
      [Markup.button.callback(
        CALLBACK_BUTTONS.showTotal[0],
        CALLBACK_BUTTONS.showTotal[1],
      )],
      [Markup.button.callback(
        CALLBACK_BUTTONS.setTimezone[0],
        CALLBACK_BUTTONS.setTimezone[1],
      )],
    ]));
  },
  RANGE_EXPENSES_CATEGORIES: async (ctx: MyContext, apiPath: string, responseHeader: string) => {
    await ctx.answerCbQuery();
    try {
      const res = await fetch(`${process.env.API_HOST}${apiPath}`);
      const expenses = await res.json() as RangeExpensesResponse;
      const expensesString = printExpensesBySymbolsByCategories(expenses, responseHeader);
      await ctx.replyWithMarkdownV2(expensesString);
    } catch (e) {
      console.error(e);
      await ctx.reply(TOKENS.FETCH_ERROR);
    }
  },
  RANGE_EXPENSES_DAYS: async (ctx: MyContext, apiPath: string, responseHeader: string) => {
    await ctx.answerCbQuery();
    try {
      const res = await fetch(`${process.env.API_HOST}${apiPath}`);
      const expenses = await res.json() as RangeExpensesResponse;
      const expensesString = printExpensesBySymbolsByDays(expenses, responseHeader);
      await ctx.replyWithMarkdownV2(expensesString);
    } catch (e) {
      console.error(e);
      await ctx.reply(TOKENS.FETCH_ERROR);
    }
  },
};
