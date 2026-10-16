import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const android = path.join(root, 'android');
const env = {...process.env};
if (env.JAVA_HOME?.toLowerCase().endsWith(path.sep + 'bin')) env.JAVA_HOME = path.dirname(env.JAVA_HOME);
if (!env.ANDROID_HOME && env.LOCALAPPDATA) env.ANDROID_HOME = path.join(env.LOCALAPPDATA, 'Android', 'Sdk');
const java = env.JAVA_HOME ? path.join(env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java') : 'java';
const wrapper = path.join(android, 'gradle', 'wrapper', 'gradle-wrapper.jar');
const architectures = process.argv[2] ? [`-PreactNativeArchitectures=${process.argv[2]}`] : [];
const child = spawn(java, ['-Xmx64m', '-Xms64m', '-Dorg.gradle.appname=gradlew', '-jar', wrapper, 'assembleRelease', '--no-daemon', '--console=plain', ...architectures], {cwd: android, env, stdio: 'inherit', windowsHide: true});
child.on('error', error => { console.error(error); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
