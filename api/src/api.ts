import { initApp } from './routes';

require('dotenv').config();

const init = async () => {
  await initApp();
};

init().catch((err) => console.error(err));
