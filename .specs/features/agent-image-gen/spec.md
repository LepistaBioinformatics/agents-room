# Agent Image Generation Specification

## Problem Statement

Agents são representados por iniciais ou avatars manuais. Não há forma de gerar uma identidade visual coerente sem sair do app. O usuário precisa de logos e imagens de background para seus agentes sem abrir ferramentas externas.

## Goals

- [ ] Usuário pode gerar um avatar/logo para um agente via prompt textual usando a API Gemini (Imagen)
- [ ] Usuário pode gerar uma imagem de background para o card do agente
- [ ] Imagens geradas são salvas localmente e persistidas no store como qualquer avatar manual
- [ ] A integração exige apenas uma chave de API Gemini configurada uma vez pelo usuário

## Out of Scope

| Feature | Reason |
|---|---|
| Geração de imagens para workspaces/skills/commands | Escopo inicial foca em agentes |
| Edição de imagem pós-geração (crop, filtro) | Ferramentas de edição fora do escopo do app |
| Histórico de imagens geradas | Complexidade desnecessária na v1 |
| Geração em batch (múltiplos agentes de uma vez) | Custo de API imprevisível |
| Armazenamento da chave em keychain do SO | Usar settings simples na v1; keychain é v2+ |

---

## User Stories

### P1: Configurar chave de API Gemini ⭐ MVP

**User Story**: Como usuário, quero inserir minha chave da API Gemini uma vez nas configurações para que todas as features de geração de imagem funcionem sem redigitar.

**Why P1**: Prerequisito para todas as outras histórias.

**Acceptance Criteria**:

1. WHEN usuário abre Settings (nova seção "AI & APIs") THEN sistema SHALL exibir campo de input para Google Gemini API Key
2. WHEN usuário insere e salva a chave THEN sistema SHALL persistir em `~/.agents-room/settings.json` (campo `geminiApiKey`)
3. WHEN a chave está configurada THEN sistema SHALL exibir indicador visual "Conectado" (sem validar contra a API)
4. WHEN a chave está ausente e usuário tenta gerar imagem THEN sistema SHALL exibir mensagem de erro com link para a seção de Settings

**Independent Test**: Abrir Settings, inserir chave fictícia, fechar e reabrir → chave persiste.

---

### P1: Gerar avatar/logo para agente ⭐ MVP

**User Story**: Como usuário, quero gerar um avatar para meu agente via prompt textual para que ele tenha uma identidade visual sem precisar buscar imagem manualmente.

**Why P1**: Funcionalidade core da feature.

**Acceptance Criteria**:

1. WHEN usuário abre AgentDetailDrawer THEN sistema SHALL exibir botão "Gerar com IA" próximo ao avatar atual
2. WHEN usuário clica em "Gerar com IA" THEN sistema SHALL abrir modal com campo de prompt e botão de geração
3. WHEN prompt está vazio THEN sistema SHALL pré-preencher com prompt baseado no nome e descrição do agente
4. WHEN usuário clica "Gerar" THEN sistema SHALL chamar Gemini Imagen API (main process via IPC) e exibir estado de loading
5. WHEN geração bem-sucedida THEN sistema SHALL exibir preview da imagem gerada no modal com opções "Usar" e "Cancelar"
6. WHEN usuário clica "Usar" THEN sistema SHALL salvar imagem em `~/.agents-room/avatars/<uuid>.png` e atualizar avatar do agente via store
7. WHEN API retorna erro THEN sistema SHALL exibir mensagem de erro descritiva no modal (sem fechar)

**Independent Test**: Abrir drawer de agente, clicar "Gerar com IA", inserir prompt, gerar → imagem aparece como avatar.

---

### P2: Gerar background para card do agente

**User Story**: Como usuário, quero gerar uma imagem de background para o card do agente para que minha equipe de agentes tenha uma identidade visual mais rica no canvas.

**Why P2**: Complementa o avatar mas não é bloqueante para MVP.

**Acceptance Criteria**:

1. WHEN usuário abre AgentDetailDrawer THEN sistema SHALL exibir seção "Background do Card" com botão "Gerar com IA"
2. WHEN usuário gera e confirma uma imagem de background THEN sistema SHALL salvar em `~/.agents-room/avatars/<uuid>-bg.png` e persistir `cardBackground` no `agentMeta` do store
3. WHEN `cardBackground` está definido THEN sistema SHALL exibir imagem como background do `AgentCard` no canvas (com overlay escuro para legibilidade do texto)
4. WHEN usuário clica "Remover background" no drawer THEN sistema SHALL limpar `cardBackground` do store e restaurar visual padrão

