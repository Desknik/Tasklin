'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, MicOff, Volume2, Square, Settings } from 'lucide-react';
import { useVoiceRecognition } from '@/hooks/use-voice-recognition';
import { VoiceAgentRequest, VoiceAgentResponse, VoiceAgentCredentials, Task, CalendarEvent } from '@/types/calendar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { localStorage } from '@/lib/storage';
import { handleAIResponse } from '@/lib/voice-response-handler';
import { googleCalendarAPI } from '@/lib/google-api';
import Link from 'next/link';

interface VoiceAssistantProps {
  onTaskCreated?: (task: Task) => void;
  onEventCreated?: (event: CalendarEvent) => void;
  onRefreshData?: () => void;
}

export function VoiceAssistant({ onTaskCreated, onEventCreated, onRefreshData }: VoiceAssistantProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastCommand, setLastCommand] = useState<string>('');
  const [hasProcessedCommand, setHasProcessedCommand] = useState(false);
  const [userStoppedManually, setUserStoppedManually] = useState(false);
  
  const {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceRecognition();

  const getVoiceAgentCredentials = (): VoiceAgentCredentials | null => {
    if (typeof window === 'undefined') return null;
    
    const stored = window.localStorage.getItem('voice_agent_credentials');
    return stored ? JSON.parse(stored) : null;
  };

  const processVoiceCommand = useCallback(async (text: string) => {
    if (!text.trim()) return;

    const credentials = getVoiceAgentCredentials();
    if (!credentials?.endpointUrl) {
      toast.error('Assistente de voz não configurado. Vá para Configurações para configurar.');
      return;
    }

    setIsProcessing(true);
    setLastCommand(text);
    
    try {
      const request: VoiceAgentRequest = {
        text: text.trim(),
        timestamp: new Date().toISOString(),
      };      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (credentials.authToken) {
        headers['Authorization'] = `Bearer ${credentials.authToken}`;
      }      const response = await fetch(credentials.endpointUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();
      console.log('📋 Full response from n8n:', responseData);
      
      // Extract the actual response from the wrapper
      const result: VoiceAgentResponse = responseData.response || responseData;
      console.log('📋 Extracted result:', result);

      // Use the new AI response handler
      handleAIResponse(result, {
        onTaskCreated,
        onEventCreated,
        onRefreshData,
        onNeedsInfo: (meta) => {
          console.log('📝 Needs more info:', meta);
          // TODO: Implement modal or form to collect missing information
          toast.info(`Preciso de mais informações: ${meta.missing.join(', ')}`, {
            duration: 8000,
            action: {
              label: 'OK',
              onClick: () => {},
            },
          });
        }
      });

    } catch (error) {
      console.error('Voice command processing error:', error);
      toast.error('Erro ao processar comando de voz. Tente novamente.', {
        duration: 6000,
        action: {
          label: 'Tentar Novamente',
          onClick: () => processVoiceCommand(text),
        },
      });    } finally {
      setIsProcessing(false);
      resetTranscript();
    }
  }, [onTaskCreated, onEventCreated, onRefreshData, resetTranscript]);

  const handleStartListening = useCallback(() => {
    if (!isSupported) {
      toast.error('Reconhecimento de voz não suportado neste navegador');
      return;
    }

    const credentials = getVoiceAgentCredentials();
    if (!credentials?.endpointUrl) {
      toast.error('Configure o assistente de voz nas Configurações primeiro');
      return;
    }

    startListening();
  }, [isSupported, startListening]);  const handleStopListening = useCallback(() => {
    console.log('🛑 User manually stopped listening');
    setUserStoppedManually(true);
    stopListening();
    
    // Process the final transcript if it exists and hasn't been processed yet
    if (transcript.trim() && !hasProcessedCommand) {
      processVoiceCommand(transcript).then(() => {
        setHasProcessedCommand(true);
      });
    }
  }, [stopListening, transcript, hasProcessedCommand, processVoiceCommand]);

  // Auto-process when speech ends and we have transcript
  const handleToggleListening = useCallback(() => {
    if (isListening) {
      handleStopListening();
    } else {
      console.log('🎤 User manually started listening');
      setUserStoppedManually(false);
      setHasProcessedCommand(false);
      handleStartListening();
    }
  }, [isListening, handleStartListening, handleStopListening]);
  // Handle keyboard shortcut (Ctrl+Shift+V)
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'V') {
        event.preventDefault();
        handleToggleListening();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, [handleToggleListening]);

  if (!isSupported) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MicOff className="h-5 w-5 text-muted-foreground" />
            <span>Assistente de Voz</span>
          </CardTitle>
          <CardDescription>
            Reconhecimento de voz não suportado neste navegador
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Para usar o assistente de voz, use um navegador moderno como Chrome, Edge ou Safari.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Volume2 className="h-5 w-5" />
            <span>Assistente de Voz</span>
          </div>
          <Link href="/config#voice-assistant">
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
        </CardTitle>
        <CardDescription>
          Fale naturalmente para criar tarefas e eventos
          <br />
          <span className="text-xs">Atalho: Ctrl+Shift+V</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">        {/* Status and Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">            <Badge
              variant={
                isListening ? 'default' : 
                isProcessing ? 'secondary' : 
                error ? 'destructive' : 'outline'
              }
              className={cn(
                isListening && 'animate-pulse'
              )}
            >
              {isListening ? 'Ouvindo...' : 
               isProcessing ? 'Processando...' : 
               error ? 'Erro' : 'Pronto'}
            </Badge>
          </div>
            <div className="flex items-center space-x-2">
            {/* Só mostra o botão principal se não processou comando */}
            {!hasProcessedCommand && (
              <Button
                onClick={handleToggleListening}
                disabled={isProcessing}
                variant={isListening ? 'destructive' : 'default'}
                size="sm"
                className="flex items-center space-x-2"
              >
                {isListening ? (
                  <>
                    <Square className="h-4 w-4" />
                    <span>Parar</span>
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4" />
                    <span>Falar</span>
                  </>
                )}
              </Button>
            )}
            
            {/* Só mostra o botão "Novo Comando" após processar */}
            {hasProcessedCommand && !isListening && !isProcessing && (
              <Button
                onClick={() => {
                  setHasProcessedCommand(false);
                  resetTranscript();
                  handleStartListening();
                }}
                variant="default"
                size="sm"
                className="flex items-center space-x-2"
              >
                <Mic className="h-4 w-4" />
                <span>Novo Comando</span>
              </Button>
            )}
          </div>
        </div>

        {/* Transcript Display */}
        {(transcript || interimTranscript) && (
          <div className="min-h-[80px] p-3 bg-muted rounded-lg">
            <p className="text-sm">
              <span className="font-medium text-foreground">{transcript}</span>
              <span className="text-muted-foreground italic">{interimTranscript}</span>
            </p>
          </div>
        )}

        {/* Last Command */}
        {lastCommand && !isListening && !isProcessing && (
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Último comando:</p>
            <p className="text-sm">{lastCommand}</p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
            <Button
              onClick={() => {
                resetTranscript();
                window.location.reload(); // Reset speech recognition
              }}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              Tentar Novamente
            </Button>
          </div>
        )}

        {/* Usage Tips */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Exemplos de comandos:</strong></p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>&quot;Criar reunião amanhã às 14h&quot;</li>
            <li>&quot;Adicionar tarefa comprar leite para hoje&quot;</li>
            <li>&quot;Agendar consulta médica na sexta&quot;</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
