import mri from 'mri';
import chalk from 'chalk';
import fetch from 'node-fetch';
import ora from 'ora';
import logo from '../util/output/logo';
import { handleError } from '../util/error';
import {
  readConfigFile,
  writeToConfigFile,
  readAuthConfigFile,
  writeToAuthConfigFile
} from '../util/config/files';
import error from '../util/output/error';
import exit from '../util/exit';

const help = () => {
  console.log(`
  ${chalk.bold(`${logo} now logout`)}

  ${chalk.dim('Options:')}

    -h, --help                     Output usage information
    -A ${chalk.bold.underline('FILE')}, --local-config=${chalk.bold.underline(
    'FILE'
  )}   Path to the local ${'`now.json`'} file
    -Q ${chalk.bold.underline('DIR')}, --global-config=${chalk.bold.underline(
    'DIR'
  )}    Path to the global ${'`.now`'} directory

  ${chalk.dim('Examples:')}

  ${chalk.gray('–')} Logout from the CLI:

    ${chalk.cyan('$ now logout')}
`);
};

let argv;
let apiUrl;

const main = async ctx => {
  argv = mri(ctx.argv.slice(2), {
    boolean: ['help'],
    alias: {
      help: 'h'
    }
  });

  apiUrl = ctx.apiUrl;
  argv._ = argv._.slice(1);

  if (argv.help || argv._[0] === 'help') {
    help();
    await exit(0);
  }

  logout();
};

export default async ctx => {
  try {
    await main(ctx);
  } catch (err) {
    handleError(err);
    process.exit(1);
  }
};

const revokeToken = async (token) => {
  const options = {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  };

  const result = await fetch(`${apiUrl}/user/tokens/current`, options);

  if (!result.ok) {
    console.error(error('Not able to log out'));
  }
};

const logout = async () => {
  const spinner = ora({
    text: 'Logging out...'
  }).start();

  const configContent = readConfigFile();
  const authContent = readAuthConfigFile();

  // Copy the content
  const token = `${authContent.token}`;

  delete configContent.currentTeam;

  // The new user might have completely different teams, so
  // we should wipe the order.
  if (configContent.desktop) {
    delete configContent.desktop.teamOrder;
  }

  delete authContent.token;

  try {
    await writeToConfigFile(configContent);
    await writeToAuthConfigFile(authContent);
  } catch (err) {
    spinner.fail(`Couldn't remove config while logging out`);
    process.exit(1);
  }

  try {
    await revokeToken(token);
  } catch (err) {
    spinner.fail('Could not revoke token on logout');
    process.exit(1);
  }

  spinner.succeed('Logged out!');
};
