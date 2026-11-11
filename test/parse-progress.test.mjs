import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

// client.js is a plain browser module: it talks to window.__ModuleLoader__ and
// require('react'). This harness stubs just enough of that surface to reach the
// parser, without adding a bundler or a test framework.
const clientPath = fileURLToPath(new URL('../client.js', import.meta.url));
let definition;

const React = {
  createElement() {
    return null;
  },
  useEffect() {},
  useMemo(fn) {
    return fn();
  },
  useState(initial) {
    return [typeof initial === 'function' ? initial() : initial, () => {}];
  },
};

const sandbox = {
  window: {
    __ModuleLoader__: {
      load(value) {
        definition = value;
      },
    },
    __CLI_PROGRESS_HUD_TEST__: true,
  },
  require(id) {
    if (id === 'react') return React;
    throw new Error('unexpected require: ' + id);
  },
  console,
};

vm.createContext(sandbox);
vm.runInContext(readFileSync(clientPath, 'utf8'), sandbox, { filename: clientPath });
assert.ok(definition, 'client.js did not register a module definition');

const plugin = definition.factory(sandbox.require);
const { parseProgress, formatElapsed } = plugin;
assert.equal(typeof parseProgress, 'function', 'parseProgress is not exported for tests');
assert.equal(typeof formatElapsed, 'function', 'formatElapsed is not exported for tests');

const cases = [
  ['git receiving', 'Receiving objects:  42% (1234/2938), 1.20 MiB | 300.00 KiB/s\r', 42, 'Receiving objects'],
  ['git remote compress', 'remote: Compressing objects: 100% (12/12), done.\n', 100, 'Compressing objects'],
  ['git remote counting', 'remote: Counting objects:  33% (1/3)\r', 33, 'Counting objects'],
  ['git resolving', 'Resolving deltas:  57% (100/175)\r', 57, 'Resolving deltas'],
  ['git last of CR stream', 'Receiving objects: 10% (1/10)\rReceiving objects: 55% (6/10)\r', 55, 'Receiving objects'],
  ['git writing', 'Writing objects: 100% (1/1), 2.31 KiB | 1.00 MiB/s, done.\n', 100, 'Writing objects'],
  ['curl meter', ' 42  100M   42  42.0M    0     0   10M      0  0:00:10  0:00:10 --:--:--\n', 42, 'curl'],
  ['ansi colored', '\x1b[32mReceiving objects:  33% (3/9)\x1b[0m\n', 33, 'Receiving objects'],
  ['osc progress', '\x1b]9;4;0;0\x07Receiving objects:  61% (6/10)\n', 61, 'Receiving objects'],
];

for (const [name, input, wantPercent, wantPhase] of cases) {
  const got = parseProgress(input);
  assert.equal(got.percent, wantPercent, name + ' percent: ' + JSON.stringify(got));
  assert.equal(got.phase, wantPhase, name + ' phase: ' + JSON.stringify(got));
  console.log('ok  ' + name);
}

const plain = parseProgress("Cloning into 'demo'...\n");
assert.equal(plain.percent, null, 'a git clone line without --progress must not invent a percent');
assert.equal(plain.phase, '', 'a line without a phase must not invent one');
console.log('ok  no-percent');

const clamped = parseProgress('progress 150%');
assert.equal(clamped.percent, 100, 'percent must clamp to 100');
console.log('ok  clamp');

assert.equal(formatElapsed(0), '0:00');
assert.equal(formatElapsed(65_000), '1:05');
assert.equal(formatElapsed(3_723_000), '1:02:03');
console.log('ok  formatElapsed');

console.log('ALL PASS');
