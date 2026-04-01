# Artistic Gymnastics Competition Simulator

## Sobre o Projeto

O **Artistic Gymnastics Competition Simulator** é um monorepo em TypeScript voltado para a simulação de uma competição olímpica de **Ginastica Artistica Feminina (WAG)**. O projeto possui como principal artefato a aplicação `artifacts/gymnastics-sim`, uma interface web que conduz o usuario por todas as etapas da competição, desde a seleção das equipes até a final por equipes.

O repositorio tambem inclui:

- um frontend em React + Vite para a simulação;
- um servidor de API em Express;
- bibliotecas compartilhadas para contratos, schemas e banco de dados;
- scripts utilitarios para apoio ao workspace.

## Sumário

- [Sobre o Projeto](#sobre-o-projeto)
- [Como acessar o repositorio](#como-acessar-o-repositorio)
- [Ferramentas utilizadas](#ferramentas-utilizadas)
- [Fluxo geral do projeto](#fluxo-geral-do-projeto)
- [Segurança](#segurança)
- [Dependencias necessarias](#dependencias-necessarias)

## Como acessar o repositorio

Repositorio remoto:

```bash
https://github.com/GabrielFreitas836/artistic-gymnastics-competition-simulator.git
```

Para clonar o projeto localmente:

```bash
git clone https://github.com/GabrielFreitas836/artistic-gymnastics-competition-simulator.git
cd artistic-gymnastics-competition-simulator
```

Para instalar as dependencias do workspace:

```bash
pnpm install
```

Comandos úteis:

```bash
pnpm run typecheck
pnpm run build
pnpm --filter @workspace/gymnastics-sim run dev
pnpm --filter @workspace/api-server run build
```

## Ferramentas utilizadas

### Base do workspace

- **pnpm workspaces** para organização do monorepo;
- **TypeScript** como linguagem principal;
- **Node.js 24** como runtime recomendado;
- **Prettier** para padronização de código.

### Frontend

- **React 18** para construçao da interface;
- **Vite** para desenvolvimento e build;
- **Wouter** para roteamento;
- **TanStack React Query** para suporte a consumo de API;
- **Tailwind CSS 4** para estilização;
- **Radix UI** para componentes acessiveis;
- **Framer Motion** para animações;
- **Zod** e **React Hook Form** para validação e formularios.

### Backend e bibliotecas

- **Express 5** para a API;
- **Drizzle ORM** para acesso ao banco;
- **PostgreSQL** como banco de dados;
- **Orval** para geração de cliente e tipos a partir de OpenAPI;
- **Pino / pino-http** para logging.

## Fluxo geral do projeto

O simulador principal segue um fluxo sequencial de fases, controlado pelo estado global da aplicação e persistido em `localStorage`:

1. **Teams**: seleção dos paises/equipes participantes.
2. **Roster**: definição das ginastas de cada equipe.
3. **Mixed Groups**: organização das ginastas sem equipe completa em grupos mistos.
4. **Rotation**: distribuição por subdivisões e aparelhos iniciais.
5. **Scores**: lançamento das notas por aparelho.
6. **Results**: consolidação dos resultados da qualificação.
7. **Team Final**: configuração e acompanhamento da final por equipes.

### Estrutura principal do monorepo

```text
artistic-gymnastics-competition-simulator/
|- artifacts/
|  |- gymnastics-sim/    # Apliçãção principal da simulação
|  |- api-server/        # Servidor Express
|  |- mockup-sandbox/    # Ambiente auxiliar de mockup
|- lib/
|  |- api-spec/          # Especificação OpenAPI
|  |- api-client-react/  # Cliente React gerado
|  |- api-zod/           # Schemas Zod gerados
|  |- db/                # Camada de banco com Drizzle
|- scripts/              # Scripts utilitarios
```

### Funcionamento da simulação

- O estado da simulação é centralizado em `SimulationContext`.
- Os dados são persistidos no navegador via `localStorage`, permitindo retomar a simulação depois.
- Existe uma geração automatica de cenario inicial em `quickSetup.ts`, com seleção de paises, equipes, grupos mistos, subdivisões e ordem de apresentação.
- O frontend funciona de forma predominantemente client-side, enquanto o backend e as libs compartilhadas preparam o projeto para evolução com contratos e integracões reais.

## Segurança

O projeto adota algumas medidas de seguranca e boas praticas já visíveis na base atual:

- **CORS restrito no backend**: a API não aceita origem coringa em produção e valida dominios autorizados por variavel de ambiente.
- **Limites de payload no Express**: o parser JSON e `urlencoded` usam limite de `1mb`.
- **Parser `urlencoded` seguro**: o backend utiliza `extended: false`, reduzindo riscos ligados a objetos aninhados indevidos.
- **Variáveis obrigatórias**: o backend exige `PORT` e a camada de banco exige `DATABASE_URL`.
- **Persistencia local no frontend**: o estado da simulação fica salvo no `localStorage`; por isso, não e recomendado armazenar segredos ou dados sensiveis nesse fluxo.
- **Controle de dependências**: o workspace utiliza configurações do `pnpm` para reduzir instalações automáticas inesperadas de peers.

## Dependências necessárias

Para executar o projeto localmente, recomenda-se ter instalado:

- **Node.js 24**
- **pnpm**
- **Git**

Dependências adicionais por contexto:

- **PostgreSQL** ou uma `DATABASE_URL` valida, caso voce deseje executar a camada de banco e o backend completo;
- acesso a internet, caso a geração automatica de nomes utilize a API externa `randomuser.me`.

### Instalação rapida

```bash
pnpm install
pnpm run typecheck
pnpm --filter @workspace/gymnastics-sim run dev
```

Se houver necessidade de iniciar o backend futuramente, configure antes:

```bash
PORT=3000
DATABASE_URL=<sua-string-de-conexao>
```
