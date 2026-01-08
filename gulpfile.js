import path from 'node:path';
import fs from 'fs-extra';
import gulp from 'gulp';
import cp from 'child_process';
import archiver from 'archiver';
import log from 'fancy-log';
import pkg from './package.json' with { type: 'json' };

const SYSTEM_NAME = pkg.name.replace(/^foundryvtt-/, '');
const SYSTEM_VERSION = pkg.version;
const SYSTEM_FILENAME = 'system.json';

const DIST_DIR_PATH = path.resolve('.', 'dist');
const PUBLIC_DIR_PATH = path.resolve('.', 'public');
const PACKAGE_DIR_PATH = path.resolve('.', 'package');

// util spawn
const spawnAsync = (command, args) =>
  new Promise((resolve, reject) => {
    const child = cp.spawn(command, args, { stdio: 'inherit', shell: true });
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`Exited with code ${code}`))));
  });

export async function buildTask() {
  await spawnAsync('vite', ['build']);
}

function distWatcherTask(_) {
  const watcher = gulp.watch([`${PUBLIC_DIR_PATH}/**/*`], { ignoreInitial: false });

  watcher.on('change', async (file) => {
    const relativeFile = path.relative(PUBLIC_DIR_PATH, file);
    const dest = path.join(DIST_DIR_PATH, relativeFile);

    await fs.ensureDir(path.dirname(dest));
    await fs.copy(file, dest);
    log.info('Updated dist file:', relativeFile);
  });
}

function serveTask(_) {
  spawnAsync('vite', ['serve']);
}

export const updateSystemVersionTask = async () => {
  const publicSystemPath = path.resolve(PUBLIC_DIR_PATH, SYSTEM_FILENAME);

  const content = await fs.readFile(publicSystemPath, 'utf8');

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

    await fs.writeFile(publicSystemPath, `${JSON.stringify(json, null, 2)}\n`, 'utf8');

    const successMessage = `Updated ${SYSTEM_FILENAME} version to ${SYSTEM_VERSION}`;

    try {
      await spawnAsync('pnpm', ['exec', 'prettier', '--write', publicSystemPath]);
      log.info(successMessage);
    } catch (err) {
      log.info(successMessage);
      log.warn(`Failed to format ${SYSTEM_FILENAME}: ${err?.message ?? err}`);
    }
  }
};

export async function linkDataTask() {
  const userDataPath = process.env.FOUNDRY_USER_DATA_PATH;

  if (!fs.existsSync(userDataPath)) {
    throw new Error('Invalid FOUNDRY_USER_DATA_PATH environment variable');
  }

  if (!fs.existsSync(DIST_DIR_PATH)) {
    log.info('Build not found, building now...');
    await buildTask();
  }

  const systemDir = path.join(userDataPath, 'systems', SYSTEM_NAME);

  try {
    await fs.symlink(DIST_DIR_PATH, systemDir, process.platform === 'win32' ? 'junction' : 'dir');
    log.info(`Created symlink at ${systemDir}`);
  } catch {
    log.info(`Symlink already exists at ${systemDir}`);
  }

  await spawnAsync('pnpm', ['fvtt', 'configure', 'set', 'dataPath', userDataPath]);
}

export async function packageTask() {
  await fs.ensureDir(PACKAGE_DIR_PATH);

  const systemFile = path.join(PUBLIC_DIR_PATH, SYSTEM_FILENAME);

  if (await fs.pathExists(path.join(PACKAGE_DIR_PATH, SYSTEM_FILENAME))) {
    await fs.remove(path.join(PACKAGE_DIR_PATH, SYSTEM_FILENAME));
  }

  await fs.copy(systemFile, path.join(PACKAGE_DIR_PATH, SYSTEM_FILENAME));

  const zipName = `${SYSTEM_NAME}-v${SYSTEM_VERSION}.zip`;
  const zipPath = path.join(PACKAGE_DIR_PATH, zipName);

  const zipFile = fs.createWriteStream(zipPath);
  const zip = archiver('zip', { zlib: { level: 9 } });

  zip.pipe(zipFile);
  zip.directory(DIST_DIR_PATH, SYSTEM_NAME);
  zip.finalize();

  zipFile.on('close', () => {
    log.info(`Package created: ${zipName}, ${zip.pointer()} bytes`);
  });

  zip.on('error', (err) => {
    throw err;
  });
}

export const start = gulp.series(buildTask, distWatcherTask);
export const dev = gulp.series(buildTask, gulp.parallel(serveTask, distWatcherTask));
