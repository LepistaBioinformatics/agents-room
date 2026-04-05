# AI-Assisted Creation Specification

## Problem Statement

Criar agentes, skills e comandos requer conhecimento da estrutura dos arquivos `.md` e das convenções do Claude Code. Usuários sem familiaridade com frontmatter e com as opções disponíveis (models, tools, etc.) ficam presos na tela em branco. A IA pode transformar uma descrição em linguagem natural em um arquivo pronto.

## Goals

- [ ] Usuário descreve o que quer em linguagem natural e a IA gera o conteúdo do arquivo `.md` completo
- [ ] Feature cobre agentes, skills e comandos
- [ ] Usuário pode revisar e editar antes de salvar
- [ ] Integração usa a API da Anthropic (Claude) configurada uma vez

## Out of Scope

| Feature | Reason |
|---|---|
| Geração iterativa / chat multi-turn | v1 usa single-shot; refinamento é manual |
| Sugestão automática enquanto o usuário digita | Complexidade de UX; v1 é explícito (botão "Gerar") |
| Geração de workspaces via IA | Workspaces são diretórios do SO, não arquivos de conteúdo |
| Validação semântica do conteúdo gerado (ex: verificar se tool existe) | Fora do escopo; usuário revisa |
| Geração para múltiplos agentes de uma vez | Custo e complexidade imprevisíveis |

---

## User Stories

### P1: Configurar chave de API Anthropic ⭐ MVP

**User Story**: Como usuário, quero inserir minha chave da API Anthropic uma vez nas configurações para que as features de geração com IA funcionem.

**Why P1**: Prerequisito para todas as outras histórias. Pode ser colocada na mesma seção "AI & APIs" da feature IMGGEN.

**Acceptance Criteria**:

1. WHEN usuário abre Settings → "AI & APIs" THEN sistema SHALL exibir campo para Anthropic API Key (separado do campo Gemini)
2. WHEN usuário salva a chave THEN sistema SHALL persistir em `~/.agents-room/settings.json` (campo `anthropicApiKey`)
3. WHEN chave ausente e usuário tenta gerar THEN sistema SHALL exibir erro com link para Settings
4. WHEN ambas as chaves (Gemini + Anthropic) estão configuradas THEN sistema SHALL exibir status consolidado na seção AI & APIs

**Independent Test**: Inserir chave, fechar app, reabrir → chave persiste na seção.

---

### P1: Gerar agente via descrição ⭐ MVP

**User Story**: Como usuário, quero descrever o que o agente deve fazer em linguagem natural para que a IA gere o arquivo `.md` completo com frontmatter e prompt body prontos para uso.

**Why P1**: Funcionalidade core. Agentes são o objeto central do app.

**Acceptance Criteria**:

1. WHEN usuário clica no botão "+" de criação de agente (em qualquer workspace) THEN sistema SHALL abrir `CreateAgentDrawer` com campo de descrição + toggle "Gerar com IA"
2. WHEN toggle "Gerar com IA" está ativo e usuário clica "Gerar" THEN sistema SHALL chamar API Anthropic (main process via IPC) com a descrição do usuário
3. WHEN chamada em andamento THEN sistema SHALL exibir estado de loading com skeleton nos campos do formulário
4. WHEN API retorna THEN sistema SHALL preencher os campos do formulário: `name`, `description`, `model`, `tools` (array), e o body do prompt
5. WHEN campos estão preenchidos pela IA THEN sistema SHALL destacar visualmente que foram gerados (ex: badge "Gerado por IA" nos campos)
6. WHEN usuário edita qualquer campo gerado THEN sistema SHALL remover o badge de gerado naquele campo
7. WHEN usuário clica "Salvar" THEN sistema SHALL criar o arquivo `.md` no diretório `.claude/agents/` do workspace selecionado e recarregar o canvas
8. WHEN API retorna erro THEN sistema SHALL exibir mensagem de erro e manter o campo de descrição para nova tentativa

**Independent Test**: Digitar "agente especialista em code review de TypeScript" → formulário preenchido com nome, description, model e body do prompt.

---

### P1: Gerar skill via descrição ⭐ MVP

**User Story**: Como usuário, quero descrever uma skill em linguagem natural para que a IA gere o arquivo `SKILL.md` completo.

