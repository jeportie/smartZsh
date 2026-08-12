import chalk from "chalk";

export const render = async () => {
  process.stdout.write(chalk.green("✓") + " successfully installed smartzsh \n");
};
