const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function prepareOutput(output = process.env.WS_AUDIT_OUTPUT) {
  if (!output) return fs.mkdtempSync(path.join(os.tmpdir(), 'ws-audit-global-'));
  const resolved = path.resolve(output);
  fs.mkdirSync(resolved, { recursive: true });
  if (fs.readdirSync(resolved).length) {
    throw new Error('WS_AUDIT_OUTPUT deve apontar para um diretório vazio: ' + resolved);
  }
  return resolved;
}

module.exports = { prepareOutput };
