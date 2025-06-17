'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Mic, MicOff, Volume2, Square, Settings } from 'lucide-react';
import { useVoiceRecognition } from '@/hooks/use-voice-recognition';
import { VoiceAgentRequest, VoiceAgentResponse, VoiceAgentCredentials, Task, CalendarEvent } from '@/types/calendar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { localStorage } from '@/lib/storage';
import Link from 'next/link';

interface VoiceAssistantFloatingProps {
  onTaskCreated?: (task: Task) => void;
  onEventCreated?: (event: CalendarEvent) => void;
  onRefreshData?: () => void;
}

export function VoiceAssistantFloating({ onTaskCreated, onEventCreated, onRefreshData }: VoiceAssistantFloatingProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastCommand, setLastCommand] = useState<string>('');
  const [showDialog, setShowDialog] = useState(false);
  const [hasProcessedCommand, setHasProcessedCommand] = useState(false);
  const [userStoppedManually, setUserStoppedManually] = useState(false);
  const [hasAutoStarted, setHasAutoStarted] = useState(false);
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

  const credentials = getVoiceAgentCredentials();
  const hasCredentials = !!credentials?.endpointUrl;  const processVoiceCommand = useCallback(async (text: string) => {
    if (!text.trim()) {
      console.log('❌ processVoiceCommand: texto vazio');
      return;
    }

    console.log('🎤 processVoiceCommand iniciado com texto:', text);

    const credentials = getVoiceAgentCredentials();
    console.log('🔑 Credenciais obtidas:', credentials);
    
    if (!credentials?.endpointUrl) {
      console.log('❌ Sem credenciais ou endpoint URL');
      toast.error('Assistente de voz não configurado. Vá para Configurações para configurar.');
      return;
    }

    setIsProcessing(true);
    setLastCommand(text);
    
    try {
      const request: VoiceAgentRequest = {
        text: text.trim(),
        timestamp: new Date().toISOString(),
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (credentials.authToken) {
        headers['Authorization'] = `Bearer ${credentials.authToken}`;
      }

      console.log('📡 Enviando request DIRETO para webhook n8n:', credentials.endpointUrl, { request, headers });

      const response = await fetch(credentials.endpointUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
      });

      console.log('📨 Response recebido do n8n:', response.status, response.statusText);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: VoiceAgentResponse = await response.json();
      console.log('📋 Result parsed do n8n:', result);

      // Show persistent notification using Sonner
      if (result.status === 'success') {
        if (result.type === 'event' && result.action === 'created') {
          // Event was created by the agent
          toast.success(result.message, {
            duration: 10000,
            action: {
              label: 'Fechar',
              onClick: () => {},
            },
          });
          
          onRefreshData?.();
          
        } else if (result.type === 'task' && result.action === 'create' && result.data) {
          // Create task locally
          const taskData = {
            id: crypto.randomUUID(),
            title: result.data.title || '',
            description: result.data.description || '',
            dueDate: result.data.dueDate ? new Date(result.data.dueDate) : undefined,
            priority: result.data.priority || 'medium',
            completed: false,
            status: 'pending' as const,
            tags: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          const newTask = localStorage.addTask(taskData);
          onTaskCreated?.(newTask);
          
          toast.success(result.message, {
            duration: 10000,
            action: {
              label: 'Fechar',
              onClick: () => {},
            },
          });
        }
      } else if (result.status === 'pending' && result.type === 'task' && result.data) {
        // Task data parsed, create locally
        const taskData = {
          id: crypto.randomUUID(),
          title: result.data.title || '',
          description: result.data.description || '',
          dueDate: result.data.dueDate ? new Date(result.data.dueDate) : undefined,
          priority: result.data.priority || 'medium',
          completed: false,
          status: 'pending' as const,
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const newTask = localStorage.addTask(taskData);
        onTaskCreated?.(newTask);
        
        toast.success(`Tarefa criada: ${taskData.title}`, {
          duration: 8000,
          action: {
            label: 'Fechar',
            onClick: () => {},
          },
        });
      } else if (result.status === 'error') {
        toast.error(result.message, {
          duration: 8000,
          action: {
            label: 'Tentar Novamente',
            onClick: () => processVoiceCommand(text),
          },
        });
      } else {
        toast.info(result.message, {
          duration: 6000,
          action: {
            label: 'Fechar',
            onClick: () => {},
          },
        });
      }    } catch (error) {
      console.error('❌ Voice command processing error:', error);
      toast.error('Erro ao processar comando de voz. Tente novamente.', {
        duration: 6000,
        action: {
          label: 'Tentar Novamente',
          onClick: () => processVoiceCommand(text),
        },
      });
    } finally {
      console.log('🏁 processVoiceCommand finalizado');
      setIsProcessing(false);
      resetTranscript();
    }
  }, [onTaskCreated, onRefreshData, resetTranscript]);

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
    // Don't process here - let the useEffect handle it automatically
  }, [stopListening]);

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
    }  }, [handleToggleListening]);  // Auto-start listening when dialog opens (only once)
  useEffect(() => {
    if (showDialog && hasCredentials && isSupported && !isListening && !isProcessing && !hasProcessedCommand && !hasAutoStarted) {
      console.log('🚀 Auto-starting listening on dialog open');
      setHasAutoStarted(true);
      // Small delay to ensure dialog is fully open
      const timer = setTimeout(() => {
        handleStartListening();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [showDialog, hasCredentials, isSupported, isListening, isProcessing, hasProcessedCommand, hasAutoStarted, handleStartListening]);  // Auto-process transcript when speech recognition ends naturally
  useEffect(() => {
    console.log('📝 Auto-process useEffect triggered:', {
      isListening,
      transcript: transcript.trim(),
      isProcessing,
      hasProcessedCommand,
      userStoppedManually
    });
    
    // When listening stops and we have a transcript, process it automatically
    // BUT only if user didn't stop manually
    if (!isListening && transcript.trim() && !isProcessing && !hasProcessedCommand && !userStoppedManually) {
      console.log('✅ Conditions met, will process command in 500ms:', transcript);
      
      // Don't set hasProcessedCommand here - do it inside the timer
      const timer = setTimeout(async () => {
        console.log('⏰ Timer executed, calling processVoiceCommand');
        try {
          await processVoiceCommand(transcript);
          console.log('✅ processVoiceCommand completed, setting hasProcessedCommand to true');
          setHasProcessedCommand(true);
        } catch (error) {
          console.error('❌ Error in processVoiceCommand:', error);
          setHasProcessedCommand(true); // Still set to true to prevent retries
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isListening, transcript, isProcessing, hasProcessedCommand, userStoppedManually, processVoiceCommand]);

  // Reset processed command flag when dialog closes
  useEffect(() => {
    if (!showDialog) {
      setHasProcessedCommand(false);
      setUserStoppedManually(false);
      setHasAutoStarted(false);
      resetTranscript();
    }
  }, [showDialog, resetTranscript]);

  if (!isSupported) {
    return null; // Don't show anything if not supported
  }

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className={cn(
            "rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-all duration-200",
            !hasCredentials && "opacity-50",
            isListening && "animate-pulse bg-red-500 hover:bg-red-600",
            isProcessing && "animate-spin"
          )}
          disabled={!hasCredentials}
          onClick={(e) => {
            if (!hasCredentials) {
              e.preventDefault();
              toast.error('Configure o assistente de voz nas Configurações primeiro');
              return;
            }
            setShowDialog(true);
          }}
        >
          {isListening ? (
            <MicOff className="h-6 w-6" />
          ) : isProcessing ? (
            <Volume2 className="h-6 w-6" />
          ) : (
            <Mic className="h-6 w-6" />
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Volume2 className="h-5 w-5" />
              <span>Assistente de Voz</span>
            </div>
            <Link href="/config#voice-assistant">
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </DialogTitle>          <DialogDescription>
            Fale naturalmente para criar tarefas e eventos. O processamento acontece automaticamente quando você parar de falar.
            <br />
            <span className="text-xs">Atalho: Ctrl+Shift+V</span>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">          {/* Status and Controls */}
          <div className="flex items-center justify-between">            <Badge
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
                    setUserStoppedManually(false);
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
          </div>{/* Transcript Display */}
          {(transcript || interimTranscript) && (
            <div className="min-h-[80px] p-3 bg-muted rounded-lg">
              <p className="text-sm">
                <span className="font-medium text-foreground">{transcript}</span>
                <span className="text-muted-foreground italic">{interimTranscript}</span>
              </p>
              {transcript && !isListening && !isProcessing && (
                <p className="text-xs text-primary mt-2">Processando comando...</p>
              )}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
