'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SimpleMode } from '@/components/views/SimpleMode';
import { AgendaMode } from '@/components/views/AgendaMode';
import { MixedMode } from '@/components/views/MixedMode';
import { TaskForm } from '@/components/forms/TaskForm';
import { EventForm } from '@/components/forms/EventForm';
import { NotificationAlerts } from '@/components/notifications/NotificationAlert';
import { VoiceAssistantFloating } from '@/components/voice/VoiceAssistantFloating';
import { AlertTriangle, Settings } from 'lucide-react';
import { Task, CalendarEvent } from '@/types/calendar';
import { googleCalendarAPI } from '@/lib/google-api';
import { localStorage } from '@/lib/storage';
import Link from 'next/link';

export default function HomePage() {
  const [viewMode, setViewMode] = useState<'simple' | 'agenda' | 'mixed'>('simple');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | undefined>();
  const [hasCredentials, setHasCredentials] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const checkCredentials = () => {
      setHasCredentials(googleCalendarAPI.hasValidCredentials());
    };

    checkCredentials();
    
    // Carregar modo de visualização salvo
    const settings = localStorage.getSettings();
    if (settings.viewMode) {
      setViewMode(settings.viewMode);
    }
  }, []);

  const handleViewModeChange = (mode: string) => {
    setViewMode(mode as typeof viewMode);
    localStorage.saveSetting('viewMode', mode);
  };

  const handleCreateTask = (date?: Date) => {
    if (date) {
      setEditingTask({
        id: '',
        title: '',
        description: '',
        dueDate: date,
        completed: false,
        priority: 'medium',
        tags: [],
        color: undefined,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } else {
      setEditingTask(undefined);
    }
    setShowTaskForm(true);
  };

  const handleCreateEvent = (date?: Date) => {
    if (date) {
      // Evento padrão: allDay, start e end no mesmo dia
      const start = new Date(date);
      start.setHours(9, 0, 0, 0);
      const end = new Date(date);
      end.setHours(10, 0, 0, 0);
      setEditingEvent({
        id: '',
        title: '',
        description: '',
        start,
        end,
        allDay: false,
        color: undefined,
        status: 'confirmed',
        attendees: [],
        location: '',
      });
    } else {
      setEditingEvent(undefined);
    }
    setShowEventForm(true);
  };

  const handleTaskSubmit = (task: Task) => {
    setShowTaskForm(false);
    setEditingTask(undefined);
    // Disparar uma atualização dos componentes
    window.dispatchEvent(new Event('storage'));
  };

  const handleEventSubmit = (event: CalendarEvent) => {
    setShowEventForm(false);
    setEditingEvent(undefined);
    // Disparar uma atualização dos componentes
    window.dispatchEvent(new Event('storage'));
  };

  const handleTaskCancel = () => {
    setShowTaskForm(false);
    setEditingTask(undefined);
  };

  const handleEventCancel = () => {
    setShowEventForm(false);
    setEditingEvent(undefined);
  };

  const handleRefreshData = () => {
    setRefreshKey(prev => prev + 1);
    // Trigger storage event to refresh all components
    window.dispatchEvent(new Event('storage'));
  };

  const handleTaskCreated = (task: Task) => {
    // Force refresh of all views
    handleRefreshData();
  };

  const handleEventCreated = (event: CalendarEvent) => {
    // Force refresh of all views
    handleRefreshData();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Alertas de notificação no topo */}
      <NotificationAlerts />

      <div className="space-y-8">
        {/* Aviso para credenciais ausentes */}
        {!hasCredentials && (
          <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200 flex items-center justify-between">
              <span>
                <strong>Funcionalidade limitada:</strong> Configure as credenciais da API do Google Calendar 
                para habilitar a sincronização completa do calendário.
              </span>
              <Link href="/config">
                <Button size="sm" variant="outline" className="ml-4">
                  <Settings className="h-4 w-4 mr-2" />
                  Configurar
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Voice Assistant - Fixed Position */}
        <div className="fixed bottom-4 right-4 z-50">
          <VoiceAssistantFloating
            onTaskCreated={handleTaskCreated}
            onEventCreated={handleEventCreated}
            onRefreshData={handleRefreshData}
          />
        </div>

        {/* Conteúdo principal com abas de modo de visualização */}
        <Tabs value={viewMode} onValueChange={handleViewModeChange}>
          <div className="flex items-center justify-between mb-8">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="simple">Simples</TabsTrigger>
              <TabsTrigger value="agenda">Agenda</TabsTrigger>
              <TabsTrigger value="mixed">Misto</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="simple" className="space-y-6 mt-0">
            <SimpleMode 
              key={`simple-${refreshKey}`}
              onCreateTask={handleCreateTask}
              onCreateEvent={handleCreateEvent}
            />
          </TabsContent>

          <TabsContent value="agenda" className="space-y-6 mt-0">
            <AgendaMode 
              key={`agenda-${refreshKey}`}
              onCreateTask={handleCreateTask}
              onCreateEvent={handleCreateEvent}
            />
          </TabsContent>

          <TabsContent value="mixed" className="space-y-6 mt-0">
            <MixedMode 
              key={`mixed-${refreshKey}`}
              onCreateTask={handleCreateTask}
              onCreateEvent={handleCreateEvent}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Diálogo do Formulário de Tarefa */}
      <Dialog open={showTaskForm} onOpenChange={setShowTaskForm}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {editingTask ? 'Editar Tarefa' : 'Criar Nova Tarefa'}
            </DialogTitle>
          </DialogHeader>
          <TaskForm
            task={editingTask}
            onSubmit={handleTaskSubmit}
            onCancel={handleTaskCancel}
          />
        </DialogContent>
      </Dialog>

      {/* Diálogo do Formulário de Evento */}
      <Dialog open={showEventForm} onOpenChange={setShowEventForm}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {editingEvent ? 'Editar Evento' : 'Criar Novo Evento'}
            </DialogTitle>
          </DialogHeader>
          <EventForm
            event={editingEvent}
            onSubmit={handleEventSubmit}
            onCancel={handleEventCancel}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}