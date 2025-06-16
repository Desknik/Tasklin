'use client';

import { useEffect, useState } from 'react';
import { X, Clock, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NotificationAlert } from '@/types/calendar';
import { localStorage } from '@/lib/storage';

export function NotificationAlerts() {
  const [notifications, setNotifications] = useState<NotificationAlert[]>([]);

  useEffect(() => {
    const checkForNotifications = () => {
      const tasksNeedingNotification = localStorage.getTasksNeedingNotification();
      const existingNotifications = localStorage.getNotifications();

      // Criar notificações para tarefas que ainda não as possuem
      tasksNeedingNotification.forEach(task => {
        const existingNotif = existingNotifications.find(
          n => n.type === 'task' && n.title === task.title && !n.dismissed
        );

        if (!existingNotif) {
          const timeRemaining = calculateTimeRemaining(task.dueDate!);
          localStorage.addNotification({
            type: 'task',
            title: task.title,
            timeRemaining,
            dueDate: task.dueDate!,
            dismissed: false,
          });
        }
      });

      // Obter todas as notificações ativas
      const activeNotifications = localStorage.getNotifications()
        .filter(n => !n.dismissed);
      
      setNotifications(activeNotifications);
    };

    checkForNotifications();
    const interval = setInterval(checkForNotifications, 60000); // Verificar a cada minuto

    return () => clearInterval(interval);
  }, []);

  const calculateTimeRemaining = (dueDate: Date): string => {
    const now = new Date();
    const diff = new Date(dueDate).getTime() - now.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes <= 0) return 'Atrasado';
    if (minutes < 60) return `${minutes}min restantes`;
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    return `${hours}h ${remainingMinutes}min restantes`;
  };

  const dismissNotification = (id: string) => {
    localStorage.dismissNotification(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-16 left-0 right-0 z-50 px-4 space-y-2">
      {notifications.map((notification) => (
        <Alert
          key={notification.id}
          className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950"
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                {notification.type === 'task' ? (
                  <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                )}
                <Badge variant="secondary" className="text-xs">
                  {notification.type === 'task' ? 'TAREFA' : 'EVENTO'}
                </Badge>
              </div>
              
              <div className="flex-1">
                <AlertDescription className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  <span className="font-semibold">{notification.title}</span>
                  <span className="ml-2 text-amber-600 dark:text-amber-400">
                    • {notification.timeRemaining}
                  </span>
                </AlertDescription>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => dismissNotification(notification.id)}
              className="h-8 w-8 p-0 text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Dispensar notificação</span>
            </Button>
          </div>
        </Alert>
      ))}
    </div>
  );
}