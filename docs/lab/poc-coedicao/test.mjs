// Teste E2E do PoC: sobe o servidor, abre 2 páginas (Maria/azul e Carlos/laranja), digita em uma e mede quanto
// tempo leva até a outra receber o texto. Critério: < 1000 ms. Gera captura lado a lado das 2 abas.
// Uso: node test.mjs [saidaPng]
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

const PORT = 1239;
const OUT = process.argv[2] || 'teste-2-abas.png';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const log = (...a) => console.log(new Date().toISOString().slice(11, 23), ...a);

const server = spawn(process.execPath, ['server.mjs', String(PORT)], { stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise((r) => server.stdout.on('data', (d) => { process.stdout.write(d); if (String(d).includes('http://')) r(); }));

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const results = { samples: [], presence: {}, ok: false };
try {
  const ctxA = await browser.newContext({ viewport: { width: 640, height: 520 } });
  const ctxB = await browser.newContext({ viewport: { width: 640, height: 520 } });
  const a = await ctxA.newPage(), b = await ctxB.newPage();
  for (const [p, n] of [[a, 'A'], [b, 'B']]) p.on('pageerror', (e) => log(`PAGEERROR ${n}:`, e.message));
  await a.goto(`http://localhost:${PORT}/?room=minuta-demo&user=Maria&cor=azul`);
  await b.goto(`http://localhost:${PORT}/?room=minuta-demo&user=Carlos&cor=laranja`);
  await a.waitForFunction(() => document.getElementById('status').dataset.ok === 'true');
  await b.waitForFunction(() => document.getElementById('status').dataset.ok === 'true');
  await a.waitForFunction(() => window.__presenceCount >= 2, null, { timeout: 5000 });
  log('ambas conectadas; presença em A =', await a.evaluate(() => window.__presenceCount));

  // 1) A digita, B recebe
  const texto1 = 'MINUTA — Decisão sobre a drenagem do lote 2 (km 12–14). ';
  await a.click('#editor');
  const t0 = Date.now();
  await a.keyboard.type(texto1, { delay: 0 });
  await b.waitForFunction((t) => document.getElementById('editor').textContent.includes(t), texto1, { timeout: 1000 });
  const d1 = Date.now() - t0;
  results.samples.push({ dir: 'A→B', chars: texto1.length, ms: d1 });
  log(`A→B: "${texto1.trim()}" chegou em ${d1} ms (inclui o tempo de digitação dos ${texto1.length} caracteres)`);

  // 2) latência de 1 caractere, medida 5 vezes (A digita 1 char, B observa)
  for (let i = 0; i < 5; i++) {
    const ch = String.fromCharCode(65 + i);
    const marker = '§' + ch;
    const t = Date.now();
    await a.keyboard.type(marker);
    await b.waitForFunction((m) => document.getElementById('editor').textContent.includes(m), marker, { timeout: 1000 });
    const ms = Date.now() - t;
    results.samples.push({ dir: 'A→B (2 chars)', chars: 2, ms });
    log(`A→B 1 token "${marker}": ${ms} ms`);
  }

  // 3) B digita, A recebe (edição concorrente no fim do texto)
  await b.click('#editor');
  await b.keyboard.press('End');
  const texto2 = ' Encaminhamento: sondagem complementar até 10/10.';
  const t2 = Date.now();
  await b.keyboard.type(texto2, { delay: 0 });
  await a.waitForFunction((t) => document.getElementById('editor').textContent.includes(t), texto2, { timeout: 1000 });
  const d2 = Date.now() - t2;
  results.samples.push({ dir: 'B→A', chars: texto2.length, ms: d2 });
  log(`B→A: chegou em ${d2} ms`);

  // 4) convergência: os dois textos são idênticos
  await a.waitForTimeout(300);
  const [ta, tb] = await Promise.all([a.evaluate(() => document.getElementById('editor').textContent), b.evaluate(() => document.getElementById('editor').textContent)]);
  results.converged = ta === tb; results.finalText = ta;
  log('convergiu:', results.converged, '| texto final:', JSON.stringify(ta));
  results.presence = { A: await a.evaluate(() => window.__presenceCount), B: await b.evaluate(() => window.__presenceCount) };
  const status = await (await fetch(`http://localhost:${PORT}/status`)).json();
  log('servidor /status:', JSON.stringify(status));

  // captura das 2 abas lado a lado
  await a.evaluate(() => document.getElementById('editor').focus());
  await a.waitForTimeout(200);
  const [sa, sb] = await Promise.all([a.screenshot(), b.screenshot()]);
  const page = await browser.newPage({ viewport: { width: 1300, height: 560 } });
  await page.setContent(`<body style="margin:0;background:#1B1F26;display:flex;gap:20px;padding:20px;font-family:system-ui">
    <figure style="margin:0"><img src="data:image/png;base64,${sa.toString('base64')}" width="640"><figcaption style="color:#fff;font-size:12px;margin-top:6px">Aba A — Maria (azul)</figcaption></figure>
    <figure style="margin:0"><img src="data:image/png;base64,${sb.toString('base64')}" width="640"><figcaption style="color:#fff;font-size:12px;margin-top:6px">Aba B — Carlos (laranja)</figcaption></figure></body>`);
  await page.screenshot({ path: OUT });
  log('captura salva em', OUT);

  const max = Math.max(...results.samples.map((s) => s.ms));
  results.ok = results.converged && max < 1000;
  log(results.ok ? `RESULTADO: OK — todas as amostras < 1 s (máx ${max} ms)` : `RESULTADO: FALHOU (máx ${max} ms, convergiu=${results.converged})`);
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
  server.kill();
}
process.exit(results.ok ? 0 : 1);
