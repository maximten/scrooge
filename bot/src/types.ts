import { Context, Scenes } from 'telegraf';

export type Expenses = {
  expensesBySymbol: Record<string, { category: string, amount: string }[]>,
  sumsBySymbol: Record<string, string>,
  convertedExpensesBySymbol: Record<string, { category: string, amount: string }[]>,
  convertedSumBySymbol: Record<string, string>,
  totalSum: string,
};

export type DateExpensesResponse = {
  date: string,
  expenses: Expenses
};

export type TotalResponse = {
  sums: Record<string, string>,
  totalUSD: string
};

export type RangeExpensesResponse = {
  transactionsBySymbol: Record<string, Record<string, string>>,
  convertedTransactionsBySymbol: Record<string, Record<string, string>>,
  totalSum: string
};

export interface MySceneSession extends Scenes.SceneSessionData {
}

export interface MySession extends Scenes.SceneSession<MySceneSession> {
  date: Date,
  symbol: string,
  amount: number,
  category: string,
  transactionList: {
    date: Date,
    symbol: string,
    amount: number,
    category: string,
  }[]
}

export interface MyContext extends Context {
  session: MySession,
  scene: Scenes.SceneContextScene<MyContext, MySceneSession>
}
