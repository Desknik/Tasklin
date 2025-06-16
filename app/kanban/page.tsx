'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { KanbanBoard } from '@/components/views/KanbanBoard';
import { TaskForm } from '@/components/forms/TaskForm';
import { Task } from '@/types/calendar';

export default function KanbanPage() {
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();

  const handleCreateTask = () => {
    setEditingTask(undefined);
    setShowTaskForm(true);
  };

  const handleTaskSubmit = (task: Task) => {
    setShowTaskForm(false);
    setEditingTask(undefined);
    // O KanbanBoard será atualizado automaticamente quando o localStorage mudar
    window.dispatchEvent(new Event('storage'));
  };

  const handleTaskCancel = () => {
    setShowTaskForm(false);
    setEditingTask(undefined);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <KanbanBoard onCreateTask={handleCreateTask} />

      <Dialog open={showTaskForm} onOpenChange={setShowTaskForm}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {editingTask ? 'Editar Tarefa' : 'Criar Nova Tarefa'}
            </DialogTitle>
          </DialogHeader>
          <TaskForm
            task={editingTask}
            onSubmit={handleTaskSubmit}
            onCancel={handleTaskCancel}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}