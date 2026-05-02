# Glossary

Este documento resume, em linguagem simples, a finalidade de alguns arquivos e pastas importantes do projeto.

## Arquivos do contexto de simulação

### `SimulationContext.tsx`

Este arquivo cria o **contexto global da simulação**.

Na prática, ele serve para:

- disponibilizar o estado da simulação para toda a aplicação;
- disponibilizar o `dispatch`, que é a função usada para enviar ações e alterar o estado;
- conectar o React ao `simulationReducer`;
- carregar o estado salvo quando a aplicação abre;
- salvar automaticamente mudanças no `localStorage`.

Em resumo: é a "porta de entrada" do estado global da simulação dentro do React.

### `simulationPersistence.ts`

Este arquivo cuida da **persistência dos dados**.

Ele existe para:

- definir a chave usada no `localStorage`;
- ler dados salvos anteriormente;
- normalizar dados antigos ou incompletos;
- limpar formatos legados para evitar erros;
- gravar o estado atual da simulação no navegador.

Em resumo: ele garante que a simulação possa ser fechada e aberta novamente sem perder progresso, e ajuda a manter compatibilidade com dados antigos.

### `simulationReducer.ts`

Este arquivo concentra as **regras de atualização do estado**.

Ele recebe o estado atual e uma ação, e devolve um novo estado atualizado.

Alguns exemplos do que ele faz:

- trocar disciplina, fase e países selecionados;
- atualizar equipes, grupos mistos e subdivisões;
- registrar notas;
- marcar ou desmarcar DNS;
- montar e resetar finais;
- hidratar a simulação com dados carregados do armazenamento.

Em resumo: é o "motor de decisão" que diz como cada mudança deve acontecer.

### `simulationState.ts`

Este arquivo define a **estrutura básica do estado** e das **ações**.

Ele serve para:

- declarar o tipo `SimulationAction`;
- criar estados vazios para finais por equipes, individual geral e finais por aparelho;
- montar o `initialState`, que é o estado inicial da simulação.

Em resumo: ele estabelece o formato padrão que o resto do sistema segue.

## Pastas comuns em projetos React/Vite

### `components`

A pasta `components` normalmente guarda **componentes visuais reutilizáveis**.

Esses arquivos costumam representar partes da interface, como:

- cards;
- botões;
- painéis;
- tabelas;
- blocos de status.

Em resumo: `components` guarda peças da interface que o usuário vê na tela.

### `hooks`

A pasta `hooks` normalmente guarda **hooks customizados do React**.

Hooks servem para reaproveitar lógica como:

- controle de estado local;
- regras de formulário;
- temporizadores;
- integração com contexto;
- comportamento compartilhado entre componentes.

Em resumo: `hooks` guardam comportamento e lógica reutilizável, sem misturar isso diretamente com a renderização da interface.

## Arquivos dentro de `features/shared`

Essa pasta guarda recursos compartilhados entre várias features do projeto.

### `features/shared/hooks/useTimedIndicator.ts`

Hook que controla **indicadores temporários de atividade**.

Ele permite ativar um sinal visual por chave, manter esse sinal ativo por alguns milissegundos e depois desligar automaticamente.

Uso típico:

- destacar algo que acabou de ser atualizado;
- mostrar feedback visual temporário;
- resetar todos os indicadores de uma vez.

### `features/shared/hooks/useScoreDraftFields.ts`

Hook para controlar **rascunhos de campos de nota**.

Ele ajuda a:

- armazenar o valor digitado antes da confirmação final;
- sanitizar a entrada do usuário;
- exibir o valor correto no input;
- confirmar a nota quando necessário;
- limpar rascunhos inválidos ou antigos.

Em resumo: ele organiza a digitação de notas sem quebrar o valor oficial salvo no estado.

### `features/shared/hooks/useScoreDraftFields.test.ts`

Arquivo de teste do hook `useScoreDraftFields`.

Ele verifica se o hook:

- troca vírgula por ponto;
- limita casas decimais;
- salva zero quando um campo preenchido é limpo;
- ignora entradas inválidas.

Em resumo: garante que a lógica de digitação de notas continue funcionando corretamente.

### `features/shared/utils/formatters.ts`

Arquivo com **funções utilitárias de formatação**.

No momento, ele formata:

- ordinais como `1st`, `2nd`, `3rd`;
- notas opcionais com três casas decimais;
- valores vazios como `-`.

Em resumo: ajuda a exibir dados de forma consistente na interface.

### `features/shared/utils/scoreInput.ts`

Arquivo com utilitários para **tratar entrada de notas**.

Ele é responsável por:

- formatar nota com três casas decimais;
- limpar caracteres inválidos;
- normalizar a digitação do usuário;
- converter texto em número válido;
- montar chaves únicas para drafts de campos.

Em resumo: centraliza as regras técnicas dos inputs de nota.

## Arquivos dentro de `features/finals/shared`

Essa pasta guarda recursos compartilhados especificamente entre as telas de finais.

### `features/finals/shared/selectors/finalsAvailabilitySelectors.ts`

Arquivo com seletores que calculam a **disponibilidade das finais**.

Ele analisa o estado atual da simulação para descobrir, por exemplo:

- se a qualificação já terminou;
- se a final por equipes pode ser aberta;
- se a final individual geral pode ser aberta;
- quantos finalistas e reservas existem;
- se uma final está "Not started", "In progress" ou "Completed";
- se o quadro de medalhas já pode ser liberado.

Em resumo: transforma dados brutos da simulação em informações prontas para a interface usar.

### `features/finals/shared/selectors/finalsAvailabilitySelectors.test.ts`

Arquivo de teste dos seletores de disponibilidade das finais.

Ele garante que os status e textos retornados mudem corretamente conforme o estado da simulação.

Em resumo: protege a lógica que controla acesso e andamento das finais.

### `features/finals/shared/components/FinalEntryCard.tsx`

Componente visual reutilizável para representar uma **entrada/cartão de final**.

Ele mostra:

- ícone;
- título;
- descrição;
- estatísticas;
- estado habilitado ou desabilitado;
- ação de clique para abrir ou continuar a final.

Em resumo: é uma peça de interface usada para apresentar cada final de forma padronizada.

## Resumo rápido

- `SimulationContext.tsx`: conecta o estado global ao React.
- `simulationPersistence.ts`: salva e recupera a simulação.
- `simulationReducer.ts`: define como o estado muda.
- `simulationState.ts`: define a estrutura inicial e as ações.
- `components`: interface visual reutilizável.
- `hooks`: lógica reutilizável.
- `shared`: recursos compartilhados por várias partes do sistema.
