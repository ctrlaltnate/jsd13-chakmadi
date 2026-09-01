import { spawn } from 'child_process';
import os from 'os';

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const localIp = getLocalIp();

console.log('=====================================================');
console.log('🎮 STARTING CROWD TUG-OF-WAR: PHYSICS EDITION');
console.log('=====================================================');
console.log(`🌐 Local Web:    http://localhost:5173`);
console.log(`📱 LAN Mobile:   http://${localIp}:5173`);
console.log(`⚡ Socket Server: http://localhost:3001`);
console.log('=====================================================');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

// Spawn Server
const serverProc = spawn('node', ['server/index.js'], {
  stdio: 'inherit',
  shell: true
});

// Spawn Client
const clientProc = spawn(npmCmd, ['--prefix', 'client', 'run', 'dev'], {
  stdio: 'inherit',
  shell: true
});

function cleanup() {
  console.log('\nStopping servers...');
  serverProc.kill();
  clientProc.kill();
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
