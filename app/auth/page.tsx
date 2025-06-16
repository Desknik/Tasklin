'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertTriangle, Calendar, Loader2 } from 'lucide-react';
import { googleCalendarAPI } from '@/lib/google-api';
import { toast } from 'sonner';

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleAuth = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        setStatus('error');
        setErrorMessage(`Falha na autorização: ${error}`);
        toast.error('Falha na autorização');
        return;
      }

      if (!code) {
        setStatus('error');
        setErrorMessage('Nenhum código de autorização recebido');
        toast.error('Nenhum código de autorização recebido');
        return;
      }

      try {
        setStatus('processing');
        await googleCalendarAPI.exchangeCodeForToken(code);
        setStatus('success');
        toast.success('Conectado ao Google Calendar com sucesso!');
        
        // Redirecionar para o app principal após um breve delay
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } catch (error) {
        console.error('Erro de autenticação:', error);
        setStatus('error');
        setErrorMessage('Falha ao completar a autenticação. Tente novamente.');
        toast.error('Falha na autenticação');
      }
    };

    handleAuth();
  }, [searchParams, router]);

  const goToConfig = () => {
    router.push('/config');
  };

  const goToHome = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {status === 'processing' && (
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            )}
            {status === 'error' && (
              <AlertTriangle className="h-12 w-12 text-red-600" />
            )}
          </div>
          
          <CardTitle className="text-2xl">
            {status === 'processing' && 'Conectando...'}
            {status === 'success' && 'Sucesso!'}
            {status === 'error' && 'Falha na Autenticação'}
          </CardTitle>
          
          <CardDescription className="text-base">
            {status === 'processing' && 'Configurando sua conexão com o Google Calendar'}
            {status === 'success' && 'Seu Google Calendar está conectado'}
            {status === 'error' && 'Houve um problema ao conectar sua conta'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {status === 'processing' && (
            <Alert>
              <Calendar className="h-4 w-4" />
              <AlertDescription>
                Aguarde enquanto completamos o processo de autenticação...
              </AlertDescription>
            </Alert>
          )}

          {status === 'success' && (
            <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                Conectado ao Google Calendar com sucesso! Agora você pode sincronizar seus eventos e tarefas.
                Redirecionando para o aplicativo principal...
              </AlertDescription>
            </Alert>
          )}

          {status === 'error' && (
            <>
              <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800 dark:text-red-200">
                  {errorMessage}
                </AlertDescription>
              </Alert>
              
              <div className="flex space-x-3">
                <Button onClick={goToConfig} variant="outline" className="flex-1">
                  Voltar às Configurações
                </Button>
                <Button onClick={goToHome} className="flex-1">
                  Continuar para o App
                </Button>
              </div>
            </>
          )}

          {status === 'success' && (
            <Button onClick={goToHome} className="w-full">
              Ir para o App de Calendário
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}