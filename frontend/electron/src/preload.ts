import * as path from 'path';

try {
  require(path.join(__dirname, 'rt', 'electron-rt.js'));
} catch (e) {
  console.error('Preload script error:', e);
}

//////////////////////////////
// User Defined Preload scripts below
console.log('User Preload!');
