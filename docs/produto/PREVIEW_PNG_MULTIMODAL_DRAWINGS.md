# Preview PNG e modo sugestivo — contrato e limites

## Fluxo implementado

1. Com ativação explícita, uma pausa de 1,5 segundo prepara captura PNG transparente da área ativa.
2. A captura usa o SVG existente, exclui fundo, guias, seleção e overlays e registra a revisão correspondente. Não há envio automático.
3. O fluxo existente de proposta vetorial pode renderizar sua resposta como PNG local transparente. Essa imagem é mostrada na mesma prancheta a 50% de opacidade, com borda de escopo e sem interceptar ponteiro.
4. Uma revisão ou contexto novo invalida a proposta. Aceite exige a revisão humana já prevista; rejeição descarta a prévia. O desenho final permanece vetorial porque a origem da proposta é vetorial.
5. Enter aciona o alvo correto. Tab navega por padrão; há opção explícita de aceitar via Tab somente quando a prancheta está focada. Escape rejeita a proposta no editor/assistente.

## Fluxo multimodal ainda pendente

O backend atual de propostas trabalha com geometrias estruturadas. O pipeline solicitado de enviar PNG ao modelo e receber duas imagens novas com alpha, máscaras e coordenadas ainda não está implementado. Não se deve chamar rasterização de vetores de “imagem gerada por Gemini/OpenAI Vision”, nem afirmar que aceitar uma imagem a vetoriza.

RF74 especifica esse conector, validação de MIME/alpha/dimensões, duas variantes (objeto e cena), alinhamento de bounding box, orçamento, consentimento, autorização e preservação de rascunho. O provedor escolhido anteriormente continua sendo OpenAI; Gemini é uma possibilidade da referência fornecida, não uma integração configurada nesta entrega.

Contrato proposto:

```json
{
  "task": "contextual_drawing_completion",
  "baseRevision": 12,
  "scope": {"layerId": "Arquitetura", "regionId": "root/5"},
  "inputImageRef": "referencia_temporaria_autorizada",
  "canvas": {"width": 800, "height": 600, "bounds": {"x": 200, "y": 200, "width": 200, "height": 200}},
  "variants": ["complete_object", "complete_scene"],
  "agencyLevel": 2,
  "budget": {"maxCalls": 1},
  "instruction": "Completar o objeto, preservando as geometrias existentes."
}
```

A referência temporária é uma proposta de contrato; não é endpoint já disponível. O servidor precisa resolver acesso e classificação antes de obter a imagem. A aplicação não deve registrar base64 ou segredos em logs. Resposta de modelo não autoriza execução, publicação ou ampliação de região.

Aceitar PNG gerado requer representação raster editável suportada ou vetorizador validado, ambos ainda pendentes. Transparência, formato e alinhamento devem ser medidos no arquivo retornado, sem confiar somente no texto do modelo. “50% de uma maçã” não é uma medida de complexidade implementada: detecção de intenção e elegibilidade do disparo também exigem avaliação própria.

## Evidência desta rodada

O teste de interface intercepta uma resposta com provedor `TESTE_MOCK`, preserva a geometria e adiciona um círculo conhecido. Verifica rasterização local, alpha, sobreposição, aceite, retorno de foco e revisão. Não testa um modelo multimodal nem consome créditos de API. Critérios não medidos continuam abertos no Trello.