**Why P1**: Skills são frequentemente criadas por usuários não-técnicos que não sabem o formato do frontmatter.

**Acceptance Criteria**:

1. WHEN usuário clica "+" no header de Skills no GroupBox THEN sistema SHALL abrir `CreateSkillDrawer` com campo de descrição + toggle "Gerar com IA"
2. WHEN usuário ativa "Gerar com IA" e clica "Gerar" THEN sistema SHALL chamar API Anthropic e preencher: `name`, `description`, `model` (frontmatter) e o corpo do SKILL.md (instruções da skill)
3. WHEN campos preenchidos THEN sistema SHALL exibir preview em markdown do arquivo a ser gerado
4. WHEN usuário salva THEN sistema SHALL criar `~/.claude/skills/<name>/SKILL.md` e recarregar

**Independent Test**: Descrever "skill para revisar PRs e sugerir melhorias" → SKILL.md gerado com frontmatter e instruções.

---

### P1: Gerar comando via descrição ⭐ MVP

**User Story**: Como usuário, quero descrever um comando slash em linguagem natural para que a IA gere o arquivo `.md` do comando.

**Why P1**: Completa a tríade agente/skill/comando para MVP consistente.

**Acceptance Criteria**:

1. WHEN usuário clica "+" no header de Commands no GroupBox THEN sistema SHALL abrir `CreateCommandDrawer` com campo de descrição + toggle "Gerar com IA"
2. WHEN usuário ativa "Gerar com IA" e clica "Gerar" THEN sistema SHALL chamar API Anthropic e preencher: `name` (slug do comando) e o corpo do comando (prompt)
3. WHEN campos preenchidos THEN sistema SHALL exibir preview do arquivo
4. WHEN usuário salva THEN sistema SHALL criar `~/.claude/commands/<name>.md` e recarregar

**Independent Test**: Descrever "comando para criar um commit convencional com mensagem gerada pela IA" → arquivo `.md` gerado com nome e prompt do comando.

---

### P2: Regenerar campo específico

**User Story**: Como usuário, quero poder pedir para a IA regenerar apenas um campo específico (ex: só o body do prompt) sem refazer tudo para ajustar sem perder o resto.

**Why P2**: Melhora o ciclo de refinamento sem ser bloqueante.

**Acceptance Criteria**:

1. WHEN campos estão preenchidos pela IA THEN sistema SHALL exibir botão "↺ Regenerar" inline em cada campo gerado
2. WHEN usuário clica "↺ Regenerar" em um campo THEN sistema SHALL chamar a API pedindo apenas aquele campo e substituir o valor
3. WHEN regeneração em progresso THEN sistema SHALL exibir loading apenas no campo alvo

**Independent Test**: Gerar agente completo → clicar "Regenerar" no body → novo body aparece sem alterar name/model/tools.

---

### P2: Criação de agente em workspace específico

**User Story**: Como usuário com múltiplos workspaces, quero criar um agente diretamente no workspace correto para que ele apareça no lugar certo do canvas.

**Why P2**: Sem isso, criação vai sempre para global — confuso com múltiplos workspaces.

**Acceptance Criteria**:

1. WHEN usuário clica "+" em um GroupBox de workspace específico THEN sistema SHALL pré-selecionar aquele workspace no drawer
2. WHEN drawer está aberto THEN sistema SHALL exibir dropdown de seleção de workspace (global ou qualquer workspace adicionado)
3. WHEN usuário salva THEN sistema SHALL criar o arquivo no `.claude/agents/` do workspace selecionado

**Independent Test**: Clicar "+" no GroupBox do workspace "meu-projeto" → drawer abre com "meu-projeto" pré-selecionado.

---

### P3: Sugestão de model e tools baseada na descrição

**User Story**: Como usuário, quero que a IA escolha automaticamente o model e os tools mais adequados com base na descrição para que eu não precise conhecer todos os modelos disponíveis.

**Why P3**: A P1 já inclui isso como parte da geração; esta história captura o nível de qualidade esperado na seleção.

**Acceptance Criteria**:

1. WHEN IA gera um agente de code review THEN sistema SHALL sugerir model de alta capacidade (ex: claude-opus-4) e tools relevantes (ex: Bash, Read, Grep)
2. WHEN IA gera um agente de documentação THEN sistema SHALL sugerir model balanceado (ex: claude-sonnet-4) e tools de leitura

