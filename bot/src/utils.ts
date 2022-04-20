export const extractDataFromCsv = (dataString: string) => {
  const rows = dataString.split('\n');
  const grid = rows.map((row) => row.split(','));
  const headers = grid[0];
  const data = grid.slice(1).reduce((carry, row) => {
    const item = row.reduce((subCarry, col, index) => {
      subCarry[headers[index]] = col;
      return subCarry;
    }, {} as Record<string, string>);
    const isValid = headers.reduce((carry, key) => (carry && Boolean(item[key])), true);
    if (isValid) {
      carry.push(item);
    }
    return carry;
  }, [] as Record<string, string>[]);
  return data;
};

export const parseDate = (dateString: string) => {
  const match = dateString.match(/(\d\d)\.(\d\d)\.(\d\d\d\d)/);
  if (!match) {
    throw new Error(`Invalid date: ${dateString}`);
  }
  const [, day, month, year] = match;
  const yearNumber = Number.parseInt(year, 10);
  const monthNumber = Number.parseInt(month, 10);
  const dayNumber = Number.parseInt(day, 10);
  if (Number.isNaN(yearNumber) || Number.isNaN(monthNumber) || Number.isNaN(dayNumber)) {
    throw new Error(`Invalid date: ${dateString}`);
  }
  const date = new Date(yearNumber, monthNumber, dayNumber);
  return date;
};

export const printDate = (date: Date) => date.toLocaleDateString('RU');
