# Formatos de entrega: família → variante (estudo, 12/11/2026)

Pedido do dono do produto: “um arquivo pode ter variações como .csv, .xlsx. Ambos remetem-se a planilhas, porém são variações
diferentes” — e “acrescente este campo à modelagem dos dados de tarefas e projetos”. Este estudo define o modelo **FAMÍLIA → VARIANTE →
detalhes**, os campos próprios de cada variante, o que o sistema já confere sozinho e como isso vira critério de aceite verificável e
verificação da aba **Melhorias ✦**.

Legenda: **[implementado]** existe no código em 12/11/2026 · **[recomendação]** proposta, ainda não implementada.

## 1. Modelo

```
FormatoDaEntrega
  family   : PLANILHA | DOCUMENTO | APRESENTACAO | IMAGEM | DESENHO_TECNICO | DADOS | AUDIO_VIDEO | PACOTE | LINK | OUTRO
  variant  : código curto (XLSX, XLS, XLSM, ODS, CSV, TSV, DOCX, DOC, ODT, PDF, PDF_A, RTF, MD, TXT, HTML, PPTX, ODP, PNG, JPG,
             SVG, WEBP, DWG, DXF, IFC, GLB, JSON, XML, MP3, WAV, M4A, MP4, WEBM, MOV, ZIP, URL) — opcional
  details  : { campo: valor } — só os campos da família e da variante
```

- A **família** responde “que tipo de coisa é” (o que a pessoa entende); a **variante**, “em que formato de arquivo” (o que a máquina
  confere). A mesma sigla pode existir em mais de uma família: PDF é variante de Documento, de Apresentação e de Desenho técnico
  (prancha). Por isso a identidade de uma variante é o par (família, variante).
- Cada família tem **campos comuns** (valem para todas as variantes) e cada variante, **campos próprios**. Trocar de variante preserva os
  comuns e descarta os que deixam de valer, avisando quais. **[implementado]** `changeFormat`.
- O catálogo é **dado puro e testado** em `lib/tasks/formats.ts` (`FORMAT_FAMILIES`, `FORMAT_VARIANTS`, `FORMAT_FAMILY_FIELDS`):
  toda variante tem família, código do backend, extensões, MIME, ícone reconhecível e campos com chave válida
  (`lib/tasks/formats.test.ts`). **[implementado]**

### 1.1 Onde fica gravado

| Onde | Campo | Situação |
|---|---|---|
| Tarefa (`TaskItem`) | `formatFamily`, `formatVariant`, `formatDetailsJson` | **[implementado]** backend (V71, validação de família/variante/campos no `TaskService`) e front: `formatToRequest` envia as três colunas no `POST/PUT /api/tasks`; `formatFromView` lê as colunas e, para tarefas gravadas antes da V71, ainda aceita o espelho antigo `extensions.fileFormat` — ao salvar de novo, o formato passa para as colunas e o espelho some. |
| Anexo/evidência (`TaskAttachment`) | `formatFamily`, `formatVariant`, `formatDetails` (calculados do tipo real) | backend: em andamento. Front: **[implementado]** `attachmentFormat` usa os do servidor quando vierem; senão estima pela extensão/MIME com o mesmo catálogo e marca “estimado pela extensão”. |
| Projeto (`ProjectModel`) | `WbsNode.format?` (entrega/artefato) e `Task.format?` (atividade com entrega): `{ family, variant?, details? }` | **[implementado]** `lib/projects/types.ts` (`DeliverableFormat`), editável no criador de projetos (passo do TAP, cada entrega) e no inspetor da atividade; versionado pelos comandos existentes (`TASK_UPDATE` e `WBS_UPDATE` aceitam `format`, validado pelo catálogo — família desconhecida = `VALOR_INVALIDO`). |

## 2. Famílias, variantes e campos próprios

