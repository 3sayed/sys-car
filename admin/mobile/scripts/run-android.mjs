import {spawn, spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = {...process.env};
if (env.JAVA_HOME?.toLowerCase().endsWith(path.sep + 'bin')) env.JAVA_HOME = path.dirname(env.JAVA_HOME);
if (!env.ANDROID_HOME && env.LOCALAPPDATA) env.ANDROID_HOME = path.join(env.LOCALAPPDATA, 'Android', 'Sdk');
const adb = path.join(env.ANDROID_HOME || '', 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
function reversePorts() {
  if (!fs.existsSync(adb)) return;
  for (const port of [8081, Number(process.argv[2])]) {
    const result = spawnSync(adb, ['reverse', `tcp:${port}`, `tcp:${port}`], {stdio: 'inherit', windowsHide: true});
    if (result.status !== 0) console.warn(`Could not connect Android port ${port}. Connect an emulator or USB phone.`);
  }
}
const attached = fs.existsSync(adb) && /\tdevice\b/.test(spawnSync(adb, ['devices'], {encoding: 'utf8', windowsHide: true}).stdout || '');
if (attached) reversePorts();
const child = spawn(process.execPath, [path.join(root, 'node_modules', 'react-native', 'cli.js'), 'run-android'], {cwd: root, env, stdio: 'inherit', windowsHide: true});
child.on('exit', code => { if (code === 0) reversePorts(); process.exitCode = code ?? 1; });
