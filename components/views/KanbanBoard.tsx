'use client';

import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Clock, AlertTriangle, CheckCircle2, Circle } from 'lucide-react';
import { Task } from '@/types/calendar';
import { localStorage } from '@/lib/storage';
import { format, isToday, isThisWeek, isPast } from 'date-fns';
import { cn } from '@/lib/utils';

interface KanbanBoardProps {
  onCreateTask?: () => void;
}

interface KanbanColumn {
  id: string;
  title: string;
  tasks: Task[];
  color: string;
}

export function KanbanBoard({ onCreateTask }: KanbanBoardProps) {
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = () => {
    setLoading(true);
    const tasks = localStorage.getTasks();
    
    // Organizar tarefas em colunas
    const todayTasks: Task[] = [];
    const thisWeekTasks: Task[] = [];
    const laterTasks: Task[] = [];
    const completedTasks: Task[] = [];
    const overdueTasks: Task[] = [];

    tasks.forEach(task => {
      if (task.completed) {
        completedTasks.push(task);
        return;
      }

      if (!task.dueDate) {
        laterTasks.push(task);
        return;
      }

      const dueDate = new Date(task.dueDate);
      
      if (isPast(dueDate) && !isToday(dueDate)) {
        overdueTasks.push(task);
      } else if (isToday(dueDate)) {
        todayTasks.push(task);
      } else if (isThisWeek(dueDate)) {
        thisWeekTasks.push(task);
      } else {
        laterTasks.push(task);
      }
    });

    const newColumns: KanbanColumn[] = [
      {
        id: 'overdue',
        title: 'Atrasadas',
        tasks: overdueTasks,
        color: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
      },
      {
        id: 'today',
        title: 'Hoje',
        tasks: todayTasks,
        color: 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800'
      },
      {
        id: 'this-week',
        title: 'Esta Semana',
        tasks: thisWeekTasks,
        color: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
      },
      {
        id: 'later',
        title: 'Mais Tarde',
        tasks: laterTasks,
        color: 'bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800'
      },
      {
        id: 'completed',
        title: 'Concluídas',
        tasks: completedTasks,
        color: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
      }
    ];

    setColumns(newColumns);
    setLoading(false);
  };

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
      return;
    }

    const task = columns
      .find(col => col.id === source.droppableId)
      ?.tasks.find(t => t.id === draggableId);

    if (!task) return;

    // Atualizar tarefa baseado na coluna de destino
    let updates: Partial<Task> = {};
    
    switch (destination.droppableId) {
      case 'completed':
        updates.completed = true;
        updates.status = 'completed';
        break;
      case 'today':
        updates.completed = false;
        updates.dueDate = new Date();
        updates.status = 'in-progress';
        break;
      case 'this-week':
        updates.completed = false;
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        updates.dueDate = nextWeek;
        updates.status = 'pending';
        break;
      case 'later':
        updates.completed = false;
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        updates.dueDate = nextMonth;
        updates.status = 'pending';
        break;
      case 'overdue':
        updates.completed = false;
        updates.status = 'overdue';
        break;
    }

    localStorage.updateTask(task.id, updates);
    loadTasks(); // Recarregar para refletir as mudanças
  };

  const getTaskIcon = (task: Task) => {
    if (task.completed) {
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    }

    const status = localStorage.calculateTaskStatus(task);
    switch (status) {
      case 'overdue':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'in-progress':
        return <Clock className="h-4 w-4 text-amber-600" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const toggleTaskComplete = (taskId: string) => {
    const task = columns.flatMap(col => col.tasks).find(t => t.id === taskId);
    if (!task) return;

    localStorage.updateTask(taskId, {
      completed: !task.completed,
      status: !task.completed ? 'completed' : localStorage.calculateTaskStatus(task),
    });

    loadTasks();
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Carregando quadro Kanban...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Quadro de Tarefas</h2>
        <Button onClick={onCreateTask} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Adicionar Tarefa</span>
        </Button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {columns.map(column => (
            <div key={column.id} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">{column.title}</h3>
                <Badge variant="secondary" className="text-xs">
                  {column.tasks.length}
                </Badge>
              </div>

              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "min-h-[400px] p-4 rounded-lg border-2 border-dashed transition-colors",
                      snapshot.isDraggingOver ? "border-primary bg-primary/5" : column.color
                    )}
                  >
                    <div className="space-y-3">
                      {column.tasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={cn(
                                "cursor-grab active:cursor-grabbing transition-all hover:shadow-md",
                                snapshot.isDragging && "rotate-3 shadow-lg",
                                task.completed && "opacity-75"
                              )}
                            >
                              <CardContent className="p-4">
                                <div className="space-y-3">
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-start space-x-2 flex-1">
                                      <button
                                        onClick={() => toggleTaskComplete(task.id)}
                                        className="mt-0.5"
                                      >
                                        {getTaskIcon(task)}
                                      </button>
                                      <h4 className={cn(
                                        "font-medium text-sm leading-relaxed",
                                        task.completed && "line-through text-muted-foreground"
                                      )}>
                                        {task.title}
                                      </h4>
                                    </div>
                                  </div>

                                  {task.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                      {task.description}
                                    </p>
                                  )}

                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      {task.priority !== 'low' && (
                                        <Badge 
                                          variant={task.priority === 'high' ? 'destructive' : 'default'}
                                          className="text-xs"
                                        >
                                          {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                                        </Badge>
                                      )}
                                      
                                      {task.tags && task.tags.length > 0 && (
                                        <Badge variant="outline" className="text-xs">
                                          {task.tags[0]}
                                          {task.tags.length > 1 && ` +${task.tags.length - 1}`}
                                        </Badge>
                                      )}
                                    </div>

                                    {task.dueDate && (
                                      <div className="text-xs text-muted-foreground">
                                        {format(new Date(task.dueDate), 'd \'de\' MMM')}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                    </div>
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}