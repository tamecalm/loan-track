import { showMainMenu } from './menus/main.menu';

async function startApp() {
  console.log('LoanTrack v1.0.0');
  await showMainMenu();
}

startApp().catch((err) => {
  console.error('An error occurred:', err);
  process.exit(1);
});
