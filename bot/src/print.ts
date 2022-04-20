import { Expenses, TotalResponse, RangeExpensesResponse } from './types';

export const printTransaction = ({
  date, symbol, amount, category,
}: { date: Date, symbol: string, amount: number, category: string }) => (`
\`\`\`
Дата: ${date.toLocaleDateString('RU')},
Сумма: ${amount} ${symbol},
Категория: ${category}
\`\`\`
`);

export const printTransactionList = (transactionList: {
  date: Date, symbol: string, amount: number, category: string
}[]) => {
  const transactionListString = transactionList.map(({
    date, symbol, amount, category,
  }) => {
    const dateString = date.toLocaleDateString('RU');
    const amountString = amount.toString().padEnd(10);
    const symbolString = symbol.padEnd(5);
    const categoryString = category.padEnd(10);
    return `${dateString}: ${amountString} ${symbolString} ${categoryString}`;
  }).join('\n');
  return `Транзакции:\n${transactionListString}`;
};

export const printExpensesLists = (expenses: Record<string, {
  category: string;
  amount: string;
}[]>) => `${Object.entries(expenses)
  .map(([symbol, list]) => {
    const symbolString = `${symbol}:\n`;
    const listString = list.map(({ category, amount }) => {
      const categoryString = category.padEnd(15);
      const amountString = amount.padEnd(10);
      return `${categoryString} ${amountString}`;
    }).join('\n');
    return symbolString + listString;
  }).join('\n')}\n`;

export const printSumsMap = (map: Record<string, string>) => `${Object.entries(map)
  .map(([symbol, amount]) => {
    const symbolString = symbol.padEnd(5);
    const amountString = amount.padEnd(10);
    return `${symbolString} ${amountString}`;
  }).join('\n')}\n`;

export const printExpenses = (date: Date, expenses: Expenses) => {
  const dateString = date.toLocaleDateString('RU');
  const start = '```\n';
  const expensesHeader = `Расходы на ${dateString}:\n`;
  const expensesString = printExpensesLists(expenses.expensesBySymbol);
  const sumsHeader = 'Суммы:\n';
  const sumsString = printSumsMap(expenses.sumsBySymbol);
  const convertedExpensesHeander = `Расходы на ${dateString} в $:\n`;
  const convertedExpensesString = printExpensesLists(expenses.convertedExpensesBySymbol);
  const convertedSumsHeader = 'Суммы в $:\n';
  const convertedSumsString = printSumsMap(expenses.convertedSumBySymbol);
  const totalSumHeader = 'Полная сумма в $:\n';
  const end = '```';
  const nl = '\n';
  return start
        + expensesHeader
        + expensesString
        + nl
        + sumsHeader
        + sumsString
        + nl
        + convertedExpensesHeander
        + convertedExpensesString
        + nl
        + convertedSumsHeader
        + convertedSumsString
        + nl
        + totalSumHeader
        + expenses.totalSum
        + end;
};

export const printTotal = (total: TotalResponse) => {
  const sumsEntries = Object.entries(total.sums);
  sumsEntries.sort((a, b) => Number.parseFloat(b[1]) - Number.parseFloat(a[1]));
  const sumsString = sumsEntries.map(([symbol, amount]) => {
    const symbolString = symbol.padEnd(5);
    const amountString = amount.padStart(10);
    return `${symbolString} ${amountString}`;
  }).join('\n');
  const totalUSDString = total.totalUSD.padStart(10);
  const start = '\`\`\`\n';
  const header = 'Активы:\n';
  const usdString = `USD   ${totalUSDString}\n`;
  const end = '\`\`\`\n';
  return `${start + header + sumsString}\nСумма:\n${usdString}${end}`;
};

export const printExpensesMaps = (expenses: Record<string, Record<string, string>>, sortBy: 'key' | 'value') => {
  const expensesString = Object.entries(expenses).map(([symbol, categories]) => {
    const categoriesEntries = Object.entries(categories);
    if (sortBy === 'value') {
      categoriesEntries.sort((a, b) => Number.parseFloat(b[1]) - Number.parseFloat(a[1]));
    } else {
      categoriesEntries.sort((a, b) => Number.parseFloat(a[0]) - Number.parseFloat(b[0]));
    }
    const categoriesString = categoriesEntries.map(([category, amount]) => {
      const categoryString = category.padEnd(15);
      const amountString = amount.padEnd(10);
      return `${categoryString} ${amountString}`;
    }).join('\n');
    const symbolString = `${symbol}:\n${categoriesString}`;
    return symbolString;
  }).join('\n');
  return expensesString;
};

export const printExpensesBySymbols = (expenses: RangeExpensesResponse, sortBy: 'key' | 'value', responseHeader: string) => {
  const {
    transactionsBySymbol,
    convertedTransactionsBySymbol,
    totalSum,
  } = expenses;
  const expensesString = printExpensesMaps(transactionsBySymbol, sortBy);
  const convertedExpensesString = printExpensesMaps(convertedTransactionsBySymbol, sortBy);
  return `
\`\`\`
${responseHeader}:
${expensesString}
${responseHeader} в $:
${convertedExpensesString}
${responseHeader} в $:
${totalSum}
\`\`\`
`;
};

export const printExpensesBySymbolsByCategories = (expenses: RangeExpensesResponse, responseHeader: string) => printExpensesBySymbols(expenses, 'value', responseHeader);
export const printExpensesBySymbolsByDays = (expenses: RangeExpensesResponse, responseHeader: string) => printExpensesBySymbols(expenses, 'key', responseHeader);
