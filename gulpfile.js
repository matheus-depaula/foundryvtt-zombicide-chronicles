import 'dotenv/config';
import log from 'fancy-log';
import pkg from './package.json' with { type: 'json' };
import { resolve, relative, join } from 'node:path';
import { watch as __watch } from 'gulp';
import { copy, ensureDir } from 'fs-extra';
import { access, symlink, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'child_process';

const SYSTEM_NAME = pkg.name;
const SYSTEM_VERSION = pkg.version;
const DIST_PATH = resolve('.', 'dist');
const FOUNDRY_DATA_PATH = `${process.env.FOUNDRY_PATH}/data/Data`;

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
    json.version = SYSTEM_VERSION;

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
  try {
    await access(FOUNDRY_DATA_PATH);
  } catch {
    throw new Error('Invalid FOUNDRY_PATH environment variable');
  }

  try {
    await access(DIST_PATH);
  } catch {
    log.info('Build not found, building now...');

    await build();
  }

  const systemDir = join(FOUNDRY_DATA_PATH, 'systems', SYSTEM_NAME);

  await ensureDir(systemDir);

  try {
    await symlink(DIST_PATH, systemDir, 'junction');
    log.info(`Created symlink at ${systemDir}`);
  } catch {
    log.info(`Symlink already exists at ${systemDir}`);
    return;
  }
}

export async function build() {
  return spawnAsync('vite', ['build']);
}

function watch() {
  const publicDirPath = resolve(process.cwd(), 'public');
  const watcher = __watch(['public/**/*.hbs'], { ignoreInitial: false });

  watcher.on('change', async function (file) {
    log.info(`File ${file} was changed`);
    const partialFile = relative(publicDirPath, file);

    await copy(join('public', partialFile), join('dist', partialFile));
  });
}

export async function serve() {
  await build();

  watch();

  return spawnAsync('vite', ['serve']);
}
