# Auditoria global — Work Station · 16/10/2026

**74 RF avaliados**, com notas técnicas provisórias de 0 a 10, seis subnotas, erro principal, melhoria, prioridade e evidência. Nenhum RF recebeu aceite integral: 22 jornadas operacionais estão ausentes e 52 são parciais. A média simples das notas após as correções é **3,34/10**, sem equivaler a uma escala validada de UX. Qualidade de IA real e integrações externas não executadas estão **não verificadas**.

O trabalho inclui correções prioritárias no código local e validação com contas sintéticas, API e banco reais. **O PR publica a auditoria, não as alterações locais da aplicação.** Um checkout sem essas implementações não reproduz a experiência; os hashes do código auditado estão no manifesto. A publicação do PR de produto continua condicionada ao plano anterior de completar os RF.

## Downloads

- [PDF completo](AUDITORIA_WORK_STATION.pdf).
- [Pacote completo ZIP](PACOTE_AUDITORIA_WORK_STATION.zip).
- [Matriz legível dos 74 RF](MATRIZ_RF.md), [CSV](MATRIZ_RF.csv) e [JSON com subnotas e rastreabilidade](MATRIZ_RF.json).
- [Inventário dos critérios e fontes](CRITERIOS_ACEITE.json), [documentos de origem](REQUISITOS_FONTES.json) e [snapshot dos RF ativos no Trello](TRELLO_RF_SNAPSHOT.json).

## Relatórios

- [Relatório completo e método UX/IHC](RELATORIO.md).
- [Resumo por módulo](RESUMO_MODULOS.md).
- [Problemas, gravidade e reprodução](PROBLEMAS.md).
- [Antes × depois e arquivos alterados](ANTES_DEPOIS.md).
- [Plano P0–P3 até aceite e nota 10](PLANO_CORRECAO.md).
- [Inventário de conectores, aplicativos e formatos](CONECTORES.md).
- [Métricas efetivamente medidas](METRICAS.json) e [validação](VALIDACAO.json).
- [Manifesto do código observado](MANIFESTO_FONTES.json), [referências oficiais consultadas](REFERENCIAS_CONSULTADAS.json) e [integridade dos artefatos](MANIFESTO_ARTEFATOS.json).

## Evidências visuais

As capturas são da aplicação real, com dados fictícios. As de `jornadas/` registram a execução dos seis casos e dos editores; as de `depois/` mostram a verificação final após refinamentos. Nenhuma imagem de sugestão de IA foi gerada para simular capacidade do produto.

| Etapa / fluxo | Desktop | Celular |
|---|---|---|
| Perfil anterior: exemplo apesar de conta cadastrada | [Antes](evidencias/antes/perfil.png) | [Antes móvel](evidencias/antes/mobile-profile.png) |
| Perfil final: identidade e tarefas reais, visão privada | [Depois](evidencias/depois/perfil.png) | [Depois móvel](evidencias/depois/mobile-profile.png) |
| Criador com metadados profissionais | [Formulário](evidencias/depois/criar-tarefa.png) | [Formulário móvel](evidencias/depois/mobile-tasks-new.png) |
| Edição de tarefa de software | [Software](evidencias/jornadas/tarefa-software.png) | Fluxo móvel geral do formulário acima |
| Administração / design / pesquisa | [Administração](evidencias/jornadas/tarefa-administracao.png) · [Design](evidencias/jornadas/tarefa-design.png) · [Pesquisa](evidencias/jornadas/tarefa-pesquisa.png) | Não repetidos por área no celular |
| Marketing / planejamento | [Marketing](evidencias/jornadas/tarefa-marketing.png) · [Planejamento](evidencias/jornadas/tarefa-planejamento.png) | Não repetidos por área no celular |
| Letters: revisão local, desfazer/refazer e exportação | [Revisão local](evidencias/jornadas/letters-revisao-local.png) | [Estúdio móvel final](evidencias/depois/mobile-studio.png) |
| Drawings: luminária construída por quatro comandos | [Desenho](evidencias/jornadas/drawings-luminaria.png) | Estúdio móvel final acima |
| DECIA: decisão e contexto demonstrativos | [DECIA](evidencias/depois/decia.png) · [Riscos](evidencias/depois/decia-riscos-ia.png) | Não executado como sessão real em celular |
| Mural e conectores | [Mural](evidencias/depois/mural.png) · [Anexos](evidencias/depois/anexos.png) | Não há conector externo operacional demonstrado |

