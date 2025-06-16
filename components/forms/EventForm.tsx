'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { CalendarEvent } from '@/types/calendar';
import { googleCalendarAPI } from '@/lib/google-api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const eventSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  startDate: z.date(),
  startTime: z.string().optional(),
  endDate: z.date(),
  endTime: z.string().optional(),
  allDay: z.boolean().default(false),
  location: z.string().optional(),
});

type EventFormData = z.infer<typeof eventSchema>;

interface EventFormProps {
  event?: CalendarEvent;
  onSubmit: (event: CalendarEvent) => void;
  onCancel: () => void;
}

export function EventForm({ event, onSubmit, onCancel }: EventFormProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: event?.title || '',
      description: event?.description || '',
      startDate: event?.start ? new Date(event.start) : new Date(),
      startTime: event?.start && !event?.allDay ? format(new Date(event.start), 'HH:mm') : '',
      endDate: event?.end ? new Date(event.end) : new Date(),
      endTime: event?.end && !event?.allDay ? format(new Date(event.end), 'HH:mm') : '',
      allDay: event?.allDay || false,
      location: event?.location || '',
    },
  });

  const watchAllDay = form.watch('allDay');

  const handleSubmit = async (data: EventFormData) => {
    setLoading(true);
    try {
      let startDate = new Date(data.startDate);
      let endDate = new Date(data.endDate);

      if (!data.allDay) {
        if (data.startTime) {
          const [startHours, startMinutes] = data.startTime.split(':').map(Number);
          startDate.setHours(startHours, startMinutes, 0, 0);
        }
        
        if (data.endTime) {
          const [endHours, endMinutes] = data.endTime.split(':').map(Number);
          endDate.setHours(endHours, endMinutes, 0, 0);
        }
      } else {
        // Para eventos de dia inteiro, definir para início do dia
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
      }

      const eventData: Omit<CalendarEvent, 'id'> = {
        title: data.title,
        description: data.description,
        start: startDate,
        end: endDate,
        allDay: data.allDay,
        location: data.location,
        status: 'confirmed',
        attendees: event?.attendees || [],
      };

      if (googleCalendarAPI.hasValidCredentials()) {
        try {
          const createdEvent = await googleCalendarAPI.createEvent(eventData);
          onSubmit(createdEvent);
          toast.success('Evento criado com sucesso!');
        } catch (error) {
          console.error('Falha ao criar evento:', error);
          toast.error('Falha ao criar evento no Google Calendar');
          // Ainda chamar onSubmit com dados locais como fallback
          onSubmit({
            ...eventData,
            id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          });
        }
      } else {
        // Criar evento local se não houver integração com Google Calendar
        onSubmit({
          ...eventData,
          id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        });
        toast.success('Evento criado localmente!');
      }
    } catch (error) {
      console.error('Erro ao criar evento:', error);
      toast.error('Falha ao criar evento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-medium">Título</FormLabel>
              <FormControl>
                <Input
                  placeholder="Digite o título do evento..."
                  className="text-base"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-medium">Descrição</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Adicione uma descrição..."
                  className="resize-none text-base"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="allDay"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="text-base font-medium">
                  Evento de dia inteiro
                </FormLabel>
              </div>
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-medium">Data de Início</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal text-base",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Escolha a data de início</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          {!watchAllDay && (
            <FormField
              control={form.control}
              name="startTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">Horário de Início</FormLabel>
                  <FormControl>
                    <Input
                      type="time"
                      className="text-base"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-medium">Data de Término</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal text-base",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Escolha a data de término</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          {!watchAllDay && (
            <FormField
              control={form.control}
              name="endTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">Horário de Término</FormLabel>
                  <FormControl>
                    <Input
                      type="time"
                      className="text-base"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-medium">Local</FormLabel>
              <FormControl>
                <Input
                  placeholder="Adicionar local..."
                  className="text-base"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex space-x-3 pt-6">
          <Button type="submit" disabled={loading} className="flex-1 text-base">
            {loading ? 'Criando...' : (event ? 'Atualizar Evento' : 'Criar Evento')}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1 text-base">
            Cancelar
          </Button>
        </div>
      </form>
    </Form>
  );
}