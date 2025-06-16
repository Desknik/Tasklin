'use client';

import { useState, useEffect } from 'react';
import { format, isToday, isThisWeek, isThisMonth, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, AlertTriangle, Calendar, Plus } from 'lucide-react';
import { Task, CalendarEvent } from '@/types/calendar';
import { localStorage } from '@/lib/storage';
import { googleCalendarAPI } from '@/lib/google-api';
import { cn } from '@/lib/utils';

interface SimpleModeProps {
  onCreateTask?: () => void;
  onCreateEvent?: () => void;
}

export function SimpleMode({ onCreateTask, onCreateEvent }: SimpleModeProps) {
  const [activeTab, setActiveTab] = useState<'today' | 'week' | 'month'>('today');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Carregar tarefas do armazenamento local
      const localTasks = localStorage.getTasks();
      setTasks(localTasks);

      // Tentar carregar eventos do Google Calendar
      if (googleCalendarAPI.hasValidCredentials()) {
        const now = new Date();
        const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 dias
        const calendarEvents = await googleCalendarAPI.getEvents(now, endDate);
        setEvents(calendarEvents);
        localStorage.saveCachedEvents(calendarEvents);
      } else {
        // Fallback para eventos em cache
        const cachedEvents = localStorage.getCachedEvents();
        setEvents(cachedEvents);
      }
    } catch (error) {
      console.error('Falha ao carregar dados:', error);
      // Fallback para dados em cache
      const cachedEvents = localStorage.getCachedEvents();
      setEvents(cachedEvents);
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskComplete = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const updatedTask = localStorage.updateTask(taskId, {
      completed: !task.completed,
      status: !task.completed ? 'completed' : localStorage.calculateTaskStatus(task),
    });

    if (updatedTask) {
      setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
    }
  };

  const getFilteredItems = () => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (activeTab) {
      case 'today':
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        break;
      case 'week':
        startDate = startOfWeek(now);
        endDate = endOfWeek(now);
        break;
      case 'month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
    }

    const filteredTasks = tasks.filter(task => {
      if (!task.dueDate) return activeTab === 'month'; // Mostrar tarefas sem data de vencimento na visualização mensal
      const dueDate = new Date(task.dueDate);
      return dueDate >= startDate && dueDate <= endDate;
    });

    const filteredEvents = events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate >= startDate && eventDate <= endDate;
    });

    // Combinar e agrupar por data
    const groupedItems: { [date: string]: { tasks: Task[]; events: CalendarEvent[] } } = {};

    filteredTasks.forEach(task => {
      const dateKey = task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : 'no-date';
      if (!groupedItems[dateKey]) {
        groupedItems[dateKey] = { tasks: [], events: [] };
      }
      groupedItems[dateKey].tasks.push(task);
    });

    filteredEvents.forEach(event => {
      const dateKey = format(new Date(event.start), 'yyyy-MM-dd');
      if (!groupedItems[dateKey]) {
        groupedItems[dateKey] = { tasks: [], events: [] };
      }
      groupedItems[dateKey].events.push(event);
    });

    return groupedItems;
  };

  const getStatusIcon = (task: Task) => {
    if (task.completed) {
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    }

    const status = localStorage.calculateTaskStatus(task);
    switch (status) {
      case 'overdue':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'in-progress':
        return <Circle className="h-5 w-5 text-amber-600" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (task: Task) => {
    if (task.completed) return 'text-green-600';
    
    const status = localStorage.calculateTaskStatus(task);
    switch (status) {
      case 'overdue':
        return 'text-red-600';
      case 'in-progress':
        return 'text-amber-600';
      default:
        return 'text-gray-600';
    }
  };

  const groupedItems = getFilteredItems();
  const sortedDates = Object.keys(groupedItems).sort();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between @container">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className='w-full'>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="today">Hoje</TabsTrigger>
            <TabsTrigger value="week">Esta Semana</TabsTrigger>
            <TabsTrigger value="month">Este Mês</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex space-x-2 @min-[10em]:hidden">
          <Button onClick={() => onCreateTask?.(new Date())} size="sm" className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Tarefa</span>
          </Button>
          <Button onClick={() => onCreateEvent?.(new Date())} variant="outline" size="sm" className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>Evento</span>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando suas tarefas e eventos...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  Nenhum item para este período
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Crie sua primeira tarefa ou evento para começar
                </p>
                <div className="flex justify-center space-x-2">
                  <Button onClick={() => onCreateTask?.(new Date())} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Tarefa
                  </Button>
                  <Button onClick={() => onCreateEvent?.(new Date())} variant="outline" size="sm">
                    <Calendar className="h-4 w-4 mr-2" />
                    Adicionar Evento
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            sortedDates.map(dateKey => {
              const { tasks: dayTasks, events: dayEvents } = groupedItems[dateKey];
              const displayDate = dateKey === 'no-date' ? 'Sem Data de Vencimento' : format(new Date(dateKey), 'EEEE, d \'de\' MMMM');
              
              return (
                <div key={dateKey}>
                  <h3 className="text-lg font-semibold text-foreground mb-3 border-b pb-2">
                    {displayDate}
                  </h3>
                  
                  <div className="space-y-3">
                    {/* Eventos */}
                    {dayEvents.map(event => (
                      <Card key={event.id} className="border-l-4 border-l-blue-500">
                        <CardContent className="py-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <Calendar className="h-4 w-4 text-blue-600" />
                                <h4 className="font-medium text-foreground">{event.title}</h4>
                                <Badge variant="secondary" className="text-xs">Evento</Badge>
                              </div>
                              
                              {event.description && (
                                <p className="text-sm text-muted-foreground mt-2 ml-7">
                                  {event.description}
                                </p>
                              )}
                              
                              <div className="flex items-center space-x-4 mt-2 ml-7 text-sm text-muted-foreground">
                                <span>
                                  {format(new Date(event.start), 'HH:mm')} - {format(new Date(event.end), 'HH:mm')}
                                </span>
                                {event.location && (
                                  <span>📍 {event.location}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {/* Tarefas */}
                    {dayTasks.map(task => (
                      <Card key={task.id} className={cn(
                        "border-l-4 cursor-pointer transition-all hover:shadow-md",
                        task.completed ? "border-l-green-500 opacity-75" : "border-l-gray-300",
                        localStorage.calculateTaskStatus(task) === 'overdue' && !task.completed && "border-l-red-500"
                      )}>
                        <CardContent className="py-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3 flex-1">
                              <button
                                onClick={() => toggleTaskComplete(task.id)}
                                className="mt-0.5"
                              >
                                {getStatusIcon(task)}
                              </button>
                              
                              <div className="flex-1">
                                <div className="flex items-center space-x-3">
                                  <h4 className={cn(
                                    "font-medium",
                                    task.completed ? "line-through text-muted-foreground" : "text-foreground"
                                  )}>
                                    {task.title}
                                  </h4>
                                  <Badge variant="outline" className="text-xs">Tarefa</Badge>
                                  {task.priority !== 'low' && (
                                    <Badge 
                                      variant={task.priority === 'high' ? 'destructive' : 'default'}
                                      className="text-xs"
                                    >
                                      {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                                    </Badge>
                                  )}
                                </div>
                                
                                {task.description && (
                                  <p className="text-sm text-muted-foreground mt-2">
                                    {task.description}
                                  </p>
                                )}
                                
                                <div className="flex items-center space-x-4 mt-2 text-sm">
                                  {task.dueDate && (
                                    <span className={getStatusColor(task)}>
                                      Vencimento: {format(new Date(task.dueDate), 'HH:mm')}
                                    </span>
                                  )}
                                  
                                  {task.tags && task.tags.length > 0 && (
                                    <div className="flex space-x-1">
                                      {task.tags.map(tag => (
                                        <Badge key={tag} variant="secondary" className="text-xs">
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}