| Família (campos comuns) | Variante | Campos próprios | Conferência automática hoje |
|---|---|---|---|
| **Planilha** (cabeçalho na linha 1) | XLSX | abas esperadas, contém fórmulas, células protegidas | tipo real no upload (`DetectedType.XLSX`, zip-bomb); prévia do topo da planilha no visualizador (`lib/cardviewer/xlsx.ts`: primeira aba visível, valores em cache, recusa macro e criptografia) |
| | XLS | abas, fórmulas, proteção | — (formato binário antigo; recomendar XLSX) |
| | XLSM | abas, fórmulas, proteção | **recusado** na prévia: o visualizador recusa macro (`vbaProject.bin`); `.xlsm` não está entre os tipos do pipeline (`DetectedType`); o seletor avisa |
| | ODS | abas, fórmulas, proteção | — |
| | CSV | delimitador, codificação, separador decimal | — (leitura simples; ver §3) |
| | TSV | codificação, separador decimal | — |
| **Documento** (nº máximo de páginas) | DOCX | modelo/estilo, controle de alterações | tipo real no upload (`DetectedType.DOCX`); leitura/importação no Letters (`lib/letters/io/docx.ts`) |
| | DOC | modelo | — (Letters recusa com mensagem: `KNOWN_UNSUPPORTED`) |
| | ODT | modelo, controle de alterações | — (Letters: `KNOWN_UNSUPPORTED`) |
| | PDF | assinatura digital, texto pesquisável (OCR) | tipo real no upload (`DetectedType.PDF`) |
| | PDF_A | nível PDF/A (1b, 2b, 3b), assinatura, texto pesquisável | só “é PDF”; o nível PDF/A **não** é conferido |
| | RTF | — | — |
| | MD, TXT, HTML | codificação | Letters importa (`lib/letters/io/import.ts`, `markdown.ts`, `html.ts`) |
| **Apresentação** (nº máximo de slides) | PPTX | modelo | tipo real no upload (`DetectedType.PPTX`) |
| | ODP | modelo | — |
| | PDF | — | `DetectedType.PDF` |
| **Imagem** (largura e altura mínimas) | PNG, WEBP | fundo transparente | tipo real e limite de pixels no upload (`DetectedType.PNG/WEBP`, categoria IMAGE) |
| | JPG | — | `DetectedType.JPEG`; metadados da foto removidos |
| | SVG | fundo transparente | — (SVG não está entre os tipos do pipeline, `DetectedType`) |
| **Desenho técnico** (unidade, escala) | DWG | versão do arquivo (AC1032…) | `DetectedType.DWG`; `lib/cad/dwg.ts` lê **só a versão** (AC10xx) — nenhum quantitativo sai do DWG |
| | DXF | versão do arquivo | `DetectedType.DXF`; `lib/cad/dxf.ts` lê entidades, unidades (`$INSUNITS`) e camadas |
| | IFC | esquema (IFC2x3, IFC4, IFC4x3) | `DetectedType.IFC`; `lib/cad/ifc.ts` lê o esquema do cabeçalho, unidades, elementos e quantidades |
| | GLB | — | `DetectedType.GLB`; `lib/cad/glb.ts` |
| | PDF (prancha) | formato do papel (A0–A4), assinatura | `DetectedType.PDF` |
| **Dados** (codificação) | JSON, XML | esquema (endereço) | — |
| | CSV | delimitador, cabeçalho, separador decimal | — |
| **Áudio e vídeo** (duração máxima) | MP3, WAV, M4A | com transcrição | — (áudio não está entre os tipos do pipeline) |
| | MP4, WEBM, MOV | com legendas | — (vídeo não está entre os tipos do pipeline) |
| **Pacote** (conteúdo esperado) | ZIP | nº máximo de arquivos | `DetectedType.ZIP` com defesa de zip-bomb |
| **Link** (acesso pelo link conferido) | URL | plataforma | — (link de Planilhas/Documentos/Apresentações online, Numbers/Keynote no iCloud: entra por link, nunca por logotipo) |
| **Outro** (descrição do formato) | — | — | — |

## 3. Do campo ao critério de aceite e às Melhorias ✦

