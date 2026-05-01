# Artistic Gymnastics Competition Simulator

## Sobre o projeto

O **Artistic Gymnastics Competition Simulator** é um monorepo em TypeScript voltado para a simulação de uma competição olímpica completa de ginástica artística.

Hoje o foco principal do repositório é a aplicação [`artifacts/gymnastics-sim`](./artifacts/gymnastics-sim), uma interface web em React + Vite que permite conduzir uma simulação completa de:

- **WAG** (`Women's Artistic Gymnastics`)
- **MAG** (`Men's Artistic Gymnastics`)

O fluxo vai da escolha da disciplina e seleção das equipes até a qualificação, finais e quadro final de medalhas.

## O que o simulador cobre

- escolha inicial entre **WAG** e **MAG**
- seleção das 12 nações da competição
- configuração manual de elencos por equipe
- suporte a formatos de equipe com **5** ou **3** integrantes
- criação de **mixed groups**
- sorteio de subdivisões e ordem inicial por aparelho
- lançamento de notas da qualificação
- resultados por equipe, individual geral e aparelhos
- hub de finais com **Team Final**, **All-Around Final**, **Apparatus Finals** e **Medal Summary**

## Aparelhos por disciplina

### WAG

- `VT` Vault
- `UB` Uneven Bars
- `BB` Balance Beam
- `FX` Floor Exercise

### MAG

- `FX` Floor Exercise
- `PH` Pommel Horse
- `SR` Rings
- `VT` Vault
- `PB` Parallel Bars
- `HB` Horizontal Bar

## Como executar

Clone o repositório:

```bash
git clone https://github.com/GabrielFreitas836/artistic-gymnastics-competition-simulator.git
cd artistic-gymnastics-competition-simulator
```

Instale as dependências do workspace:

```bash
pnpm install
```

Inicie a aplicação principal:

```bash
pnpm --filter @workspace/gymnastics-sim run dev
```

Por padrão, o Vite disponibiliza a aplicação localmente em `http://localhost:5173`.

## Scripts úteis

### Workspace

```bash
pnpm run typecheck
pnpm run build
```

### Simulador web

```bash
pnpm --filter @workspace/gymnastics-sim run dev
pnpm --filter @workspace/gymnastics-sim run build
pnpm --filter @workspace/gymnastics-sim run serve
pnpm --filter @workspace/gymnastics-sim run test
```

### Regressões focadas

```bash
pnpm --filter @workspace/gymnastics-sim run test:vault-regression
pnpm --filter @workspace/gymnastics-sim run test:qualification-regressions
```

## Stack principal

### Base do monorepo

- **pnpm workspaces**
- **TypeScript**
- **Prettier**

### Frontend

- **React 18**
- **Vite**
- **Wouter**
- **TanStack React Query**
- **Tailwind CSS 4**
- **Radix UI**
- **Framer Motion**
- **React Hook Form**
- **Zod**
- **Vitest**

### Pacotes de apoio do workspace

- **Express 5** no `api-server`
- **Orval** para contratos e codegen
- bibliotecas compartilhadas para especificação, schemas e cliente React

## Fluxo da simulação

O simulador é guiado por fases e persiste o progresso localmente no navegador.

1. **Teams**: seleção dos países participantes
2. **Roster**: configuração dos atletas por equipe
3. **Mixed Groups**: distribuição de atletas sem equipe completa
4. **Rotation**: montagem de subdivisões e aparelhos iniciais
5. **Scores**: lançamento das notas
6. **Results**: consolidação da qualificação
7. **Finals**: finais por equipe, individual geral, aparelhos e resumo de medalhas

## Estrutura principal do repositório

```text
artistic-gymnastics-competition-simulator/
|- artifacts/
|  |- gymnastics-sim/   # Aplicação principal da simulação
|  |- api-server/       # Servidor de apoio do workspace
|  |- mockup-sandbox/   # Ambiente auxiliar para mockups e experimentos
|- lib/
|  |- api-spec/         # Especificação e codegen
|  |- api-client-react/ # Cliente React compartilhado
|  |- api-zod/          # Schemas compartilhados
|- scripts/             # Scripts utilitários do workspace
```

## Observações importantes

- O estado da simulação é persistido em `localStorage`, permitindo retomar o progresso depois.
- A home detecta simulações em andamento e oferece retomada do fluxo.
- O `quick setup` gera um cenário inicial automaticamente para acelerar testes e exploração.
- Parte da geração automática de nomes utiliza `randomuser.me`, então esse fluxo pode depender de acesso à internet.

## Requisitos recomendados

- **Node.js 20+**
- **pnpm**
- **Git**

## Situação atual do projeto

O repositório já suporta as duas disciplinas principais da ginástica artística olímpica:

- **WAG** com 4 aparelhos e 6 finais totais
- **MAG** com 6 aparelhos e 8 finais totais
