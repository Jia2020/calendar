import { Task } from '../types';

/**
 * Checks if a task matches a specific date (takes recurrence into account).
 */
export const doesTaskMatchDate = (task: Task, dateStr: string): boolean => {
  if (task.deletedDates && task.deletedDates.includes(dateStr)) return false;
  if (task.date === dateStr) return true;
  if (!task.isRecurring || !task.recurrence || task.recurrence === 'none') return false;

  // Ensure target date is after or equal to the task's start date
  if (dateStr < task.date) return false;

  // Ensure target date is before or equal to the task's end date (if defined)
  if (task.recurrenceEndDate && dateStr > task.recurrenceEndDate) return false;

  const targetDate = new Date(dateStr);
  const startDate = new Date(task.date);

  // Normalize day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const targetDayOfWeek = targetDate.getDay();

  switch (task.recurrence) {
    case 'daily':
      return true;
    case 'weekly':
      return targetDayOfWeek === startDate.getDay();
    case 'monthly':
      return targetDate.getDate() === startDate.getDate();
    case 'workday':
      return targetDayOfWeek >= 1 && targetDayOfWeek <= 5; // Monday to Friday
    case 'custom':
      return !!task.recurrenceDays?.includes(targetDayOfWeek);
    default:
      return false;
  }
};

/**
 * Checks if a task is completed on a specific date.
 */
export const isTaskCompletedOnDate = (task: Task, dateStr: string): boolean => {
  if (task.isRecurring) {
    return !!task.completedDates?.includes(dateStr);
  }
  return task.completed;
};