**Independent Test**: Gerar background → card no canvas exibe a imagem com overlay.

---

### P2: Regenerar com variações

**User Story**: Como usuário, quero poder gerar múltiplas variações antes de confirmar para que eu escolha a melhor sem refazer o processo do zero.

**Why P2**: Melhora UX sem ser bloqueante.

**Acceptance Criteria**:

1. WHEN modal de geração está aberto com uma imagem gerada THEN sistema SHALL exibir botão "Regenerar"
2. WHEN usuário clica "Regenerar" THEN sistema SHALL fazer nova chamada com o mesmo prompt e substituir preview
3. WHEN geração de regeneração está em progresso THEN sistema SHALL exibir loading sem fechar o modal

**Independent Test**: Gerar → clicar Regenerar → nova imagem aparece no mesmo modal.

---

### P3: Prompt automático baseado no agente

**User Story**: Como usuário, quero que o sistema sugira um prompt inteligente baseado nas características do agente para que eu não precise escrever do zero.

**Why P3**: Conveniência; usuário pode escrever prompt manualmente.

**Acceptance Criteria**:

1. WHEN modal de geração abre THEN sistema SHALL gerar prompt automático usando: nome, description, model, tools do agente
2. WHEN usuário edita o prompt automático THEN sistema SHALL preservar a edição (não sobrescrever)

**Independent Test**: Abrir modal de agente com description preenchida → campo de prompt aparece preenchido automaticamente.

---

## Edge Cases

- WHEN chave Gemini inválida THEN sistema SHALL exibir mensagem "Chave de API inválida. Verifique em Settings."
- WHEN agente não tem nome ou description THEN sistema SHALL usar prompt genérico ("a professional AI agent avatar, minimal, dark theme")
- WHEN usuário cancela geração durante loading THEN sistema SHALL abortar chamada IPC e fechar modal
- WHEN imagem gerada tem formato inesperado THEN sistema SHALL logar erro e exibir mensagem ao usuário
- WHEN `~/.agents-room/avatars/` não existe THEN sistema SHALL criar o diretório antes de salvar

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| IMGGEN-01 | P1: Configurar chave Gemini | Design | Pending |
| IMGGEN-02 | P1: Configurar chave Gemini | Design | Pending |
| IMGGEN-03 | P1: Configurar chave Gemini | Design | Pending |
| IMGGEN-04 | P1: Configurar chave Gemini | Design | Pending |
| IMGGEN-05 | P1: Gerar avatar | Design | Pending |
| IMGGEN-06 | P1: Gerar avatar | Design | Pending |
| IMGGEN-07 | P1: Gerar avatar | Design | Pending |
| IMGGEN-08 | P1: Gerar avatar | Design | Pending |
| IMGGEN-09 | P1: Gerar avatar | Design | Pending |
| IMGGEN-10 | P1: Gerar avatar | Design | Pending |
| IMGGEN-11 | P1: Gerar avatar | Design | Pending |
| IMGGEN-12 | P2: Background do card | Design | Pending |
| IMGGEN-13 | P2: Background do card | Design | Pending |
| IMGGEN-14 | P2: Background do card | Design | Pending |
| IMGGEN-15 | P2: Background do card | Design | Pending |
| IMGGEN-16 | P2: Regenerar variações | Design | Pending |
| IMGGEN-17 | P2: Regenerar variações | Design | Pending |
| IMGGEN-18 | P2: Regenerar variações | Design | Pending |
| IMGGEN-19 | P3: Prompt automático | Design | Pending |
| IMGGEN-20 | P3: Prompt automático | Design | Pending |

**Coverage:** 20 total, 20 mapped to tasks ✅

---

## Technical Notes

- **API:** Google Gemini Imagen (ex: `imagen-3.0-generate-fast-001` ou `gemini-2.0-flash-preview-image-generation`) — confirmar modelo disponível no momento da implementação
- **IPC channels:** `image:generate-avatar`, `image:generate-background`, `settings:get-api-keys`, `settings:set-api-keys`
- **Storage:** Chave em `~/.agents-room/settings.json`; imagens em `~/.agents-room/avatars/` (mesmo pipeline do avatar manual)
- **Security:** Chave em settings.json plaintext na v1 (aceitável para app local single-user)
- **Calls:** Feitas no main process (nunca no renderer) — evita expor chave de API no bundle

---

## Success Criteria

- [ ] Usuário consegue gerar avatar de um agente em menos de 30s end-to-end
- [ ] Imagem persiste após fechar e reabrir o app
- [ ] Erro de API é comunicado de forma clara sem crash