Os [resultados do navegador](evidencias/depois/BROWSER.json) delimitam Axe e overflow; os [resultados das jornadas](evidencias/jornadas/JORNADAS.json) registram os seis casos, Letters e Drawings. Os [testes reais de colaboração 2D](evidencias/colaboracao/COLABORACAO.json) verificam reservas, camadas, patches e revogação, sem alegar sessão DECIA ou coedição Letters completas.

Arquivos editáveis: [Letters](evidencias/jornadas/LETTERS.ws-studio.json), [Drawings](evidencias/jornadas/DRAWINGS.ws-studio.json), [Drawings após reabrir](evidencias/jornadas/DRAWINGS_REABERTO.ws-studio.json).

## Reproduzir sem sobrescrever evidências

Use uma versão da aplicação com o código local descrito no manifesto, serviços em `http://localhost:3000` e `http://localhost:8080`, MySQL, Node 22+, Chromium em `/usr/bin/chromium` e dependências `@playwright/test` e `@axe-core/playwright`. Não execute as jornadas de mutação contra contas ou dados de produção.

Prepare um arquivo de fixture **fora do Git**, com duas contas sintéticas já ativas e autorizadas:

```json
{
  "owner": { "username": "conta-sintetica-1", "password": "CONFIGURAR_LOCALMENTE" },
  "other": { "username": "conta-sintetica-2", "password": "CONFIGURAR_LOCALMENTE" }
}
```

Não publique nem envie valores de credenciais no chat. A fixture padrão é `/tmp/ws-synthetic-audit-fixture.json`; pode ser escolhida por `WS_AUDIT_FIXTURE_PATH`.

Execute a partir da raiz do repositório:

```sh
python docs/auditoria/2026-10-16/auditoria-global-work-station/scripts/validar-auditoria.py
node --test docs/auditoria/2026-10-16/auditoria-global-work-station/scripts/output.test.cjs
WS_AUDIT_FIXTURE_PATH=/caminho/fixture.json node docs/auditoria/2026-10-16/auditoria-global-work-station/scripts/auditar-navegacao.cjs
WS_AUDIT_FIXTURE_PATH=/caminho/fixture.json node docs/auditoria/2026-10-16/auditoria-global-work-station/scripts/auditar-jornadas.cjs
WS_AUDIT_FIXTURE_PATH=/caminho/fixture.json node docs/auditoria/2026-10-16/auditoria-global-work-station/scripts/auditar-colaboracao.cjs
```

Cada execução cria uma pasta temporária exclusiva `ws-audit-global-*` e informa o caminho. `WS_AUDIT_OUTPUT` é opcional e deve apontar para uma pasta vazia, criada se necessário. Destino ocupado é recusado; artefatos publicados não são sobrescritos. Guarde os temporários antes da limpeza do sistema.

`auditar-jornadas.cjs` cria seis tarefas sintéticas persistentes; `auditar-colaboracao.cjs` cria uma tarefa/desenho, concede e revoga acesso da segunda conta, exercitando o backend. Esses scripts não apagam tarefas do usuário. A navegação sinaliza saída não zero se houver erro JavaScript, violação Axe, overflow, HTTP inesperado ou tentativa de IA bloqueada. Os scripts de navegador bloqueiam requisições de geração; não avaliam qualidade de resposta de IA. O script de colaboração só usa autenticação, tarefas, concessões e desenhos, sem endpoint de inferência.

Para reconstruir o PDF/pacote a partir dos documentos e evidências, use `scripts/gerar-pacote.py` com Python, ReportLab e pypdf instalados. O script não chama provedores de IA.
