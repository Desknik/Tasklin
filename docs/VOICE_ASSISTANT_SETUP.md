# Voice Assistant - Guia de Configuração n8n

Este guia explica como configurar um agente de IA no n8n para processar comandos de voz do FocusBoard.

## 📋 Pré-requisitos

- Instância do n8n configurada e funcionando
- Acesso a um LLM (OpenAI GPT, Claude, etc.)
- Credenciais da API do Google Calendar (para criação automática de eventos)

## 🔧 Configuração do Workflow n8n

### 1. Webhook Trigger

Crie um novo workflow com um nó **Webhook**:

```json
{
  "httpMethod": "POST",
  "path": "voice-agent",
  "authentication": "none"
}
```

### 2. LLM Processing Node

Adicione um nó **OpenAI** (ou seu LLM preferido) com o seguinte prompt:

```
Você é um assistente de produtividade que processa comandos de voz para criar tarefas e eventos de calendário.

Analise o comando do usuário e determine:
1. Se é para criar uma TAREFA (task) ou EVENTO (event)
2. Extraia informações relevantes (título, data, hora, descrição, prioridade)

REGRAS:
- Para EVENTOS: você deve criar diretamente via Google Calendar API e retornar status "success"
- Para TAREFAS: retorne os dados estruturados com status "pending" para o app processar
- Para comandos não reconhecidos: retorne status "error"

FORMATO DE RESPOSTA (JSON):

Para evento criado automaticamente:
{
  "status": "success",
  "type": "event", 
  "action": "created",
  "message": "Evento 'Reunião' criado para 17/06 às 15h",
  "data": {
    "id": "event123",
    "summary": "Reunião",
    "start": "2025-06-17T15:00:00-03:00",
    "end": "2025-06-17T16:00:00-03:00"
  }
}

Para tarefa a ser criada pelo app:
{
  "status": "pending",
  "type": "task",
  "action": "create", 
  "message": "Tarefa processada e pronta para criar",
  "data": {
    "title": "Comprar leite",
    "description": "",
    "dueDate": "2025-06-18T18:00:00-03:00",
    "priority": "medium"
  }
}

Para erro:
{
  "status": "error",
  "type": "unknown",
  "message": "Não consegui entender o comando. Tente novamente."
}

COMANDO DO USUÁRIO: {{ $json.text }}
DATA/HORA ATUAL: {{ $json.timestamp }}
```

### 3. Conditional Logic

Adicione um nó **IF** para verificar se é um evento ou tarefa:

```javascript
// Condição: {{ $json.type === 'event' }}
```

### 4A. Google Calendar Integration (para eventos)

Se for um evento, adicione nó **Google Calendar**:

- Operação: `Create Event`
- Calendar ID: `primary`
- Summary: `{{ $json.data.title }}`
- Start: `{{ $json.data.start }}`
- End: `{{ $json.data.end }}`

### 4B. Response Formatting (para tarefas)

Se for uma tarefa, retorne o JSON estruturado diretamente.

### 5. Response Node

Configure a resposta final:

```json
{
  "headers": {
    "Content-Type": "application/json"
  },
  "body": "{{ $json }}"
}
```

## 🎯 Exemplos de Comandos Suportados

### Eventos (processados automaticamente)
- "Criar reunião amanhã às 14h"
- "Agendar consulta médica na sexta-feira às 10h"
- "Marcar almoço com cliente terça às 12h30"

### Tarefas (processadas pelo app)
- "Adicionar tarefa comprar leite para hoje"
- "Criar tarefa revisar relatório com prioridade alta"
- "Lembrar de ligar para João amanhã"

## 🔐 Configuração de Autenticação (Opcional)

Para adicionar autenticação, configure o webhook com:

```json
{
  "authentication": "headerAuth",
  "headerAuth": {
    "name": "Authorization",
    "value": "Bearer seu-token-aqui"
  }
}
```

## ⚙️ Configuração no FocusBoard

1. Vá para **Configurações** → **Assistente de Voz**
2. Cole a URL do webhook: `https://seu-n8n.com/webhook/voice-agent`
3. (Opcional) Adicione o token de autenticação
4. Teste a conexão

## 🐛 Solução de Problemas

### Webhook não responde
- Verifique se o workflow está ativo
- Confirme a URL do webhook
- Teste diretamente no n8n

### LLM não processa corretamente
- Ajuste o prompt para ser mais específico
- Teste com exemplos diferentes
- Verifique os tokens/créditos da API

### Google Calendar não cria eventos
- Verifique as credenciais do Google Calendar no n8n
- Confirme permissões da API
- Teste criação manual de eventos

## 📝 Logs e Monitoramento

Configure logs no n8n para monitorar:
- Comandos recebidos
- Respostas do LLM
- Eventos criados no Google Calendar
- Erros de processamento

## 🚀 Exemplo de Workflow Completo

```json
{
  "name": "Voice Assistant Workflow",
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "position": [240, 300]
    },
    {
      "name": "OpenAI",
      "type": "n8n-nodes-base.openAi", 
      "position": [460, 300]
    },
    {
      "name": "IF",
      "type": "n8n-nodes-base.if",
      "position": [680, 300]
    },
    {
      "name": "Google Calendar",
      "type": "n8n-nodes-base.googleCalendar",
      "position": [900, 180]
    },
    {
      "name": "Response",
      "type": "n8n-nodes-base.respondToWebhook",
      "position": [1120, 300]
    }
  ],
  "connections": {
    "Webhook": {
      "main": [["OpenAI"]]
    },
    "OpenAI": {
      "main": [["IF"]]
    },
    "IF": {
      "main": [
        ["Google Calendar"],
        ["Response"]
      ]
    },
    "Google Calendar": {
      "main": [["Response"]]
    }
  }
}
```

Este workflow básico pode ser expandido conforme suas necessidades específicas.
