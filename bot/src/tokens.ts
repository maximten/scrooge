export const COMMANDS = {
  START: 'start',
  STOP: 'stop',
};

export const CALLBACK_BUTTONS = {
  addTransaction: ['➕ Добавить транзакцию', 'addTransaction'],
  showTodayExpenses: ['🕥 Расходы сегодня', 'showTodayExpenses'],
  showDateExpenses: ['📅 Расходы на число', 'showDateExpenses'],
  show30DayExpensesByCategory: ['💸 Расходы за 30 дней по категориям', 'show30DayExpensesByCategory'],
  show30DayExpensesByDay: ['💸 Расходы за 30 дней по дням', 'show30DayExpensesByDay'],
  showWeekExpensesByCategory: ['7️⃣ Расходы за неделю по категориям', 'showWeekExpensesByCategory'],
  showWeekExpensesByDay: ['7️⃣ Расходы за неделю по дням', 'showWeekExpensesByDay'],
  showMonthExpensesByCategory: ['🌚 Расходы за месяц по категориям', 'showMonthExpensesByCategory'],
  showMonthExpensesByDay: ['🌚 Расходы за месяц по дням', 'showMonthExpensesByDay'],
  addTransactionFile: ['🗃 Добавить файл с транзакциями', 'addTransactionFile'],
  setTimezone: ['🕰 Выбрать часовую зону', 'setTimezone'],
  showTotal: ['💰 Показать сумму', 'showSum'],
  today: ['Сегодня', 'today'],
  yesterday: ['Вчера', 'yesterday'],
  yes: ['Да ✅', 'yes'],
  no: ['Нет ❌', 'no'],
  exit: ['Выйти 🏃', 'exit'],
};

export const TOKENS = {
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
  REQUEST_TRANSACTION_FILE: 'Скинь файл заполненный по примеру',
  TRANSACTION_LIST_SAVE_SUCCESS: 'Транзакции сохранены',
  CURRENT_TIMEZONE: 'Текущая часовая зона:',
  SET_TIMEZONE_REQUEST: 'Введи часовую зону в формате +-nn',
  TIMEZONE_ERROR: 'Неверная часовая зона',
  SET_TIMEZONE_SUCCESS: 'Часовая зона установлена',
};