1. **Critério sugerido [implementado]** — `suggestedCriteria(formato)` monta, só a partir do que a pessoa escolheu, um critério da
   variante (“Entregue em CSV”) e um por campo preenchido (“Codificação UTF-8”, “Cabeçalho na linha 1”, “Delimitador ponto e vírgula
   (;)”). No criador de tarefas, “Acrescentar aos critérios” os copia para os critérios de conclusão (sem duplicar). Nada é inventado
   (D-12): o texto é a tradução da chave com o valor escolhido.
2. **Verificação “formato do anexo” [implementado]** — `matchesFormat`/`formatMismatch` (`lib/tasks/formats.ts`): pediu XLSX e anexou
   CSV → diverge; pedido só de família aceita qualquer extensão da família (um .pdf atende a Desenho técnico, que tem a prancha em PDF);
   evidências e arquivos de formato desconhecido ficam de fora. Aparece no criador (lista de anexos escolhidos), no detalhe da tarefa
   (aviso no topo da lista e marca por anexo) e em `/attachments` (formato por linha e filtro por família). A aba **Melhorias ✦**
   (`lib/cardviewer/checks.ts`, agente do visualizador) já tem a verificação `formatoAnexo` com uma função própria; **recomendação:**
   que ela passe a chamar `matchesFormat` daqui (a dela compara a família estimada e reprova um .pdf pedido como Desenho técnico).
3. **Conferência pelo conteúdo [recomendação]** — com o arquivo em mãos, cada leitor já existente pode transformar o campo em PASSOU/
   ATENÇÃO/FALHOU:
   - CSV: detectar o delimitador (contagem por linha nas 20 primeiras), a codificação (UTF-8 válido? BOM?) e se a linha 1 é texto;
   - XLSX: `lib/cardviewer/xlsx.ts` já lê as abas e as células — conferir abas esperadas, existência de `<f>` (fórmulas) e `sheetProtection`;
   - DOCX: `lib/letters/io/docx.ts` — estilo/modelo (`styles.xml`), `w:ins`/`w:del` (controle de alterações);
   - PDF: assinatura (`/ByteRange` + `/Sig`), camada de texto (operadores `Tj`/`TJ`), nº de páginas (`/Count`), PDF/A (metadados XMP
     `pdfaid:part`/`conformance`) — exige um leitor de PDF que o projeto ainda não tem;
   - imagem: dimensões e canal alfa pelo cabeçalho (PNG `IHDR`, WEBP `VP8X`);
   - DWG/DXF: versão (`AC10xx`) e unidade (`$INSUNITS`) já lidas em `lib/cad`; IFC: `FILE_SCHEMA` já lido;
   - vídeo/áudio: duração e faixa de legenda pelos metadados (sem leitor hoje).
   No backend, o mesmo vale para o pipeline de mídia (`DetectedType` decide o tipo real pelos bytes; o formato do anexo devolvido pela
   API deve sair dele, nunca da extensão).

## 4. Interface **[implementado]**

- `components/fileicons/**`: `FileTypeIcon` (folha com canto dobrado, sigla e faixa na cor da convenção do tipo, só com tokens de nó
  do DS; decorativo ao lado de texto, `role="img"` com nome quando sozinho) e `FileTypeSelect` (`<select>` nativo + painel “Escolher pelo
  ícone” com as opções e seus ícones); mapeamento extensão/MIME/tipo → ícone em `kinds.ts` (testado).
- `components/tasks/FormatPicker.tsx`: família → variante com ícones, campos só da variante, aviso ao trocar, critérios sugeridos. Usado
  no criador de tarefas (seção “Entregas, formato e critérios”), no criador de projetos (cada entrega) e no inspetor da atividade.
- `components/tasks/AttachmentFormat.tsx`: ícone + “Família · Variante · detalhes” (ex.: “Planilha · CSV · ponto e vírgula (;), UTF-8”),
  “estimado pela extensão” e o aviso de divergência.
