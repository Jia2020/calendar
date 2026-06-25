import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Check, Clock, X, Volume2, Calendar } from 'lucide-react';
import { Task } from '../types';
import { playChime } from './AudioChime';
import { doesTaskMatchDate, isTaskCompletedOnDate } from '../utils/taskUtils';

interface ReminderSystemProps {
  tasks: Task[];
  onToggleTask: (id: string, dateStr?: string) => void;
  onUpdateTask: (id: string, updated: Partial<Task>) => void;
}

export default function ReminderSystem({ tasks, onToggleTask, onUpdateTask }: ReminderSystemProps) {
  const [activeReminders, setActiveReminders] = useState<Task[]>([]);
  const checkedMinutesRef = useRef<string>(''); // Keep track of last checked minute to avoid duplicate triggers (e.g., "15:30")
  const triggeredTodayRef = useRef<Set<string>>(new Set()); // Keep track of task IDs triggered today

  useEffect(() => {
    // Poll every 5 seconds to check if any reminders are due
    const interval = setInterval(() => {
      const now = new Date();
      const todayStr = now.toISOString().substring(0, 10); // YYYY-MM-DD
      const currentMinStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`; // HH:MM
      
      // Avoid running logic multiple times during the exact same minute
      const uniqueCheckKey = `${todayStr}-${currentMinStr}`;
      if (checkedMinutesRef.current === uniqueCheckKey) return;
      checkedMinutesRef.current = uniqueCheckKey;

      // Filter tasks with reminders for today at this exact minute
      const dueTasks = tasks.filter(task => {
        if (isTaskCompletedOnDate(task, todayStr)) return false;
        if (!task.hasReminder) return false;
        if (!doesTaskMatchDate(task, todayStr)) return false;

        // Extract reminder target time
        const targetTime = task.reminderTime || task.time;
        if (!targetTime) return false;

        // Ensure HH:MM formats match
        const isTimeMatch = targetTime === currentMinStr;
        
        // Prevent double triggers
        const hasTriggered = triggeredTodayRef.current.has(`${task.id}-${todayStr}`);
        
        return isTimeMatch && !hasTriggered;
      });

      if (dueTasks.length > 0) {
        dueTasks.forEach(task => {
          triggeredTodayRef.current.add(`${task.id}-${todayStr}`);
        });
        
        setActiveReminders(prev => [...prev, ...dueTasks]);
        
        // Play repeating alarms for alerts
        playChime('alert');
        // Fallback gentle play
        setTimeout(() => playChime('alert'), 600);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [tasks]);

  const handleDismiss = (id: string) => {
    setActiveReminders(prev => prev.filter(r => r.id !== id));
    playChime('click');
  };

  const handleComplete = (id: string) => {
    const todayStr = new Date().toISOString().substring(0, 10);
    onToggleTask(id, todayStr);
    setActiveReminders(prev => prev.filter(r => r.id !== id));
    playChime('success');
  };

  const handleSnooze = (task: Task) => {
    // Snooze by shifting reminder time by 5 minutes
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    const newReminderTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    onUpdateTask(task.id, {
      reminderTime: newReminderTime,
      hasReminder: true
    });

    // Remove from active trigger so it can re-trigger in 5 mins
    const todayStr = now.toISOString().substring(0, 10);
    triggeredTodayRef.current.delete(`${task.id}-${todayStr}`);
    
    setActiveReminders(prev => prev.filter(r => r.id !== task.id));
    playChime('click');
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full" id="reminders-overlay">
      <AnimatePresence>
        {activeReminders.map(task => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, x: 50, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="bg-black border border-white/10 text-white rounded-3xl p-5 shadow-2xl flex flex-col gap-4 relative overflow-hidden"
          >
            {/* Top pulsing subtle glow decoration */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-rose-500/10 rounded-full animate-pulse" />
            
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-rose-600 text-white rounded-2xl border border-white/10 animate-bounce">
                <Bell className="w-5 h-5" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-[10px] tracking-widest text-rose-400 font-mono font-bold uppercase">
                  <span>🔔 ALARM TIME</span>
                </div>
                <h4 className="text-base font-serif font-semibold mt-2 text-white leading-relaxed break-words italic">
                  “ {task.content} ”
                </h4>
                <div className="flex items-center gap-1 mt-2 text-xs text-white/50 font-mono">
                  <Clock className="w-3.5 h-3.5" />
                  <span>SCHEDULED: {task.time || task.reminderTime}</span>
                </div>
              </div>

              <button
                onClick={() => handleDismiss(task.id)}
                className="p-1 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick action buttons */}
            <div className="flex items-center gap-2 border-t border-white/10 pt-3 text-xs">
              <button
                onClick={() => handleComplete(task.id)}
                className="flex-1 py-2 bg-white hover:bg-white/90 text-black font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors text-[10px] uppercase tracking-wider"
              >
                <Check className="w-4 h-4 text-black" />
                <span>标记完成</span>
              </button>
              
              <button
                onClick={() => handleSnooze(task)}
                className="px-3 py-2 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-colors text-[10px] uppercase tracking-wider"
                title="5分钟后再提醒我"
              >
                <span>稍后提醒 (5m)</span>
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
