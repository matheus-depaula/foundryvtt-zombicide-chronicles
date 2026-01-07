import 'dotenv/config';
import log from 'fancy-log';
import pkg from './package.json' with { type: 'json' };
import { resolve, relative, join } from 'node:path';
import { watch as __watch } from 'gulp';
import { copy, ensureDir } from 'fs-extra';
import { access, symlink } from 'node:fs/promises';
import { spawn } from 'child_process';

const SYSTEM_NAME = pkg.name;
const DIST_PATH = resolve('.', 'dist');
const FOUNDRY_DATA_PATH = `${process.env.FOUNDRY_PATH}/data/Data`;

/**
 * @param {string} command
 * @param {string[] | undefined} args
 * @returns {Promise<void>}
 */
const spawnAsync = (command, args) =>
  new Promise((resolve, reject) => {
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
  watch();

  return spawnAsync('vite', ['serve']);
}

export async function build() {
  return spawnAsync('vite', ['build']);
}
