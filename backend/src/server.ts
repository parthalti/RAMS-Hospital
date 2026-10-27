import dotenv from 'dotenv';

dotenv.config();

import { createApp } from './app';
import { startAutomationScheduler } from './services/automationScheduler';

const PORT = process.env.PORT
  ? Number(process.env.PORT)
  : 4000;

const app = createApp();

app.listen(PORT, () => {
  console.log(
    `RAMS-Hospital backend listening on http://localhost:${PORT}`
  );

  console.log('[Automation] Initializing background scheduler...');

  startAutomationScheduler();
});