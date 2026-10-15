# Prova do fluxo colaborativo 2D

Duas contas sintéticas, dois contextos de navegador e uma tarefa SIGILOSO com concessão explícita. O exemplo gráfico é uma fixture manual; não houve geração por IA. Os endpoints de reserva, leitura e gravação são reais, com MySQL e cifragem de conteúdo. A peça desta captura é vinculada à tarefa, sem sessão DECIA: as permissões de participantes e observadores da sessão foram verificadas separadamente nos testes HTTP.

1. [Peça persistida em somente leitura](01-peca-persistida-somente-leitura.png).
2. [Usuário A reserva A1 no servidor](02-usuario-a-reserva-a1.png).
3. [Usuário B recebe conflito ao tentar a região maior](03-usuario-b-conflito-regiao-maior.png).
4. [B reserva C1; duas regiões independentes em edição](04-duas-reservas-independentes.png).
5. [O patch de A chega ao navegador de B](05-patch-a-recebido-por-b.png).
6. [O patch de B chega ao navegador de A; as duas mudanças permanecem](06-ambos-patches-preservados.png).
7. [Reabrir a peça carrega a revisão 2 do servidor](07-reabertura-revisao-2.png).

[Registro automatizado](EVIDENCIAS.json): zero erros de página e zero pedidos de IA. A captura demonstra edições em regiões distintas e atualização por consulta a cada dois segundos. Os testes HTTP adicionais dispararam dois patches simultaneamente e comprovaram a preservação de ambos.

O exemplo valida a mecânica de colaboração, sem avaliar qualidade artística ou precisão anatômica. Não demonstra colaboração 3D, importadores CAD, autoria certificada ou criação completa de sessões DECIA. O código da aplicação permanece no checkout de desenvolvimento, fora do PR documental.
