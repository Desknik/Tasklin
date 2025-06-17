'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Mic, MicOff, Volume2, Square, Settings, Loader2, MessageSquare } from 'lucide-react';
import { useVoiceRecognition } from '@/hooks/use-voice-recognition';
import { VoiceAgentRequest, VoiceAgentResponse, VoiceAgentCredentials, Task, CalendarEvent } from '@/types/calendar';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { localStorage } from '@/lib/storage';
import { handleAIResponse } from '@/lib/voice-response-handler';
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
  const [showModalButton, setShowModalButton] = useState(false);
  
  // Para controlar o long press
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const [isLongPress, setIsLongPress] = useState(false);
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

      console.log('📨 Response recebido do n8n:', response.status, response.statusText);      if (!response.ok) {
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
          // For now, just show the info in console
          toast.info(`Preciso de mais informações: ${meta.missing.join(', ')}`, {
            duration: 8000,
            action: {
              label: 'OK',
              onClick: () => {},
            },
          });
        }
      });} catch (error) {
      console.error('❌ Voice command processing error:', error);
      toast.error('Erro ao processar comando de voz. Tente novamente.', {
        duration: 6000,
        action: {
          label: 'Tentar Novamente',
          onClick: () => processVoiceCommand(text),
        },
      });    } finally {
      console.log('🏁 processVoiceCommand finalizado');
      setIsProcessing(false);
      resetTranscript();
      // Esconder o botão modal após processar
      setShowModalButton(false);
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
    // Mostrar o botão modal após parar de gravar
    setShowModalButton(true);
  }, [stopListening]);
  // Auto-process when speech ends and we have transcript
  const handleToggleListening = useCallback(() => {
    if (isListening) {
      handleStopListening();
    } else {
      console.log('🎤 User manually started listening');
      setUserStoppedManually(false);
      setHasProcessedCommand(false);
      setShowModalButton(false);
      handleStartListening();
    }
  }, [isListening, handleStartListening, handleStopListening]);

  // Handlers para long press
  const handleMouseDown = useCallback(() => {
    if (!hasCredentials) {
      toast.error('Configure o assistente de voz nas Configurações primeiro');
      return;
    }

    setIsLongPress(false);
    pressTimer.current = setTimeout(() => {
      console.log('🔗 Long press detected - opening modal');
      setIsLongPress(true);
      setShowDialog(true);
    }, 800); // 800ms para long press
  }, [hasCredentials]);

  const handleMouseUp = useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }

    // Se não foi long press, toggle listening
    if (!isLongPress && hasCredentials) {
      console.log('👆 Short press detected - toggle listening');
      handleToggleListening();
    }
    
    setIsLongPress(false);
  }, [isLongPress, hasCredentials, handleToggleListening]);

  const handleMouseLeave = useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    setIsLongPress(false);
  }, []);

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
      setShowModalButton(false);
      resetTranscript();
    }
  }, [showDialog, resetTranscript]);

  // Esconder botão modal após um tempo
  useEffect(() => {
    if (showModalButton && !isListening && !isProcessing) {
      const timer = setTimeout(() => {
        setShowModalButton(false);
      }, 8000); // 8 segundos
      return () => clearTimeout(timer);
    }
  }, [showModalButton, isListening, isProcessing]);
  if (!isSupported) {
    return null; // Don't show anything if not supported
  }

  const getButtonIcon = () => {
    if (isProcessing) {
      return <Loader2 className="h-6 w-6 animate-spin" />;
    }
    
    if (isListening) {
      return <MicOff className="h-6 w-6" />;
    }
    
    return <Mic className="h-6 w-6" />;
  };

  return (
    <div className="fixed bottom-6 right-6 flex flex-col items-end space-y-2 z-50">
      {/* Botão para abrir modal - aparece após gravação */}
      {showModalButton && (
        <Button
          size="sm"
          variant="secondary"
          className="rounded-full shadow-lg animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
          onClick={() => setShowDialog(true)}
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Ver Detalhes
        </Button>
      )}

      {/* Botão principal de gravação */}
      <Button
        size="lg"
        variant="outline"
        className={cn(
          "rounded-full shadow-lg hover:shadow-xl transition-all duration-200",
          !hasCredentials && "opacity-50",
          isListening && "animate-pulse bg-red-500 hover:bg-red-600 text-white border-red-500",
          isProcessing && "bg-blue-500 hover:bg-blue-600 text-white border-blue-500"
        )}
        disabled={!hasCredentials}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
      >
        {getButtonIcon()}
      </Button>

      {/* Modal Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
      
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
            <br />            <span className="text-xs">Atalho: Ctrl+Shift+V | Segurar botão: Abrir modal</span>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Status and Controls */}
          <div className="flex items-center justify-between">
            <Badge
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
          </div>

          {/* Transcript Display */}
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
            <p><strong>Como usar:</strong></p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li><strong>Clique rápido:</strong> Iniciar/parar gravação</li>
              <li><strong>Segurar botão:</strong> Abrir este modal</li>
              <li><strong>Ctrl+Shift+V:</strong> Atalho de teclado</li>
            </ul>
            <p className="mt-2"><strong>Exemplos de comandos:</strong></p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li>&quot;Criar reunião amanhã às 14h&quot;</li>
              <li>&quot;Adicionar tarefa comprar leite para hoje&quot;</li>
              <li>&quot;Agendar consulta médica na sexta&quot;</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </div>
  );
}
