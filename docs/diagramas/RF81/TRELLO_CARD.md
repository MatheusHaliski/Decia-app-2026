# Card do Trello — RF81

Texto pronto para o card no board **Work Station** (lista de requisitos especificados). Depois de criar o card, ponha o link na linha **Trello** de [`README.md`](README.md).

**Título:** RF81: Cadastrar-se com a profissão preferida para criar tarefas e projetos únicos da própria área

**Descrição:**

> COMO usuário QUERO me cadastrar no Work Station com a minha profissão preferida PARA criar tarefas e projetos únicos de minha área de estudo ou trabalho, a fim de agregar em minha formação acadêmica e profissional.
>
> Especificação, critérios e os seis diagramas (casos de uso, classes, **atividades**, sequência, estados, componentes): `docs/diagramas/RF81/README.md` no repositório. Dado usado: `contracts/career/academic-fields.json` (79 ramos) e `contracts/career/occupation-packs/` (um pacote por ramo + genérico). Decisões: D-147, D-148.

**Checklist "Critérios de aceite":**

- [ ] CA01 Pergunta opcional no cadastro com autocompletar sobre os 79 ramos (sem caixa nem acento) e "ainda não sei"
- [ ] CA02 Servidor valida o código no catálogo; rótulo vem do catálogo; `422 VALIDACAO` para código desconhecido; visibilidade `SO_EU`
- [ ] CA03 Privado por padrão; nunca filtro de busca de pessoas nem sinal de emprego (D-147)
- [ ] CA04 "Modelos da sua área" no criador de tarefas e projetos, pela prioridade do pacote, respeitando exclusões e aparelho
- [ ] CA05 Criar a partir do modelo gera tarefa própria (variação com semente da pessoa), idempotente
- [ ] CA06 Projeto com tarefas da área recebe fases sugeridas pelo pacote; nada publicado sem ação explícita
- [ ] CA07 Sem profissão: pacote genérico e teste de interesses
- [ ] CA08 Trocar a profissão preserva tarefas e evidências; AuditLog só com o nome do campo
- [ ] CA09 Concluir gera Evidence; CompetencyEvidence só com validação humana
- [ ] CA10 Acessível, pt-BR/en/es, na exportação LGPD; anonimização zera o campo

**Anexo:** a imagem do diagrama de atividades (seção 2 do README).
