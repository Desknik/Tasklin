# Tasklin - Integração com Google Calendar

Um aplicativo de calendário e gerenciamento de tarefas auto-hospedado projetado para telas touchscreen Raspberry Pi, com sincronização do Google Calendar e múltiplos modos de visualização.

## Recursos

### 🗓️ Múltiplos Modos de Visualização
- **Modo Simples**: Lista limpa de tarefas com abas Hoje/Semana/Mês
- **Modo Agenda**: Calendário visual com visualizações Mês/Semana/Dia
- **Modo Misto**: Layout de tela dividida combinando ambas as visualizações
- **Quadro Kanban**: Gerenciamento de tarefas com arrastar e soltar

### 🔄 Integração com Google Calendar
- Autenticação OAuth2 com Google
- Sincronização bidirecional (leitura/escrita)
- Funcionalidade offline com cache local
- Configuração manual de credenciais (sem variáveis de ambiente)

### 📱 Otimizado para TouchScreen
- Elementos de interface grandes e amigáveis ao toque
- Design responsivo para telas de 7-11 polegadas
- Otimizado para displays Raspberry Pi
- Suporte a temas escuro e claro

### 🔔 Notificações Inteligentes
- Alertas persistentes para tarefas/eventos próximos
- Avisos com 30 minutos de antecedência
- Sistema de dispensa manual
- Notificações toast não intrusivas

### 🎤 Assistente de Voz
- Reconhecimento de voz com Web Speech API
- Integração com agentes de IA (n8n + LLM)
- Criação automática de eventos via Google Calendar
- Processamento local de tarefas
- Atalho de teclado (Ctrl+Shift+V)
- Suporte a comandos em português brasileiro

### 📋 Gerenciamento de Tarefas
- Criar, editar e excluir tarefas
- Níveis de prioridade e tags
- Rastreamento de data de vencimento com indicadores de status
- Organização Kanban com arrastar e soltar

## Início Rápido

### Implantação Docker (Recomendado)

1. **Clone o repositório:**
   ```bash
   git clone <url-do-repositório>
   cd Tasklin-calendario
   ```

2. **Inicie com Docker Compose:**
   ```bash
   docker-compose up -d
   ```

3. **Acesse o aplicativo:**
   - Abra http://localhost:3000 no seu navegador
   - Vá para Configurações para configurar as credenciais da API do Google Calendar

### Instalação Manual

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Construa o aplicativo:**
   ```bash
   npm run build
   ```

3. **Inicie o servidor de produção:**
   ```bash
   npm start
   ```

## Configuração do Google Calendar

### 1. Criar Projeto Google Cloud
1. Vá para o [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Habilite a [API do Google Calendar](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com)

### 2. Criar Credenciais OAuth
1. Navegue para "Credenciais" na barra lateral
2. Clique em "Criar Credenciais" → "IDs de cliente OAuth 2.0"
3. Escolha "Aplicação web"
4. Adicione URI de redirecionamento autorizado: `http://seu-dominio:3000/auth`
5. Copie o ID do Cliente e a Chave Secreta do Cliente

### 3. Configurar no App
1. Abra o app e vá para Configurações
2. Digite suas credenciais da API do Google
3. Teste a conexão
4. Autorize quando solicitado

## Configuração

### Variáveis de Ambiente
O app usa armazenamento local em vez de variáveis de ambiente por segurança:
- Credenciais são armazenadas no localStorage do navegador
- Configurações persistem entre sessões
- Nenhum arquivo de configuração do servidor necessário

### Otimização para Raspberry Pi
- Projetado para telas touchscreen de 7-11 polegadas
- Tamanhos de fonte mínimos de 16px
- Alvos de toque grandes (mínimo 44px)
- Otimizado para processadores ARM

## Arquitetura

### Frontend
- **Next.js 14** com App Router
- **TypeScript** para segurança de tipos
- **Tailwind CSS** para estilização
- **Shadcn/UI** biblioteca de componentes

### Armazenamento de Dados
- **Armazenamento Local** para tarefas e configurações
- **IndexedDB** para eventos de calendário em cache
- **API do Google Calendar** para sincronização na nuvem

### Componentes Principais
- `SimpleMode`: Visualização de lista de tarefas com filtragem por data
- `AgendaMode`: Grade de calendário com detalhes de evento em popover
- `MixedMode`: Tela dividida combinando ambas as visualizações
- `KanbanBoard`: Organização de tarefas com arrastar e soltar
- `NotificationAlerts`: Sistema de lembrete persistente

## Integração da API

### API do Google Calendar
```typescript
// Exemplo de uso
const events = await googleCalendarAPI.getEvents(startDate, endDate);
const newEvent = await googleCalendarAPI.createEvent(eventData);
```

### Armazenamento Local
```typescript
// Gerenciamento de tarefas
const tasks = localStorage.getTasks();
const newTask = localStorage.addTask(taskData);
localStorage.updateTask(taskId, updates);
```

## Desenvolvimento

### Pré-requisitos
- Node.js 18+
- npm ou yarn
- Navegador moderno com suporte ao localStorage

### Servidor de Desenvolvimento
```bash
npm run dev
```

### Construção para Produção
```bash
npm run build
npm start
```

### Desenvolvimento Docker
```bash
docker-compose -f docker-compose.dev.yml up
```

## Opções de Implantação

### Raspberry Pi
1. Instale Docker no Raspberry Pi OS
2. Clone o repositório e execute docker-compose
3. Acesse via IP da rede local
4. Configure proxy reverso se necessário

### Servidor Doméstico
- Compatível com qualquer servidor Linux
- Suporta arquiteturas ARM e x64
- Pode executar atrás de proxy reverso (nginx, Caddy)
- HTTPS recomendado para OAuth do Google

### Implantação na Nuvem
- Funciona em qualquer provedor de nuvem
- Requer HTTPS para OAuth do Google
- Atualize URIs de redirecionamento no Google Console

## Solução de Problemas

### Problemas Comuns

**Google Calendar não sincronizando:**
- Verifique credenciais da API nas Configurações
- Verifique se o URI de redirecionamento corresponde exatamente
- Certifique-se de que a API do Calendar está habilitada no Google Console

**Interface touch não responsiva:**
- Verifique a meta tag viewport
- Verifique propriedades CSS touch-action
- Teste em dispositivo touchscreen real

**Container Docker não iniciando:**
- Verifique disponibilidade da porta 3000
- Verifique versões do Docker e docker-compose
- Verifique logs do container: `docker logs Tasklin-calendario`

### Dicas de Performance
- Use rede local para melhor performance
- Habilite aceleração de hardware no Raspberry Pi
- Considere usar armazenamento SSD para melhor I/O

## Contribuindo

1. Faça fork do repositório
2. Crie branch de feature: `git checkout -b nome-da-feature`
3. Commit das mudanças: `git commit -am 'Adicionar feature'`
4. Push para o branch: `git push origin nome-da-feature`
5. Envie pull request

## Licença

Licença MIT - veja arquivo LICENSE para detalhes

## Suporte

Para problemas e questões:
1. Verifique a seção de solução de problemas
2. Pesquise issues existentes no GitHub
3. Crie nova issue com descrição detalhada
4. Inclua informações do sistema e logs

---

**Tasklin** - Tornando o gerenciamento de calendário simples e acessível para todos.