'use client';

import { Task, CalendarEvent, NotificationAlert } from '@/types/calendar';

class LocalStorage {
  private isClient = typeof window !== 'undefined';

  private getLocalStorage(): Storage | null {
    return this.isClient ? window.localStorage : null;
  }

  // Tasks storage
  getTasks(): Task[] {
    const storage = this.getLocalStorage();
    if (!storage) return [];
    const stored = storage.getItem('calendar_tasks');
    return stored ? JSON.parse(stored) : [];
  }

  saveTasks(tasks: Task[]): void {
    const storage = this.getLocalStorage();
    if (!storage) return;
    storage.setItem('calendar_tasks', JSON.stringify(tasks));
  }

  addTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Task {
    const newTask: Task = {
      ...task,
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const tasks = this.getTasks();
    tasks.push(newTask);
    this.saveTasks(tasks);
    return newTask;
  }

  updateTask(id: string, updates: Partial<Task>): Task | null {
    const tasks = this.getTasks();
    const taskIndex = tasks.findIndex(t => t.id === id);
    
    if (taskIndex === -1) return null;

    tasks[taskIndex] = {
      ...tasks[taskIndex],
      ...updates,
      updatedAt: new Date(),
    };

    this.saveTasks(tasks);
    return tasks[taskIndex];
  }

  deleteTask(id: string): boolean {
    const tasks = this.getTasks();
    const filteredTasks = tasks.filter(t => t.id !== id);
    
    if (filteredTasks.length === tasks.length) return false;
    
    this.saveTasks(filteredTasks);
    return true;
  }

  // Events cache storage
  getCachedEvents(): CalendarEvent[] {
    const storage = this.getLocalStorage();
    if (!storage) return [];
    const stored = storage.getItem('cached_calendar_events');
    return stored ? JSON.parse(stored) : [];
  }

  saveCachedEvents(events: CalendarEvent[]): void {
    const storage = this.getLocalStorage();
    if (!storage) return;
    storage.setItem('cached_calendar_events', JSON.stringify(events));
  }

  // Notifications storage
  getNotifications(): NotificationAlert[] {
    const storage = this.getLocalStorage();
    if (!storage) return [];
    const stored = storage.getItem('notification_alerts');
    return stored ? JSON.parse(stored) : [];
  }

  saveNotifications(notifications: NotificationAlert[]): void {
    const storage = this.getLocalStorage();
    if (!storage) return;
    storage.setItem('notification_alerts', JSON.stringify(notifications));
  }

  addNotification(notification: Omit<NotificationAlert, 'id'>): NotificationAlert {
    const newNotification: NotificationAlert = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    const notifications = this.getNotifications();
    notifications.push(newNotification);
    this.saveNotifications(notifications);
    return newNotification;
  }

  dismissNotification(id: string): void {
    const notifications = this.getNotifications();
    const updated = notifications.map(n => 
      n.id === id ? { ...n, dismissed: true } : n
    );
    this.saveNotifications(updated);
  }

  // Settings storage
  getSettings(): Record<string, any> {
    const storage = this.getLocalStorage();
    if (!storage) return {
      theme: 'system',
      viewMode: 'simple',
      simpleTab: 'today',
      agendaTab: 'month',
      notificationsEnabled: true,
    };
    const stored = storage.getItem('app_settings');
    return stored ? JSON.parse(stored) : {
      theme: 'system',
      viewMode: 'simple',
      simpleTab: 'today',
      agendaTab: 'month',
      notificationsEnabled: true,
    };
  }

  saveSetting(key: string, value: any): void {
    const storage = this.getLocalStorage();
    if (!storage) return;
    const settings = this.getSettings();
    settings[key] = value;
    storage.setItem('app_settings', JSON.stringify(settings));
  }

  // Calculate task status based on due date and completion
  calculateTaskStatus(task: Task): Task['status'] {
    if (task.completed) return 'completed';
    
    if (!task.dueDate) return 'pending';
    
    const now = new Date();
    const dueDate = new Date(task.dueDate);
    
    if (dueDate < now) return 'overdue';
    
    const timeDiff = dueDate.getTime() - now.getTime();
    const daysDiff = timeDiff / (1000 * 3600 * 24);
    
    if (daysDiff <= 1) return 'in-progress';
    
    return 'pending';
  }

  // Get tasks that need notifications (due within 30 minutes)
  getTasksNeedingNotification(): Task[] {
    const tasks = this.getTasks();
    const now = new Date();
    const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);

    return tasks.filter(task => {
      if (task.completed || !task.dueDate) return false;
      
      const dueDate = new Date(task.dueDate);
      return dueDate >= now && dueDate <= thirtyMinutesFromNow;
    });
  }
}

export const localStorage = new LocalStorage();