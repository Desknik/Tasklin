'use client';

import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek, addDays, startOfDay, endOfDay } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronLeft, ChevronRight, Calendar, Clock, Plus } from 'lucide-react';
import { Task, CalendarEvent } from '@/types/calendar';
import { localStorage } from '@/lib/storage';
import { googleCalendarAPI } from '@/lib/google-api';
import { cn } from '@/lib/utils';

interface AgendaModeProps {
  onCreateTask?: (date?: Date) => void;
  onCreateEvent?: (date?: Date) => void;
}

export function AgendaMode({ onCreateTask, onCreateEvent }: AgendaModeProps) {
  const [activeTab, setActiveTab] = useState<'month' | 'week' | 'day'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [currentDate, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const localTasks = localStorage.getTasks();
      setTasks(localTasks);

      if (googleCalendarAPI.hasValidCredentials()) {
        let startDate: Date;
        let endDate: Date;

        switch (activeTab) {
          case 'day':
            startDate = startOfDay(currentDate);
            endDate = endOfDay(currentDate);
            break;
          case 'week':
            startDate = startOfWeek(currentDate);
            endDate = endOfWeek(currentDate);
            break;
          case 'month':
            startDate = startOfMonth(currentDate);
            endDate = endOfMonth(currentDate);
            break;
        }

        const calendarEvents = await googleCalendarAPI.getEvents(startDate, endDate);
        setEvents(calendarEvents);
        localStorage.saveCachedEvents(calendarEvents);
      } else {
        const cachedEvents = localStorage.getCachedEvents();
        setEvents(cachedEvents);
      }
    } catch (error) {
      console.error('Falha ao carregar dados:', error);
      const cachedEvents = localStorage.getCachedEvents();
      setEvents(cachedEvents);
    } finally {
      setLoading(false);
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    
    switch (activeTab) {
      case 'day':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
    }
    
    setCurrentDate(newDate);
  };

  const getItemsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    const dayTasks = tasks.filter(task => {
      if (!task.dueDate) return false;
      return format(new Date(task.dueDate), 'yyyy-MM-dd') === dateStr;
    });

    const dayEvents = events.filter(event => {
      return format(new Date(event.start), 'yyyy-MM-dd') === dateStr;
    });

    return { tasks: dayTasks, events: dayEvents };
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return (
      <div className="grid grid-cols-7 gap-1 bg-muted/20 p-1 rounded-lg">
        {/* Cabeçalhos dos dias */}
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
        
        {/* Dias do calendário */}
        {days.map(day => {
          const { tasks: dayTasks, events: dayEvents } = getItemsForDate(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isCurrentDay = isToday(day);
          const hasItems = dayTasks.length > 0 || dayEvents.length > 0;

          return (
            <Popover key={day.toISOString()}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "h-24 w-full p-2 flex flex-col items-start justify-start hover:bg-accent/50 relative",
                    !isCurrentMonth && "text-muted-foreground opacity-50",
                    isCurrentDay && "bg-primary/10 border-2 border-primary/30",
                    hasItems && "bg-muted/30"
                  )}
                >
                  <span className={cn(
                    "text-sm font-medium",
                    isCurrentDay && "text-primary font-bold"
                  )}>
                    {format(day, 'd')}
                  </span>
                  
                  {hasItems && (
                    <div className="mt-1 space-y-1 w-full">
                      {dayEvents.slice(0, 2).map(event => (
                        <div key={event.id} className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-1 py-0.5 rounded truncate">
                          {event.title}
                        </div>
                      ))}
                      {dayTasks.slice(0, 2).map(task => (
                        <div key={task.id} className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-1 py-0.5 rounded truncate">
                          {task.title}
                        </div>
                      ))}
                      {(dayTasks.length + dayEvents.length > 2) && (
                        <div className="text-xs text-muted-foreground">
                          +{dayTasks.length + dayEvents.length - 2} mais
                        </div>
                      )}
                    </div>
                  )}
                </Button>
              </PopoverTrigger>
              
              <PopoverContent className="w-80" align="start">
                <div className="space-y-3">
                  <h4 className="font-medium text-lg">
                    {format(day, 'EEEE, d \'de\' MMMM')}
                  </h4>
                  
                  {dayEvents.length === 0 && dayTasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum evento ou tarefa</p>
                  ) : (
                    <div className="space-y-3">
                      {dayEvents.map(event => (
                        <div key={event.id} className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                          <Calendar className="h-4 w-4 text-blue-600 mt-0.5" />
                          <div className="flex-1">
                            <h5 className="font-medium text-blue-900 dark:text-blue-100">{event.title}</h5>
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                              {format(new Date(event.start), 'HH:mm')} - {format(new Date(event.end), 'HH:mm')}
                            </p>
                            {event.description && (
                              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">{event.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {dayTasks.map(task => (
                        <div key={task.id} className="flex items-start space-x-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                          <Clock className="h-4 w-4 text-green-600 mt-0.5" />
                          <div className="flex-1">
                            <h5 className="font-medium text-green-900 dark:text-green-100">{task.title}</h5>
                            {task.dueDate && (
                              <p className="text-sm text-green-700 dark:text-green-300">
                                Vencimento: {format(new Date(task.dueDate), 'HH:mm')}
                              </p>
                            )}
                            {task.description && (
                              <p className="text-sm text-green-600 dark:text-green-400 mt-1">{task.description}</p>
                            )}
                            <div className="flex items-center space-x-2 mt-2">
                              <Badge 
                                variant={task.completed ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {task.completed ? "Concluída" : localStorage.calculateTaskStatus(task) === 'overdue' ? 'Atrasada' : localStorage.calculateTaskStatus(task) === 'in-progress' ? 'Em andamento' : 'Pendente'}
                              </Badge>
                              {task.priority !== 'low' && (
                                <Badge 
                                  variant={task.priority === 'high' ? 'destructive' : 'default'}
                                  className="text-xs"
                                >
                                  {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex space-x-2 pt-2 border-t">
                    <Button onClick={() => onCreateTask?.(day)} size="sm" className="flex-1">
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Tarefa
                    </Button>
                    <Button onClick={() => onCreateEvent?.(day)} variant="outline" size="sm" className="flex-1">
                      <Calendar className="h-4 w-4 mr-2" />
                      Criar Evento
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate);
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-7 gap-4">
          {weekDays.map(day => {
            const { tasks: dayTasks, events: dayEvents } = getItemsForDate(day);
            const isCurrentDay = isToday(day);

            return (
              <Card key={day.toISOString()} className={cn(
                "min-h-[300px]",
                isCurrentDay && "ring-2 ring-primary/30"
              )}>
                <CardContent className="p-4">
                  <h4 className={cn(
                    "font-medium text-center mb-3",
                    isCurrentDay && "text-primary font-bold"
                  )}>
                    {format(day, 'EEE d')}
                  </h4>
                  
                  <div className="space-y-2">
                    {dayEvents.map(event => (
                      <div key={event.id} className="p-2 bg-blue-100 dark:bg-blue-900 rounded text-xs">
                        <div className="font-medium text-blue-900 dark:text-blue-100">{event.title}</div>
                        <div className="text-blue-700 dark:text-blue-300">
                          {format(new Date(event.start), 'HH:mm')}
                        </div>
                      </div>
                    ))}
                    
                    {dayTasks.map(task => (
                      <div key={task.id} className="p-2 bg-green-100 dark:bg-green-900 rounded text-xs">
                        <div className={cn(
                          "font-medium",
                          task.completed ? "line-through text-green-600 dark:text-green-400" : "text-green-900 dark:text-green-100"
                        )}>
                          {task.title}
                        </div>
                        {task.dueDate && (
                          <div className="text-green-700 dark:text-green-300">
                            {format(new Date(task.dueDate), 'HH:mm')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const { tasks: dayTasks, events: dayEvents } = getItemsForDate(currentDate);
    const allItems = [
      ...dayEvents.map(e => ({ ...e, type: 'event' as const })),
      ...dayTasks.map(t => ({ ...t, type: 'task' as const }))
    ].sort((a, b) => {
      const aTime = 'start' in a ? new Date(a.start).getTime() : (a.dueDate ? new Date(a.dueDate).getTime() : 0);
      const bTime = 'start' in b ? new Date(b.start).getTime() : (b.dueDate ? new Date(b.dueDate).getTime() : 0);
      return aTime - bTime;
    });

    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-4">
              {format(currentDate, 'EEEE, d \'de\' MMMM \'de\' yyyy')}
            </h3>
            
            {allItems.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">Nenhum evento ou tarefa agendado para este dia</p>
                <div className="flex justify-center space-x-2">
                  <Button onClick={() => onCreateTask?.(currentDate)} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Tarefa
                  </Button>
                  <Button onClick={() => onCreateEvent?.(currentDate)} variant="outline" size="sm">
                    <Calendar className="h-4 w-4 mr-2" />
                    Adicionar Evento
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {allItems.map(item => (
                  <div key={item.id} className={cn(
                    "p-4 rounded-lg border-l-4",
                    item.type === 'event' ? "bg-blue-50 dark:bg-blue-950 border-l-blue-500" : "bg-green-50 dark:bg-green-950 border-l-green-500"
                  )}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          {item.type === 'event' ? (
                            <Calendar className="h-5 w-5 text-blue-600" />
                          ) : (
                            <Clock className="h-5 w-5 text-green-600" />
                          )}
                          <h4 className="font-medium">{item.title}</h4>
                          <Badge variant="secondary" className="text-xs">
                            {item.type === 'event' ? 'Evento' : 'Tarefa'}
                          </Badge>
                        </div>
                        
                        {item.type === 'event' ? (
                          <div className="ml-8 mt-2 space-y-2">
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(item.start), 'HH:mm')} - {format(new Date(item.end), 'HH:mm')}
                            </p>
                            {item.description && (
                              <p className="text-sm text-muted-foreground">{item.description}</p>
                            )}
                            {item.location && (
                              <p className="text-sm text-muted-foreground">📍 {item.location}</p>
                            )}
                          </div>
                        ) : (
                          <div className="ml-8 mt-2 space-y-2">
                            {item.dueDate && (
                              <p className="text-sm text-muted-foreground">
                                Vencimento: {format(new Date(item.dueDate), 'HH:mm')}
                              </p>
                            )}
                            {item.description && (
                              <p className="text-sm text-muted-foreground">{item.description}</p>
                            )}
                            <div className="flex items-center space-x-2">
                              <Badge 
                                variant={item.completed ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {item.completed ? "Concluída" : localStorage.calculateTaskStatus(item) === 'overdue' ? 'Atrasada' : localStorage.calculateTaskStatus(item) === 'in-progress' ? 'Em andamento' : 'Pendente'}
                              </Badge>
                              {item.priority !== 'low' && (
                                <Badge 
                                  variant={item.priority === 'high' ? 'destructive' : 'default'}
                                  className="text-xs"
                                >
                                  {item.priority === 'high' ? 'Alta' : item.priority === 'medium' ? 'Média' : 'Baixa'}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const getDateRangeText = () => {
    switch (activeTab) {
      case 'day':
        return format(currentDate, 'd \'de\' MMMM \'de\' yyyy');
      case 'week':
        const weekStart = startOfWeek(currentDate);
        const weekEnd = endOfWeek(currentDate);
        return `${format(weekStart, 'd \'de\' MMM')} - ${format(weekEnd, 'd \'de\' MMM \'de\' yyyy')}`;
      case 'month':
        return format(currentDate, 'MMMM \'de\' yyyy');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="month">Mês</TabsTrigger>
            <TabsTrigger value="week">Semana</TabsTrigger>
            <TabsTrigger value="day">Dia</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex space-x-2">
          <Button onClick={() => onCreateTask?.(currentDate)} size="sm" className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Tarefa</span>
          </Button>
          <Button onClick={() => onCreateEvent?.(currentDate)} variant="outline" size="sm" className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>Evento</span>
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateDate('prev')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <h2 className="text-xl font-semibold min-w-[200px] text-center">
            {getDateRangeText()}
          </h2>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateDate('next')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentDate(new Date())}
          className="text-primary"
        >
          Hoje
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando calendário...</p>
        </div>
      ) : (
        <div>
          {activeTab === 'month' && renderMonthView()}
          {activeTab === 'week' && renderWeekView()}
          {activeTab === 'day' && renderDayView()}
        </div>
      )}
    </div>
  );
}