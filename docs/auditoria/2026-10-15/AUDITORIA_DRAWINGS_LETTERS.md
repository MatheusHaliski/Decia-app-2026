# Auditoria — Drawings e Letters (15/10/2026)

> Fontes externas (Getty AAT, VRA Core, W3C WCAG 2.2, C2PA, IPTC, W3C PROV-O, schema.org) **não foram abertas** (rede bloqueada na execução). Confirmar URLs e edições antes de citar.

## 1. Estado verificado
- Não há código executável de Drawings/Letters em `app/`, `components/`, `contracts/` ou `e2e/`; existem docs (`docs/produto/*`, `docs/auditoria/2026-10-14/*`) e dois protótipos monolíticos em `docs/exemplo_drawings_letters/`. O PR #49 é evidência de demonstração, não de produto integrado.
- O Acervo do perfil (`components/social/ProfileView.tsx`) usa repositório DEMO em memória; `SocialTask`/`SocialProject` têm só `aiGenerated: boolean`.
- Modelo canônico (proposta): `docs/produto/LETTERS_DRAWINGS_ENGENHARIA.md` §3; API de peças (§10) não existe.

## 2. Lacunas e riscos
| # | Lacuna | Risco |
|---|---|---|
| L1 | Sem código/API/persistência/testes de peças | Alto |
| L2 | Classificação só espacial (camada/região/objeto/detalhe) + `accessClass` (acesso) | Alto |
| L3 | Score global com rubricas não versionadas (2 de 4 dimensões) | Médio |
| L4 | Protótipos com UI e domínio misturados | Médio |
| L5 | Proveniência reduzida a `aiGenerated` | Alto |
| L6 | Reserva colaborativa só por centro de objeto | Médio |
| L7 | Sem ICC/CMYK/Munsell reais | Baixo/médio |
| L8 | NBR 10067/10126/12298 não verificadas | Baixo |
| L9 | Exportações sem integridade/assinatura | Médio |

## 3. Taxonomia de classificação
Facets opcionais (técnica, suporte, gênero, finalidade, linguagem visual, composição, projeção, estilo, abstração 1–5, escala, intenção/processo, acabamento, acessibilidade), cada um com `value`, `vocabulary`, `termId`, `source` (HUMAN/AI_SUGGESTED/AI_CONFIRMED/DERIVED), `confidence`, `rubricVersion`, `evaluatedAt`. Ausente = "não avaliado". Implementado em `lib/pieces/classification.ts` (`TAXONOMY_VERSION`, `validateClassification`). Mapeamento externo previsto: Getty AAT, VRA Core 4, Dublin Core/schema.org, WCAG 2.2, IPTC Digital Source Type.

## 4. Autoria no perfil
- Categorias: HUMAN, HUMAN_ASSISTED, HYBRID, AI_DIRECTED, AI_FULL, UNVERIFIED, IMPORTED.
- `ContributionEvent` com cadeia de hash SHA-256 (`appendEvent`, `verifyChain`).
- `aiShare` = Σ peso das unidades finais cuja última origem é IA (e com modificação humana < 50%) / Σ peso final; rejeitado/desfeito/apagado não conta; sem log completo ⇒ UNVERIFIED/IMPORTED, sem estimativa. Faixas: 0% HUMAN; <50% HYBRID; 50–<90% HYBRID (ou AI_DIRECTED se houve aplicação automática); ≥90% AI_FULL. `computeAuthorship`, `AUTHORSHIP_RULE_VERSION`.
- Declaração do dono: declarar mais IA é livre; elevar autoria humana exige motivo e vira UNVERIFIED (`resolveClaim`).
- Visibilidade: `authorshipDisplay` FULL/CATEGORY_ONLY/HIDDEN; oculto ⇒ "Autoria não divulgada" (`publicAuthorship`). Visitante nunca recebe logs, prompts ou modelo.
- Verificabilidade futura: manifesto C2PA/IPTC assinado, página de verificação.

## 5. Iconografia (proposta)
Nunca só cor: forma + ícone + texto (WCAG 1.4.1; contraste 4,5:1 texto e 3:1 ícones). HUMAN círculo cheio/mão; HUMAN_ASSISTED círculo com ponto; HYBRID círculo dividido + anel com "N% IA" (faixas de 25%, `aiShareBand`); AI_DIRECTED losango; AI_FULL losango cheio ✦; UNVERIFIED contorno tracejado "?"; IMPORTED quadrado com seta. Tokens `--authorship-*`, 16/24/32 px, `aria-label` i18n pt-BR/en/es, `prefers-reduced-motion`.

## 6. Plano
- **P0**: documentar produto × proposta; extrair domínio para `lib/pieces/` (iniciado); API/persistência de `WorkPiece`/`PieceRevision`.
- **P1**: eventos no servidor (modelo e cálculo prontos em `lib/pieces/authorship.ts`); migrar `aiGenerated` → `authorship`; cartão em `TaskSchemeCard`; E2E de visitante.
- **P2**: componente `AuthorshipBadge` + i18n + testes de contraste; UI/filtros de classificação.
- **P3**: manifesto de proveniência; rubricas de composição validadas por docentes antes de score global; avaliação de analisador de português para Letters.

## 7. Entregue nesta alteração
`lib/pieces/authorship.ts`, `lib/pieces/classification.ts`, `lib/pieces/authorship.test.ts` (módulos puros, ainda não integrados à UI nem à API). Os testes foram executados com vitest isolado, pois `npm ci` falha neste checkout (lock fora de sincronia com `package.json`).
