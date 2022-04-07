import {
  Markup,
  Telegraf,
  session,
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

interface SessionData {
  isFormTransactionSession: boolean,
  isDateSetting?: boolean,
  isCustomDateSetting?: boolean,
  date?: Date,
  isSymbolSetting?: boolean,
  symbol?: string,
  isAmountSetting?: boolean,
  amount?: string,
  isCategorySetting?: boolean,
  category?: string,
  isShouldSaveSetting?: boolean
}

interface MyContext extends Context {
  session?: SessionData
}

const sessionHandler = (ctx: MyContext, handler: (session: SessionData) => void) => {
  ctx.session ??= { isFormTransactionSession: false };
  handler(ctx.session);
  console.log(JSON.stringify(ctx.session));
};

const sessionGetter = (ctx: MyContext) => {
  ctx.session ??= { isFormTransactionSession: false };
  return ctx.session;
};

const printTransaction = ({
  date, symbol, amount, category,
}: { date?: string, symbol?: string, amount?: string, category?: string }) => (`
Дата: ${date},
Сумма: ${amount} ${symbol},
Категория: ${category}
`);

const COMMANDS = {
  start: '/start',
  addTransaction: 'Добавить транзакцию',
  today: 'Сегодня',
  yesterday: 'Вчера',
  customDate: 'Указать дату',
};

const REPLIES = {
  start: 'Действия',
  setDate: 'Когда это было?',
  setCustomDate: 'Напиши дату в формате YYYY-MM-DD',
  setSymbol: 'В чем?',
  setAmount: 'Сколько?',
  setCategory: 'В какой категории?',
};

const HANDLERS: Record<string, (ctx: MyContext) => void | Promise<void>> = {
  start: async (ctx) => {
    sessionHandler(ctx, (session) => {
      session.isFormTransactionSession = false;
    });
    ctx.reply(REPLIES.start, Markup.keyboard([COMMANDS.addTransaction]).oneTime());
  },
  afterDateSet: async (ctx) => {
    const res = await fetch(`${process.env.API_HOST}/symbols`);
    const symbols = await res.json() as string[];
    sessionHandler(ctx, (session) => {
      session.isSymbolSetting = true;
    });
    ctx.reply(REPLIES.setSymbol, Markup.keyboard(symbols).oneTime());
  },
  aftgerSymbolSet: async (ctx) => {
    sessionHandler(ctx, (session) => {
      session.isAmountSetting = true;
    });
    ctx.reply(REPLIES.setAmount);
  },
  afterAmountSet: async (ctx) => {
    const res = await fetch(`${process.env.API_HOST}/categories`);
    const categories = await res.json() as string[];
    sessionHandler(ctx, (session) => {
      session.isCategorySetting = true;
    });
    ctx.reply(REPLIES.setCategory, Markup.keyboard(categories).oneTime());
  },
  afterCategorySet: async (ctx) => {
    const session = sessionGetter(ctx);
    if (!session.date || !session.symbol || !session.amount || !session.category) {
      HANDLERS.start(ctx);
    }
    const transaction = {
      date: session.date?.toString(),
      symbol: session.symbol,
      amount: session.amount,
      category: session.category,
    };
    const transactionString = printTransaction(transaction);
    sessionHandler(ctx, (session) => {
      session.isShouldSaveSetting = true;
    });
    ctx.reply(`${transactionString}Сохранить?`, Markup.keyboard(['Да', 'Нет']).oneTime());
  },
  saveTransaction: async (ctx) => {
    const session = sessionGetter(ctx);
    if (!session.date || !session.symbol || !session.amount || !session.category) {
      HANDLERS.start(ctx);
    }
    const transaction = {
      date: session.date?.toString(),
      symbol: session.symbol,
      amount: session.amount,
      category: session.category,
    };
    console.log(transaction);
  },
};

const init = async () => {
  const bot = new Telegraf<MyContext>(process.env.BOT_TOKEN as string);
  bot.use(session());
  bot.on('text', async (ctx, next) => {
    const session = sessionGetter(ctx);
    if (session.isCustomDateSetting && !Object.values(COMMANDS).includes(ctx.message.text)) {
      sessionHandler(ctx, (session) => {
        session.date = new Date(ctx.message.text);
        session.isCustomDateSetting = false;
      });
      await HANDLERS.afterDateSet(ctx);
    } else if (session.isSymbolSetting && !Object.values(COMMANDS).includes(ctx.message.text)) {
      sessionHandler(ctx, (session) => {
        session.symbol = ctx.message.text;
        session.isSymbolSetting = false;
      });
      await HANDLERS.aftgerSymbolSet(ctx);
    } else if (session.isAmountSetting && !Object.values(COMMANDS).includes(ctx.message.text)) {
      sessionHandler(ctx, (session) => {
        session.amount = ctx.message.text;
        session.isAmountSetting = false;
      });
      await HANDLERS.afterAmountSet(ctx);
    } else if (session.isCategorySetting && !Object.values(COMMANDS).includes(ctx.message.text)) {
      sessionHandler(ctx, (session) => {
        session.category = ctx.message.text;
        session.isCategorySetting = false;
      });
      await HANDLERS.afterCategorySet(ctx);
    } else if (session.isShouldSaveSetting && !Object.values(COMMANDS).includes(ctx.message.text)) {
      sessionHandler(ctx, (session) => {
        session.isShouldSaveSetting = false;
      });
      if (ctx.message.text === 'Да') {
        await HANDLERS.saveTransaction(ctx);
      } else {
        await HANDLERS.start(ctx);
      }
    }
    await next();
  });
  bot.command(COMMANDS.start, HANDLERS.start);
  bot.hears(COMMANDS.addTransaction, (ctx) => {
    sessionHandler(ctx, (session) => {
      session.isFormTransactionSession = true;
      session.isDateSetting = true;
    });
    ctx.reply(REPLIES.setDate, Markup.keyboard([
      COMMANDS.today,
      COMMANDS.yesterday,
      COMMANDS.customDate,
    ]));
  });
  bot.hears(COMMANDS.today, async (ctx) => {
    const session = sessionGetter(ctx);
    if (!session.isDateSetting) {
      HANDLERS.start(ctx);
    } else {
      sessionHandler(ctx, (session) => {
        session.date = new Date();
      });
      await HANDLERS.afterDateSet(ctx);
    }
  });
  bot.hears(COMMANDS.yesterday, async (ctx) => {
    const session = sessionGetter(ctx);
    if (!session.isDateSetting) {
      HANDLERS.start(ctx);
    } else {
      sessionHandler(ctx, (session) => {
        const date = new Date();
        date.setDate(date.getDate() - 1);
        session.date = date;
      });
      await HANDLERS.afterDateSet(ctx);
    }
  });
  bot.hears(COMMANDS.customDate, (ctx) => {
    const session = sessionGetter(ctx);
    if (!session.isDateSetting) {
      HANDLERS.start(ctx);
    } else {
      sessionHandler(ctx, (session) => {
        session.isCustomDateSetting = true;
      });
      ctx.reply(REPLIES.setCustomDate);
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
