import chalk from "chalk";

export const renderConfirmation = (live: boolean): string => {
  const statusMessage = live ? chalk.green("live") : chalk.red("not found");
  return `smartzsh session [${statusMessage}]\n`;
};

export const renderMissingResources = (): string => {
  return chalk.red(`smartzsh resources out of date, run "smartzsh reinit" to refresh\n`);
};
