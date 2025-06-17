'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { CheckCircle2, AlertTriangle, Settings, Key, Link, Calendar, Mic, Volume2 } from 'lucide-react';
import { GoogleCredentials, VoiceAgentCredentials } from '@/types/calendar';
import { googleCalendarAPI } from '@/lib/google-api';
import { toast } from 'sonner';

const credentialsSchema = z.object({
  clientId: z.string().min(1, 'ID do Cliente é obrigatório'),
  clientSecret: z.string().min(1, 'Chave Secreta do Cliente é obrigatória'),
  redirectUri: z.string().url('Deve ser uma URL válida'),
  calendarId: z.string().optional(),
});

const voiceAgentSchema = z.object({
  endpointUrl: z.string().url('Deve ser uma URL válida'),
  authToken: z.string().optional(),
});

type CredentialsFormData = z.infer<typeof credentialsSchema>;
type VoiceAgentFormData = z.infer<typeof voiceAgentSchema>;

export default function ConfigPage() {
  const [hasCredentials, setHasCredentials] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'connected' | 'error' | null>(null);
  const [loading, setLoading] = useState(false);
  const [redirectUri, setRedirectUri] = useState('https://seu-dominio.com/auth');
  
  // Voice Assistant state
  const [hasVoiceCredentials, setHasVoiceCredentials] = useState(false);
  const [voiceTestStatus, setVoiceTestStatus] = useState<'testing' | 'connected' | 'error' | null>(null);

  const form = useForm<CredentialsFormData>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: {
      clientId: '',
      clientSecret: '',
      redirectUri: typeof window !== 'undefined' ? `${window.location.origin}/auth` : '',
      calendarId: 'primary',
    },
  });

  const voiceForm = useForm<VoiceAgentFormData>({
    resolver: zodResolver(voiceAgentSchema),
    defaultValues: {
      endpointUrl: '',
      authToken: '',
    },
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setRedirectUri(`${window.location.origin}/auth`);
    }

    // Verificar se as credenciais já existem
    const credentialsExist = googleCalendarAPI.hasValidCredentials();
    setHasCredentials(credentialsExist);

    // Check voice agent credentials
    const voiceCredentialsExist = localStorage.getItem('voice_agent_credentials');
    setHasVoiceCredentials(!!voiceCredentialsExist);

    if (credentialsExist) {
      // Pré-preencher formulário com credenciais existentes
      const stored = localStorage.getItem('google_credentials');
      if (stored) {
        const credentials: GoogleCredentials = JSON.parse(stored);
        form.reset({
          clientId: credentials.clientId,
          clientSecret: credentials.clientSecret,
          redirectUri: credentials.redirectUri,
          calendarId: credentials.calendarId || 'primary',
        });
      }
    }

    // Pre-fill voice form if credentials exist
    if (voiceCredentialsExist) {
      const voiceCredentials: VoiceAgentCredentials = JSON.parse(voiceCredentialsExist);
      voiceForm.reset({
        endpointUrl: voiceCredentials.endpointUrl,
        authToken: voiceCredentials.authToken || '',
      });
    }
  }, [form, voiceForm]);

  const handleSaveCredentials = (data: CredentialsFormData) => {
    setLoading(true);
    
    try {
      const credentials: GoogleCredentials = {
        clientId: data.clientId,
        clientSecret: data.clientSecret,
        redirectUri: data.redirectUri,
        calendarId: data.calendarId || 'primary',
      };

      googleCalendarAPI.setCredentials(credentials);
      setHasCredentials(true);
      toast.success('Credenciais salvas com sucesso!');
    } catch (error) {
      console.error('Falha ao salvar credenciais:', error);
      toast.error('Falha ao salvar credenciais');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveVoiceCredentials = (data: VoiceAgentFormData) => {
    try {
      const credentials: VoiceAgentCredentials = {
        endpointUrl: data.endpointUrl,
        authToken: data.authToken || undefined,
      };

      localStorage.setItem('voice_agent_credentials', JSON.stringify(credentials));
      setHasVoiceCredentials(true);
      toast.success('Configurações do Assistente de Voz salvas com sucesso!');
    } catch (error) {
      console.error('Falha ao salvar configurações de voz:', error);
      toast.error('Falha ao salvar configurações de voz');
    }
  };

  const handleTestVoiceConnection = async () => {
    if (!hasVoiceCredentials) {
      toast.error('Salve as configurações de voz primeiro');
      return;
    }

    setVoiceTestStatus('testing');
    
    try {
      const stored = localStorage.getItem('voice_agent_credentials');
      if (!stored) throw new Error('Credenciais não encontradas');
      
      const credentials: VoiceAgentCredentials = JSON.parse(stored);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (credentials.authToken) {
        headers['Authorization'] = `Bearer ${credentials.authToken}`;
      }

      // Test with a simple health check request
      const response = await fetch(credentials.endpointUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          text: 'test connection',
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        setVoiceTestStatus('connected');
        toast.success('Conexão com o assistente de voz funcionando!');
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Teste de conexão de voz falhou:', error);
      setVoiceTestStatus('error');
      toast.error(`Teste de conexão falhou: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  const handleTestConnection = async () => {
    if (!hasCredentials) {
      toast.error('Salve as credenciais primeiro');
      return;
    }

    setConnectionStatus('testing');
    
    try {
      // Tentar obter URL de autorização para testar formato das credenciais
      const authUrl = googleCalendarAPI.getAuthUrl();
      
      // Abrir URL de autorização em nova janela
      window.open(authUrl, '_blank', 'width=500,height=600');
      
      setConnectionStatus('connected');
      toast.success('Abrindo janela de autorização do Google...');
    } catch (error) {
      console.error('Teste de conexão falhou:', error);
      setConnectionStatus('error');
      toast.error('Teste de conexão falhou. Verifique suas credenciais.');
    }
  };

  const clearCredentials = () => {
    localStorage.removeItem('google_credentials');
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_refresh_token');
    setHasCredentials(false);
    setConnectionStatus(null);
    form.reset({
      clientId: '',
      clientSecret: '',
      redirectUri: typeof window !== 'undefined' ? `${window.location.origin}/auth` : '',
      calendarId: 'primary',
    });
    toast.success('Credenciais removidas');
  };

    const clearVoiceCredentials = () => {
    localStorage.removeItem('voice_agent_credentials');
    setHasVoiceCredentials(false);
    setVoiceTestStatus(null);
    voiceForm.reset({
      endpointUrl: '',
      authToken: '',
    });
    toast.success('Configurações de voz removidas');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold flex items-center justify-center space-x-3">
            <Settings className="h-8 w-8" />
            <span>Configurações</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Configure suas credenciais da API do Google Calendar para habilitar a sincronização do calendário
          </p>
        </div>

        {/* Alerta de Status */}
        {!hasCredentials && (
          <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              <strong>Credenciais da API necessárias:</strong> Você precisa configurar as credenciais da API do Google Calendar 
              para sincronizar tarefas e eventos. O app funcionará com funcionalidade limitada até ser configurado.
            </AlertDescription>
          </Alert>
        )}

        {hasCredentials && (
          <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              <strong>Credenciais configuradas:</strong> A integração com o Google Calendar está pronta. 
              Teste a conexão para completar a configuração.
            </AlertDescription>
          </Alert>
        )}

        {/* Instruções de Configuração */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Key className="h-5 w-5" />
              <span>Instruções de Configuração da API do Google</span>
            </CardTitle>
            <CardDescription className="text-base">
              Siga estes passos para obter suas credenciais da API do Google Calendar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="list-decimal list-inside space-y-3 text-sm leading-relaxed">
              <li>
                Vá para o{' '}
                <a
                  href="https://console.cloud.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  Google Cloud Console
                </a>
              </li>
              <li>Crie um novo projeto ou selecione um existente</li>
              <li>
                Habilite a{' '}
                <a
                  href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  API do Google Calendar
                </a>
              </li>
              <li>Vá para &quot;Credenciais&quot; na barra lateral esquerda</li>
              <li>Clique em &quot;Criar Credenciais&quot; → &quot;IDs de cliente OAuth 2.0&quot;</li>
              <li>Escolha &quot;Aplicação web&quot; como tipo de aplicação</li>
              <li>
                Adicione seu URI de redirecionamento: <Badge variant="secondary" className="ml-1 font-mono text-xs">
                  {redirectUri}
                </Badge>
              </li>
              <li>Copie o ID do Cliente e a Chave Secreta do Cliente para o formulário abaixo</li>
            </ol>
          </CardContent>
        </Card>

        {/* Formulário de Credenciais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Link className="h-5 w-5" />
              <span>Credenciais da API</span>
            </CardTitle>
            <CardDescription className="text-base">
              Digite suas credenciais da API do Google Calendar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSaveCredentials)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">ID do Cliente</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Seu ID de Cliente OAuth 2.0 do Google"
                          className="font-mono text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clientSecret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Chave Secreta do Cliente</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Sua Chave Secreta OAuth 2.0 do Google"
                          type="password"
                          className="font-mono text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="redirectUri"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">URI de Redirecionamento</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://seu-dominio.com/auth"
                          className="font-mono text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="calendarId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">ID do Calendário (Opcional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="primary (padrão) ou ID específico do calendário"
                          className="font-mono text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex space-x-3">
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? 'Salvando...' : 'Salvar Credenciais'}
                  </Button>
                  
                  {hasCredentials && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={clearCredentials}
                      className="flex-1"
                    >
                      Limpar Credenciais
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Teste de Conexão */}
        {hasCredentials && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Testar Conexão</span>
              </CardTitle>
              <CardDescription className="text-base">
                Teste sua conexão com a API do Google Calendar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Button
                    onClick={handleTestConnection}
                    disabled={connectionStatus === 'testing'}
                    className="flex items-center space-x-2"
                  >
                    <Calendar className="h-4 w-4" />
                    <span>
                      {connectionStatus === 'testing' ? 'Testando...' : 'Testar Conexão da API do Google'}
                    </span>
                  </Button>

                  {connectionStatus === 'connected' && (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Conectado
                    </Badge>
                  )}

                  {connectionStatus === 'error' && (
                    <Badge variant="destructive">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Erro
                    </Badge>
                  )}
                </div>

                <Alert>
                  <AlertDescription>
                    O teste abrirá uma janela de autorização do Google. Após autorizar, 
                    retorne ao aplicativo principal de calendário para começar a sincronizar seus eventos e tarefas.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Voice Assistant Configuration */}
        <Card id="voice-assistant">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Mic className="h-5 w-5" />
              <span>Assistente de Voz</span>
            </CardTitle>
            <CardDescription className="text-base">
              Configure o endpoint do seu agente de IA (n8n) para processar comandos de voz
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Voice Agent Status Alert */}
            {!hasVoiceCredentials && (
              <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <AlertDescription className="text-amber-800 dark:text-amber-200">
                  <strong>Assistente de voz não configurado:</strong> Configure o endpoint do seu agente de IA 
                  para habilitar comandos de voz para criar tarefas e eventos.
                </AlertDescription>
              </Alert>
            )}

            {hasVoiceCredentials && (
              <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  <strong>Assistente de voz configurado:</strong> O assistente está pronto para processar 
                  comandos de voz. Use Ctrl+Shift+V ou o botão de microfone para ativar.
                </AlertDescription>
              </Alert>
            )}

            {/* Voice Agent Instructions */}
            <div className="p-4 bg-muted/30 rounded-lg">
              <h4 className="font-medium mb-3 flex items-center space-x-2">
                <Volume2 className="h-4 w-4" />
                <span>Como configurar o n8n Voice Agent</span>
              </h4>
              <ol className="list-decimal list-inside space-y-2 text-sm leading-relaxed">
                <li>Configure um workflow no n8n com um webhook trigger</li>
                <li>Adicione um nó de LLM (OpenAI/Claude/etc.) para processar comandos</li>
                <li>Para eventos: configure integração direta com Google Calendar API</li>
                <li>Para tarefas: retorne JSON estruturado para o app processar</li>
                <li>Configure autenticação opcional com bearer token</li>
                <li>Cole o URL do webhook abaixo</li>
              </ol>
            </div>

            {/* Voice Agent Form */}
            <Form {...voiceForm}>
              <form onSubmit={voiceForm.handleSubmit(handleSaveVoiceCredentials)} className="space-y-6">
                <FormField
                  control={voiceForm.control}
                  name="endpointUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">URL do Webhook n8n</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://seu-n8n.com/webhook/voice-agent"
                          className="font-mono text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={voiceForm.control}
                  name="authToken"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Token de Autenticação (Opcional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Bearer token para autenticação"
                          type="password"
                          className="font-mono text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex space-x-3">
                  <Button type="submit" className="flex-1">
                    Salvar Configurações
                  </Button>
                  
                  {hasVoiceCredentials && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={clearVoiceCredentials}
                      className="flex-1"
                    >
                      Limpar Configurações
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Voice Agent Test */}
        {hasVoiceCredentials && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Volume2 className="h-5 w-5" />
                <span>Testar Assistente de Voz</span>
              </CardTitle>
              <CardDescription className="text-base">
                Teste a conectividade com seu agente de IA
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Button
                    onClick={handleTestVoiceConnection}
                    disabled={voiceTestStatus === 'testing'}
                    className="flex items-center space-x-2"
                  >
                    <Mic className="h-4 w-4" />
                    <span>
                      {voiceTestStatus === 'testing' ? 'Testando...' : 'Testar Conexão do Agente'}
                    </span>
                  </Button>

                  {voiceTestStatus === 'connected' && (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Conectado
                    </Badge>
                  )}

                  {voiceTestStatus === 'error' && (
                    <Badge variant="destructive">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Erro
                    </Badge>
                  )}
                </div>

                <div className="p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-medium mb-2">Estrutura de Response Esperada:</h4>
                  <pre className="text-xs bg-background p-3 rounded border overflow-x-auto">
{`{
  "status": "success" | "pending" | "error",
  "type": "event" | "task" | "unknown",
  "action": "created" | "create",
  "message": "Mensagem para o usuário",
  "data": {
    "title": "Nome da tarefa/evento",
    "description": "Descrição opcional",
    "start": "2025-06-17T15:00:00-03:00", // Para eventos
    "end": "2025-06-17T16:00:00-03:00",   // Para eventos
    "dueDate": "2025-06-18T18:00:00-03:00", // Para tarefas
    "priority": "low" | "medium" | "high"    // Para tarefas
  }
}`}
                  </pre>
                </div>

                <Alert>
                  <AlertDescription>
                    <strong>Exemplos de comandos:</strong> &quot;Criar reunião amanhã às 14h&quot;, 
                    &quot;Adicionar tarefa comprar leite para hoje&quot;, &quot;Agendar consulta médica na sexta-feira&quot;
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Configurações Adicionais */}
        <Card>
          <CardHeader>
            <CardTitle>Configurações Adicionais</CardTitle>
            <CardDescription>
              Configure preferências adicionais do aplicativo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Alertas de Notificação</Label>
                  <p className="text-sm text-muted-foreground">
                    Mostrar alertas persistentes para tarefas e eventos próximos
                  </p>
                </div>
                <Badge variant="default">Habilitado</Badge>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Armazenamento Local</Label>
                  <p className="text-sm text-muted-foreground">
                    Armazenar tarefas e eventos em cache localmente para acesso offline
                  </p>
                </div>
                <Badge variant="default">Ativo</Badge>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Frequência de Sincronização</Label>
                  <p className="text-sm text-muted-foreground">
                    Com que frequência sincronizar com o Google Calendar
                  </p>
                </div>
                <Badge variant="secondary">A cada 5 minutos</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}