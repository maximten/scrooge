import {
  Markup,
  Telegraf,
  session,
  Scenes,
  Context,
} from 'telegraf';

import fetch from 'node-fetch';

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

type Expenses = {
  amount: string,
  symbol: string,
  category: string
}[];

type ExpensesResponse = {
  date: string,
  expenses: Expenses
};

const printTransaction = ({
  date, symbol, amount, category,
}: { date: Date, symbol: string, amount: number, category: string }) => (`
Дата: ${date.toLocaleDateString('RU')},
Сумма: ${amount} ${symbol},
Категория: ${category}
`);

const printExpenses = (date: Date, expenses: Expenses) => {
  const expensesList = expenses.map((item) => {
    const amountString = item.amount.padEnd(20);
    const symbolString = item.symbol.padEnd(10);
    const categoryString = item.category;
    return `${amountString}${symbolString}${categoryString}`;
  }).join('\n');
  const dateString = date.toLocaleDateString('RU');
  const start = '\`\`\`\n';
  const header = `Расходы на ${dateString}:\n`;
  const end = '\`\`\`\n';
  return start + header + expensesList + end;
};

const CALLBACK_BUTTONS = {
  addTransaction: ['➕ Добавить транзакцию', 'addTransaction'],
  showTodayExpenses: ['🕥 Расходы сегодня', 'showTodayExpenses'],
  showDateExpenses: ['📅 Расходы на число', 'showDateExpenses'],
  today: ['Сегодня', 'today'],
  yesterday: ['Вчера', 'yesterday'],
  yes: ['Да ✅', 'yes'],
  no: ['Нет ❌', 'no'],
};

const TOKENS = {
  GREETINS: 'Действия',
  FETCH_ERROR: 'Ошибка получения данных',
  DATE_ERROR: 'Неправильная дата',
  WRONG_USER_ERROR: 'Не авторизовнный пользователь',
  SET_DATE_REQUEST: 'Когда это было?',
  REQUEST_SYMBOL: 'В чем это было?',
  SET_AMOUNT_REQUEST: 'Сколько?',
  AMOUNT_ERROR: 'Неправильная сумма',
  CHOOSE_CATEGORY: 'Выбери категорию',
  REQUEST_TRANSACTION_CONFIRMATION: 'Сохранить?',
  TRANSACTION_SAVE_SUCCESS: 'Транзакция сохранена',
};

interface MySceneSession extends Scenes.SceneSessionData {
}
interface MySession extends Scenes.SceneSession<MySceneSession> {
  date: Date,
  symbol: string,
  amount: number,
  category: string
}
interface MyContext extends Context {
  session: MySession,
  scene: Scenes.SceneContextScene<MyContext, MySceneSession>
}

const HANDLERS = {
  START: async (ctx: MyContext) => {
    await ctx.reply(TOKENS.GREETINS, Markup.inlineKeyboard([
      [Markup.button.callback(
        CALLBACK_BUTTONS.addTransaction[0],
        CALLBACK_BUTTONS.addTransaction[1],
      )],
      [Markup.button.callback(
        CALLBACK_BUTTONS.showTodayExpenses[0],
        CALLBACK_BUTTONS.showTodayExpenses[1],
      )],
      [Markup.button.callback(
        CALLBACK_BUTTONS.showDateExpenses[0],
        CALLBACK_BUTTONS.showDateExpenses[1],
      )],
    ]));
  },
};

const showDateScene = new Scenes.BaseScene<MyContext>('showDateScene');
showDateScene.enter((ctx) => ctx.reply('Введите дату'));
showDateScene.command('stop', async (ctx) => ctx.scene.leave());
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
    const res = await fetch(`${process.env.API_HOST}/date_expenses?year=${year}&month=${month}&day=${day}`);
    const { date: dateString, expenses } = await res.json() as ExpensesResponse;
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

const setDateScene = new Scenes.BaseScene<MyContext>('setDateScene');
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
setDateScene.on('text', async (ctx) => {
  const date = new Date(ctx.message.text);
  if (date.toString() === 'Invalid Date') {
    await ctx.reply(TOKENS.DATE_ERROR);
    return;
  }
  await ctx.reply(date.toLocaleDateString('RU'));
  ctx.session.date = date;
  await ctx.answerCbQuery();
  ctx.scene.enter('setSymbolScene');
});

const setSymbolScene = new Scenes.BaseScene<MyContext>('setSymbolScene');
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

const setAmountScene = new Scenes.BaseScene<MyContext>('setAmountScene');
setAmountScene.enter((ctx) => ctx.reply(TOKENS.SET_AMOUNT_REQUEST));
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

const setCategoryScene = new Scenes.BaseScene<MyContext>('setCategoryScene');
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

const confirmTransactionScene = new Scenes.BaseScene<MyContext>('confirmTransactionScene');
confirmTransactionScene.enter(async (ctx) => {
  const transaction = {
    date: ctx.session.date,
    symbol: ctx.session.symbol,
    amount: ctx.session.amount,
    category: ctx.session.category,
  };
  const transactionString = printTransaction(transaction);
  await ctx.reply(transactionString);
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

const stage = new Scenes.Stage<MyContext>([
  showDateScene,
  setDateScene,
  setSymbolScene,
  setAmountScene,
  setCategoryScene,
  confirmTransactionScene,
]);

const init = async () => {
  const bot = new Telegraf<MyContext>(
    process.env.BOT_TOKEN as string,
  );
  bot.use(session());
  bot.use(stage.middleware());
  bot.on('text', async (ctx, next) => {
    if (ctx.from.username !== process.env.AUTHORIZED_USER) {
      ctx.reply(TOKENS.WRONG_USER_ERROR);
    } else {
      await next();
    }
  });
  bot.command('start', HANDLERS.START);
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
      const res = await fetch(`${process.env.API_HOST}/day_expenses`);
      const { date: dateString, expenses } = await res.json() as ExpensesResponse;
      const resultDate = new Date(dateString);
      const result = printExpenses(resultDate, expenses);
      ctx.replyWithMarkdownV2(result);
      ctx.scene.leave();
    } catch (e) {
      console.error(e);
      ctx.reply(TOKENS.FETCH_ERROR);
    }
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
