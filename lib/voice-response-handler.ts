/**
 * AI JSON Response Handler
 * 
 * This handler receives a structured JSON object returned by the AI agent.
 * It will handle the following:
 * 
 * ✅ 1. Display notifications using toast or permanent sonner banners.
 * ✅ 2. Update the local store (cache/state) of tasks or events.
 * ✅ 3. Ask the user for more information if status = "needs_info".
 */

import { toast } from "sonner";
import { localStorage } from "@/lib/storage";
import { VoiceAgentResponse, Task, CalendarEvent } from "@/types/calendar";

export interface VoiceResponseHandlerCallbacks {
  onTaskCreated?: (task: Task) => void;
  onEventCreated?: (event: CalendarEvent) => void;
  onRefreshData?: () => void;
  onNeedsInfo?: (meta: { type: string; missing: string[]; originalInput: string }) => void;
}

/**
 * Handles the AI response and performs appropriate actions
 */
export function handleAIResponse(
  response: VoiceAgentResponse, 
  callbacks: VoiceResponseHandlerCallbacks = {}
) {
  const { status, type, action, message, data, meta } = response;
  const { onTaskCreated, onEventCreated, onRefreshData, onNeedsInfo } = callbacks;

  console.log('🤖 Handling AI Response:', { status, type, action, message, data, meta });

  // 📣 Show appropriate notification based on status
  if (status === "success") {
    if (type === "event" && action === "created") {
      // Event was created by the agent
      toast.success(message, {
        duration: 10000,
        action: {
          label: 'Fechar',
          onClick: () => {},
        },
      });
      
      // Refresh calendar data
      onRefreshData?.();
      
    } else if (type === "task" && (action === "create" || action === "created") && data) {
      // Create task locally
      const taskData = createTaskFromData(data);
      const newTask = localStorage.addTask(taskData);
      onTaskCreated?.(newTask);
      
      toast.success(message, {
        duration: 10000,
        action: {
          label: 'Fechar',
          onClick: () => {},
        },
      });
    } else {
      // Generic success message
      toast.success(message, {
        duration: 8000,
        action: {
          label: 'Fechar',
          onClick: () => {},
        },
      });
    }
  } 
  else if (status === "pending") {
    if (type === "task" && data) {
      // Task data parsed, create locally
      const taskData = createTaskFromData(data);
      const newTask = localStorage.addTask(taskData);
      onTaskCreated?.(newTask);
      
      toast.success(`Tarefa criada: ${taskData.title}`, {
        duration: 8000,
        action: {
          label: 'Fechar',
          onClick: () => {},
        },
      });
    } else {
      toast.info(message, {
        duration: 6000,
        action: {
          label: 'Fechar',
          onClick: () => {},
        },
      });
    }
  } 
  else if (status === "needs_info") {
    // Show permanent notification for missing information
    toast.warning(message, {
      description: meta?.missing ? `Informações em falta: ${meta.missing.join(", ")}` : undefined,
      duration: Infinity, // Permanent notification
      action: {
        label: "Completar",
        onClick: () => {
          if (meta && onNeedsInfo) {
            onNeedsInfo({
              type: type,
              missing: meta.missing || [],
              originalInput: meta.originalInput || ''
            });
          }
        },
      },
    });
  } 
  else if (status === "error") {
    toast.error(message, {
      duration: 8000,
      action: {
        label: 'Fechar',
        onClick: () => {},
      },
    });
  }
}

/**
 * Creates a Task object from the AI response data
 */
function createTaskFromData(data: any): Omit<Task, 'id'> {
  return {
    title: data.title || data.summary || '',
    description: data.description || '',
    dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    priority: data.priority || 'medium',
    completed: false,
    status: 'pending' as const,
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Creates a CalendarEvent object from the AI response data
 */
function createEventFromData(data: any): Omit<CalendarEvent, 'id'> {
  return {
    title: data.title || data.summary || '',
    description: data.description || '',
    start: data.start ? new Date(data.start) : new Date(),
    end: data.end ? new Date(data.end) : new Date(),
    allDay: data.allDay || false,
    status: 'confirmed' as const,
    attendees: data.attendees || [],
    location: data.location || '',
  };
}
