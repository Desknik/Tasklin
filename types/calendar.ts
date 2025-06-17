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

// Voice Assistant Types
export interface VoiceAgentCredentials {
  endpointUrl: string;
  authToken?: string;
}

export interface VoiceAgentRequest {
  text: string;
  timestamp: string;
}

export interface VoiceAgentResponse {
  status: 'success' | 'pending' | 'error' | 'needs_info';
  type: 'event' | 'task' | 'unknown';
  action?: 'created' | 'create' | 'none';
  message: string;
  data?: {
    id?: string;
    title?: string;
    summary?: string;
    description?: string;
    start?: string;
    end?: string;
    dueDate?: string;
    priority?: 'low' | 'medium' | 'high';
  };
  meta?: {
    missing?: string[];
    originalInput?: string;
    timestamp?: string;
  };
}