'use client';

import { GoogleCredentials, CalendarEvent, Task } from '@/types/calendar';

export class GoogleCalendarAPI {
  private credentials: GoogleCredentials | null = null;
  private accessToken: string | null = null;

  constructor() {
    this.loadCredentials();
  }

  private getLocalStorage(): Storage | null {
    return typeof window !== 'undefined' ? window.localStorage : null;
  }

  private loadCredentials(): void {
    const storage = this.getLocalStorage();
    if (storage) {
      const stored = storage.getItem('google_credentials');
      if (stored) {
        this.credentials = JSON.parse(stored);
      }
    }
  }

  public setCredentials(credentials: GoogleCredentials): void {
    this.credentials = credentials;
    const storage = this.getLocalStorage();
    if (storage) {
      storage.setItem('google_credentials', JSON.stringify(credentials));
    }
  }

  public hasValidCredentials(): boolean {
    return !!(this.credentials?.clientId && this.credentials?.clientSecret);
  }

  public getAuthUrl(): string {
    if (!this.credentials) throw new Error('No credentials configured');
    
    const params = new URLSearchParams({
      client_id: this.credentials.clientId,
      redirect_uri: this.credentials.redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar',
      access_type: 'offline',
      prompt: 'consent'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  public async exchangeCodeForToken(code: string): Promise<void> {
    if (!this.credentials) throw new Error('No credentials configured');

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.credentials.redirectUri,
      }),
    });

    const data = await response.json();
    if (data.access_token) {
      this.accessToken = data.access_token;
      const storage = this.getLocalStorage();
      if (storage) {
        storage.setItem('google_access_token', data.access_token);
        if (data.refresh_token) {
          storage.setItem('google_refresh_token', data.refresh_token);
        }
      }
    }
  }

  public async getEvents(startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    if (!this.accessToken) {
      const storage = this.getLocalStorage();
      if (storage) {
        this.accessToken = storage.getItem('google_access_token');
      }
    }
    
    if (!this.accessToken) throw new Error('Not authenticated');

    const calendarId = this.credentials?.calendarId || 'primary';
    const params = new URLSearchParams({
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime'
    });

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch events');
    }

    const data = await response.json();
    return data.items?.map((item: any) => ({
      id: item.id,
      title: item.summary || 'Untitled Event',
      description: item.description,
      start: new Date(item.start.dateTime || item.start.date),
      end: new Date(item.end.dateTime || item.end.date),
      allDay: !item.start.dateTime,
      status: item.status,
      location: item.location,
      attendees: item.attendees?.map((a: any) => a.email) || [],
    })) || [];
  }

  public async createEvent(event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> {
    if (!this.accessToken) throw new Error('Not authenticated');

    const calendarId = this.credentials?.calendarId || 'primary';
    
    const eventData = {
      summary: event.title,
      description: event.description,
      start: event.allDay 
        ? { date: event.start.toISOString().split('T')[0] }
        : { dateTime: event.start.toISOString() },
      end: event.allDay
        ? { date: event.end.toISOString().split('T')[0] }
        : { dateTime: event.end.toISOString() },
      location: event.location,
    };

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to create event');
    }

    const data = await response.json();
    return {
      id: data.id,
      title: data.summary,
      description: data.description,
      start: new Date(data.start.dateTime || data.start.date),
      end: new Date(data.end.dateTime || data.end.date),
      allDay: !data.start.dateTime,
      status: data.status,
      location: data.location,
      attendees: data.attendees?.map((a: any) => a.email) || [],
    };
  }

  public async testConnection(): Promise<boolean> {
    try {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      await this.getEvents(now, tomorrow);
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}

export const googleCalendarAPI = new GoogleCalendarAPI();