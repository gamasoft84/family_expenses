'use strict';

const { spawn } = require('child_process');
const path = require('path');

delete process.env.ELECTRON_RUN_AS_NODE;

const electronExe = require('electron');
const appDir = path.resolve(__dirname, '..');

const child = spawn(electronExe, [appDir], { stdio: 'inherit', windowsHide: false });

child.on('error', (err) => {
  console.error(err);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 1);
  }
});
