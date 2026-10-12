# PoC — coedição da "Minuta Coletiva" (Yjs + y-websocket + awareness)

Prova de conceito mínima da coedição em tempo real do DECIA (documento colaborativo da sessão, ver `docs/produto/DECIA_SESSAO_E_MESA.md` e o comparativo em `docs/produto/COEDICAO_TECNICA.md`). Sem bundler, sem framework: um servidor Node e uma página HTML.

| Arquivo | O que é |
|---|---|
| `server.mjs` | Servidor HTTP + WebSocket. Implementa o protocolo y-websocket (mensagens `sync` 0 e `awareness` 1) com `y-protocols` em ~80 linhas — o mesmo que `@y/websocket-server` faz — mantendo um `Y.Doc` por sala em memória. Serve `client.html` e os módulos ESM de `node_modules` em `/vendor/<pacote>` (resolvendo a condição `browser` do `exports`). `/status` mostra salas, conexões e updates. É o esqueleto do adapter da porta `CollabDocPort` (`ws-infrastructure/collab-yjs`). |
| `client.html` | Cliente: `Y.Doc` + `WebsocketProvider` + `awareness`. Um `contenteditable` ligado a `Y.Text('minuta')` por diff mínimo (prefixo/sufixo) — no produto entra um editor com binding pronto (TipTap/ProseMirror `y-prosemirror`). Presença: avatares e cursores coloridos com as 6 cores de nó (vermelho, amarelo, verde, azul, marrom, laranja). |
| `test.mjs` | Teste E2E com Playwright (Chromium): sobe o servidor, abre 2 páginas (Maria/azul e Carlos/laranja), digita em uma, espera a outra receber (< 1 s), repete no sentido inverso, confere convergência e grava a captura das 2 abas. |
| `teste-2-abas.png`, `teste.log` | Resultado da última execução (abaixo). |

## Como rodar

```bash
cd docs/lab/poc-coedicao
npm install                       # yjs, y-websocket, y-protocols, lib0, ws (+ playwright-core para o teste)
npm start                         # http://localhost:1234/?room=minuta-demo&user=Maria&cor=azul
# abra uma segunda aba: http://localhost:1234/?room=minuta-demo&user=Carlos&cor=laranja
```

Teste automatizado (precisa de um Chromium; o caminho padrão é o do ambiente desta sessão, troque com `CHROME=/caminho/chrome`):

```bash
CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npm test
```

## Resultado do teste (2026-10-03, Node 22.22, yjs 13.6.33, y-websocket 3.1.0, Chromium 1194)

```
ambas conectadas; presença em A = 2
A→B: "MINUTA — Decisão sobre a drenagem do lote 2 (km 12–14)." chegou em 283 ms (inclui o tempo de digitação dos 56 caracteres)
A→B 1 token "§A": 10 ms
A→B 1 token "§B": 12 ms
A→B 1 token "§C": 11 ms
A→B 1 token "§D": 11 ms
A→B 1 token "§E": 14 ms
concorrente: B→A e A→B chegaram em 430 ms (92 caracteres digitados em paralelo)
convergiu: true | texto final: "PREÂMBULO (inserido por A ao mesmo tempo): MINUTA — Decisão sobre a drenagem do lote 2 (km 12–14). §A§B§C§D§E Encaminhamento: sondagem complementar até 10/10."
servidor /status: {"minuta-demo":{"conns":2,"updates":158,"textLength":158,"awareness":2}}
captura salva em teste-2-abas.png
RESULTADO: OK — todas as amostras < 1 s (máx 430 ms)
```

- **Latência por tecla (A→B, localhost): 10–14 ms**; o tempo das frases inteiras (430 ms no passo concorrente) é dominado pela digitação simulada caractere a caractere, não pelo transporte.
- **Edição realmente concorrente** (passo 3): Maria insere um preâmbulo no **início** enquanto Carlos escreve no **fim**, ao mesmo tempo (`Promise.all`, sem esperar um pelo outro). Os dois lados convergiram para o mesmo texto e cada frase ficou contígua. Esse passo revelou um defeito do cliente da PoC (o caret era restaurado por offset absoluto e "andava para trás" quando chegava texto remoto antes dele, misturando as frases); corrigido mapeando o caret pelo delta do update remoto — no editor real isso é o `Y.RelativePosition` (COEDICAO_TECNICA.md).
- Presença: cada aba vê 2 estados de awareness (avatar + cursor colorido do outro usuário).

![captura das 2 abas](teste-2-abas.png)

## Robustez do servidor (revisão)
- Frame WebSocket vazio, truncado ou de tipo desconhecido fecha **só aquela conexão** (código 1003) e é registrado no log; o processo e as outras salas continuam.
- `/vendor/<pacote>/<sub>` recusa segmentos `.`/`..` (inclusive codificados, `%2F..%2F`) e só serve o arquivo se o caminho canônico (`realpath`) continuar dentro do pacote escolhido em `node_modules`.
- `test.mjs` mata o servidor mesmo quando o Chromium não sobe (o `launch` está dentro do `try/finally`), para a porta 1239 não ficar presa.

## O que a PoC não cobre (fica para o adapter real)
Persistência (snapshot S3 + metadados MySQL + eventos Cassandra), autenticação do WebSocket (JWT do RF2), limite de editores por documento, RESTRITO/SIGILOSO (sala só no backend interno, sem provedor externo), reconexão com fila offline (`y-indexeddb`) e editor rico com modo revisão (sugestões) — ver `docs/produto/COEDICAO_TECNICA.md`.
