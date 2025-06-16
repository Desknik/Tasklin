export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  color?: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  attendees?: string[];
  location?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: Date;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  tags?: string[];
  color?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  createdAt: Date;
  updatedAt: Date;
}

export interface GoogleCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  calendarId?: string;
}

export interface ViewMode {
  mode: 'simple' | 'agenda' | 'mixed';
  simpleTab: 'today' | 'week' | 'month';
  agendaTab: 'day' | 'week' | 'month';
}

export interface NotificationAlert {
  id: string;
  type: 'task' | 'event';
  title: string;
  timeRemaining: string;
  dueDate: Date;
  dismissed: boolean;
}