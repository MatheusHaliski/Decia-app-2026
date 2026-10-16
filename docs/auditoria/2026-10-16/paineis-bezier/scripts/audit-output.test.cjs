const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { prepareOutput } = require('./audit-output.cjs');

test('default runs get distinct empty directories', () => {
  const first = prepareOutput('');
  const second = prepareOutput('');
  try {
    assert.notEqual(first, second);
    assert.deepEqual(fs.readdirSync(first), []);
    assert.deepEqual(fs.readdirSync(second), []);
  } finally {
    fs.rmSync(first, { recursive: true });
    fs.rmSync(second, { recursive: true });
  }
});

test('explicit output accepts an empty directory and protects existing evidence', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-audit-test-'));
  try {
    const output = path.join(root, 'new', 'run');
    assert.equal(prepareOutput(output), output);
    const evidence = path.join(output, 'EVIDENCIAS.json');
    fs.writeFileSync(evidence, '{"original":true}');
    assert.throws(() => prepareOutput(output), /diretório vazio/);
    assert.equal(fs.readFileSync(evidence, 'utf8'), '{"original":true}');
    fs.unlinkSync(evidence);
    fs.writeFileSync(path.join(output, 'partial.png'), 'partial');
    assert.throws(() => prepareOutput(output), /diretório vazio/);
  } finally {
    fs.rmSync(root, { recursive: true });
  }
});