**Independent Test**: Gerar agente de "análise de performance de banco de dados" → tools inclui Bash, Read; model é um dos Claude mais capazes.

---

## Edge Cases

- WHEN usuário salva agente e `~/.claude/agents/` não existe no workspace THEN sistema SHALL criar o diretório
- WHEN nome gerado pela IA conflita com arquivo existente THEN sistema SHALL alertar e sugerir nome alternativo
- WHEN campo de descrição está vazio ao clicar "Gerar" THEN sistema SHALL exibir erro inline "Descreva o que o agente deve fazer"
- WHEN resposta da API está malformada (não tem os campos esperados) THEN sistema SHALL logar e exibir "Não foi possível gerar. Tente novamente."
- WHEN usuário fecha drawer durante geração THEN sistema SHALL abortar a chamada IPC sem salvar

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| AICREATE-01 | P1: Configurar chave Anthropic | Design | Pending |
| AICREATE-02 | P1: Configurar chave Anthropic | Design | Pending |
| AICREATE-03 | P1: Configurar chave Anthropic | Design | Pending |
| AICREATE-04 | P1: Configurar chave Anthropic | Design | Pending |
| AICREATE-05 | P1: Gerar agente | Design | Pending |
| AICREATE-06 | P1: Gerar agente | Design | Pending |
| AICREATE-07 | P1: Gerar agente | Design | Pending |
| AICREATE-08 | P1: Gerar agente | Design | Pending |
| AICREATE-09 | P1: Gerar agente | Design | Pending |
| AICREATE-10 | P1: Gerar agente | Design | Pending |
| AICREATE-11 | P1: Gerar agente | Design | Pending |
| AICREATE-12 | P1: Gerar agente | Design | Pending |
| AICREATE-13 | P1: Gerar skill | Design | Pending |
| AICREATE-14 | P1: Gerar skill | Design | Pending |
| AICREATE-15 | P1: Gerar skill | Design | Pending |
| AICREATE-16 | P1: Gerar skill | Design | Pending |
| AICREATE-17 | P1: Gerar comando | Design | Pending |
| AICREATE-18 | P1: Gerar comando | Design | Pending |
| AICREATE-19 | P1: Gerar comando | Design | Pending |
| AICREATE-20 | P1: Gerar comando | Design | Pending |
| AICREATE-21 | P2: Regenerar campo | Design | Pending |
| AICREATE-22 | P2: Regenerar campo | Design | Pending |
| AICREATE-23 | P2: Regenerar campo | Design | Pending |
| AICREATE-24 | P2: Workspace específico | Design | Pending |
| AICREATE-25 | P2: Workspace específico | Design | Pending |
| AICREATE-26 | P2: Workspace específico | Design | Pending |
| AICREATE-27 | P3: Sugestão de model/tools | Design | Pending |
| AICREATE-28 | P3: Sugestão de model/tools | Design | Pending |

**Coverage:** 28 total, 25 mapped to tasks, 3 deferred (AICREATE-21..23 per-field regenerate) ✅

---

## Technical Notes

- **API:** Anthropic SDK (`@anthropic-ai/sdk`) — usar modelo `claude-sonnet-4-6` (ou mais recente disponível) para geração
- **IPC channels:** `ai:generate-agent`, `ai:generate-skill`, `ai:generate-command`, `ai:regenerate-field`
- **Prompt strategy:** System prompt com contexto do Claude Code agent format + YAML frontmatter spec; user prompt = descrição do usuário
- **Response parsing:** Pedir resposta em JSON estruturado (não markdown livre) para parsing confiável
- **Storage:** Chave em `~/.agents-room/settings.json` (campo `anthropicApiKey`) — mesma settings da feature IMGGEN
- **Calls:** Main process apenas (nunca renderer) para proteger a chave de API
- **CreateAgentDrawer:** Novo componente — criação de agente era explicitamente fora de escopo no v1 (PROJECT.md), mas agora incluída no v3

---

## Success Criteria

- [ ] Usuário sem conhecimento de frontmatter consegue criar um agente funcional em menos de 2 minutos
- [ ] Arquivo `.md` gerado é válido e reconhecido pelo Claude Code ao abrir o projeto
- [ ] Erro de API não causa crash; mensagem de erro clara ao usuário
