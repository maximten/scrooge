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
