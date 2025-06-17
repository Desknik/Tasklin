'use client';

import { useState, useEffect } from 'react';
import { SimpleMode } from './SimpleMode';
import { AgendaMode } from './AgendaMode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface MixedModeProps {
  onCreateTask?: (date?: Date) => void;
  onCreateEvent?: (date?: Date) => void;
}

export function MixedMode({ onCreateTask, onCreateEvent }: MixedModeProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (isMobile) {
    // No mobile, empilhar as visualizações verticalmente
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Próximas Tarefas</CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleMode onCreateTask={onCreateTask} onCreateEvent={onCreateEvent} />
          </CardContent>
        </Card>

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Visualização do Calendário</CardTitle>
          </CardHeader>
          <CardContent>
            <AgendaMode onCreateTask={onCreateTask} onCreateEvent={onCreateEvent} />
          </CardContent>
        </Card>
      </div>
    );
  }

  // No desktop/tablet, usar o layout dividido 1/3 - 2/3
  return (
    <div className="grid grid-cols-12 gap-6 h-[calc(100vh-12rem)]">
      {/* Lado esquerdo - Tarefas (1/3) */}
      <div className="col-span-4 overflow-hidden">
        <Card className="h-full">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Próximas Tarefas</CardTitle>
          </CardHeader>
          <CardContent className="overflow-y-auto h-[calc(100%-4rem)]">
            <SimpleMode onCreateTask={onCreateTask} onCreateEvent={onCreateEvent} />
          </CardContent>
        </Card>
      </div>

      {/* Lado direito - Calendário (2/3) */}
      <div className="col-span-8 overflow-hidden">
        <Card className="h-full">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Visualização do Calendário</CardTitle>
          </CardHeader>
          <CardContent className="overflow-y-auto h-[calc(100%-4rem)]">
            <AgendaMode onCreateTask={onCreateTask} onCreateEvent={onCreateEvent} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}