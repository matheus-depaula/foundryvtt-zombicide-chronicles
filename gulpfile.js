import 'dotenv/config';
import log from 'fancy-log';
import pkg from './package.json' with { type: 'json' };
import { resolve, relative, join } from 'node:path';
import { watch as __watch } from 'gulp';
import { copy } from 'fs-extra';
import { access, symlink, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'child_process';

const SYSTEM_NAME = pkg.name.replace(/^foundryvtt-/, '');
const SYSTEM_VERSION = pkg.version;
const DIST_PATH = resolve('.', 'dist');

/**
 * @param {string} command
 * @param {string[] | undefined} args
 * @returns {Promise<void>}
 */
const spawnAsync = (command, args) => {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Exited with code ${code}`));
      }
    });
  });
};

export const updateSystemVersion = async () => {
  const publicSystemPath = resolve('public', 'system.json');

  const content = await readFile(publicSystemPath, 'utf8');

  let json = {};

  try {
    json = JSON.parse(content);
  } catch (err) {
    throw new Error(`Failed to parse ${publicSystemPath}: ${err?.message ?? err}`);
  }

  if (json.version !== SYSTEM_VERSION) {
    const repositoryUrl = process.env.REMOTE_REPOSITORY_URL;

    json.version = SYSTEM_VERSION;
    json.download = `${repositoryUrl}/releases/download/v${SYSTEM_VERSION}/${SYSTEM_NAME}-v${SYSTEM_VERSION}.zip`;

    await writeFile(publicSystemPath, JSON.stringify(json, null, 2) + '\n', 'utf8');

    const successMessage = `Updated system.json'version to ${SYSTEM_VERSION}`;

    try {
      await spawnAsync('pnpm', ['exec', 'prettier', '--write', publicSystemPath]);
      log.info(successMessage);
    } catch (err) {
      log.info(successMessage);
      log.warn(`Failed to format system.json: ${err?.message ?? err}`);
    }
  }
};

export async function linkData() {
  const userDataPath = process.env.FOUNDRY_USER_DATA_PATH;

  try {
    await access(userDataPath);
  } catch {
    throw new Error('Invalid FOUNDRY_USER_DATA_PATH environment variable');
  }

  try {
    await access(DIST_PATH);
  } catch {
    log.info('Build not found, building now...');
    await build();
  }

  const systemDir = join(userDataPath, 'systems', SYSTEM_NAME);

  try {
    await symlink(DIST_PATH, systemDir, process.platform === 'win32' ? 'junction' : 'dir');
    log.info(`Created symlink at ${systemDir}`);
  } catch {
    log.info(`Symlink already exists at ${systemDir}`);
  }

  await spawnAsync('pnpm', ['fvtt', 'configure', 'set', 'dataPath', userDataPath]);
}

export async function build() {
  return await spawnAsync('vite', ['build']);
}

function watch() {
  const publicDirPath = resolve(process.cwd(), 'public');
  const watcher = __watch(['public/**/*'], { ignoreInitial: false });

  watcher.on('change', async function (file) {
    const partialFile = relative(publicDirPath, file);
    await copy(join('public', partialFile), join(DIST_PATH, partialFile));
  });
}

export async function serve() {
  await build();

  watch();

  return spawnAsync('vite', ['serve']);
}
