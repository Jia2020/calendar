import React, { useState, useEffect } from 'react';
import CalendarView from './components/CalendarView';
import TaskList from './components/TaskList';
import ReminderSystem from './components/ReminderSystem';
import FocusMode from './components/FocusMode';
import AchievementStats from './components/AchievementStats';
import ToxicSoup from './components/ToxicSoup';
import { Task, Priority, ThemeId, ThemeConfig, RecurrenceType, Category } from './types';
import { playChime } from './components/AudioChime';
import { Sparkles, Calendar as CalendarIcon, Clock, BellRing, Brain } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'ai_voice_calendar_tasks';

const THEMES: ThemeConfig[] = [
  {
    id: 'monochrome',
    name: '墨竹玄黑',
    bgClass: 'bg-[#FAF9F6] text-[#1A1A1A]',
    accentBg: 'bg-[#F4F2EE]',
    textClass: 'text-black',
    cardBg: 'bg-white',
    borderClass: 'border-black/5',
    accentColor: 'border-black bg-black text-white',
    btnClass: 'bg-black text-white hover:bg-black/90'
  },
  {
    id: 'celadon',
    name: '青石雅绿',
    bgClass: 'bg-[#F3F6F2] text-[#1B3224]',
    accentBg: 'bg-[#E5EBE0]',
    textClass: 'text-[#1B3224]',
    cardBg: 'bg-white',
    borderClass: 'border-[#1B3224]/15',
    accentColor: 'border-[#1B3224] bg-[#1B3224] text-white',
    btnClass: 'bg-[#1B3224] text-white hover:bg-[#1B3224]/90'
  },
  {
    id: 'sand',
    name: '晨曦杏桃',
    bgClass: 'bg-[#FAF5EE] text-[#4F3621]',
    accentBg: 'bg-[#F1E6D8]',
    textClass: 'text-[#4F3621]',
    cardBg: 'bg-white',
    borderClass: 'border-[#4F3621]/15',
    accentColor: 'border-[#4F3621] bg-[#4F3621] text-white',
    btnClass: 'bg-[#4F3621] text-white hover:bg-[#4F3621]/90'
  },
  {
    id: 'indigo',
    name: '月影靛蓝',
    bgClass: 'bg-[#F1F4F9] text-[#1D293B]',
    accentBg: 'bg-[#E2E8F3]',
    textClass: 'text-[#1D293B]',
    cardBg: 'bg-white',
    borderClass: 'border-[#1D293B]/15',
    accentColor: 'border-[#1D293B] bg-[#1D293B] text-white',
    btnClass: 'bg-[#1D293B] text-white hover:bg-[#1D293B]/90'
  },
  {
    id: 'plum',
    name: '暗夜红梅',
    bgClass: 'bg-[#1A1215] text-[#F3EBF0]',
    accentBg: 'bg-[#2A1F24]',
    textClass: 'text-[#F3EBF0]',
    cardBg: 'bg-[#22191C]',
    borderClass: 'border-white/10',
    accentColor: 'border-[#E05275] bg-[#E05275] text-white',
    btnClass: 'bg-[#E05275] text-white hover:bg-[#E05275]/90'
  }
];

export default function App() {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('ai_voice_calendar_categories');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse stored categories:", e);
      }
    }
    const defaultCats: Category[] = [
      { id: 'cat-1', name: '工作 💼', color: '#3B82F6' },
      { id: 'cat-2', name: '生活 🏠', color: '#10B981' },
      { id: 'cat-3', name: '学习 📚', color: '#F59E0B' },
      { id: 'cat-4', name: '健康 🧘', color: '#EF4444' }
    ];
    localStorage.setItem('ai_voice_calendar_categories', JSON.stringify(defaultCats));
    return defaultCats;
  });
  const [themeId, setThemeId] = useState<ThemeId>(() => {
    const saved = localStorage.getItem('artistic_theme');
    return (saved as ThemeId) || 'monochrome';
  });

  // Set initial date to today (relative to current system/user local time)
  useEffect(() => {
    const todayStr = new Date().toISOString().substring(0, 10);
    setSelectedDate(todayStr);
  }, []);

  // Sync state with local storage & seed data if empty
  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      try {
        setTasks(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse stored tasks:", e);
      }
    } else {
      setTasks([]);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([]));
    }
  }, []);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const saveTasksToLocalStorage = (newTasks: Task[]) => {
    setTasks(newTasks);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newTasks));
  };

  const handleAddCategory = (name: string, color: string) => {
    const newCat: Category = {
      id: `cat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      color
    };
    const updated = [...categories, newCat];
    setCategories(updated);
    localStorage.setItem('ai_voice_calendar_categories', JSON.stringify(updated));
  };

  const handleDeleteCategory = (id: string) => {
    const updated = categories.filter(c => c.id !== id);
    setCategories(updated);
    localStorage.setItem('ai_voice_calendar_categories', JSON.stringify(updated));

    // Also update tasks that used this category to clear categoryId
    const updatedTasks = tasks.map(t => t.categoryId === id ? { ...t, categoryId: undefined } : t);
    saveTasksToLocalStorage(updatedTasks);
  };

  const handleAddTask = (taskInput: Omit<Task, 'id' | 'completed' | 'createdAt'>) => {
    const newTask: Task = {
      ...taskInput,
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      completed: false,
      createdAt: new Date().toISOString()
    };
    const updated = [...tasks, newTask];
    saveTasksToLocalStorage(updated);
  };

  const handleToggleTask = (id: string, dateStr?: string) => {
    const targetDate = dateStr || selectedDate;
    const updated = tasks.map(task => {
      if (task.id !== id) return task;

      if (task.isRecurring) {
        const completedDates = task.completedDates || [];
        const isCompleted = completedDates.includes(targetDate);
        const newCompletedDates = isCompleted
          ? completedDates.filter(d => d !== targetDate)
          : [...completedDates, targetDate];
        return {
          ...task,
          completedDates: newCompletedDates
        };
      } else {
        return {
          ...task,
          completed: !task.completed
        };
      }
    });
    saveTasksToLocalStorage(updated);
  };

  const handleDeleteTask = (id: string, onlyThisDate?: string) => {
    let updated: Task[];
    if (onlyThisDate) {
      updated = tasks.map(task => {
        if (task.id !== id) return task;
        const deletedDates = task.deletedDates || [];
        return {
          ...task,
          deletedDates: [...deletedDates, onlyThisDate]
        };
      });
    } else {
      updated = tasks.filter(task => task.id !== id);
    }
    saveTasksToLocalStorage(updated);
    playChime('click');
  };

  const handleBatchCompleteTasks = (ids: string[], dateStr: string) => {
    const targetDate = dateStr || selectedDate;
    const updated = tasks.map(task => {
      if (!ids.includes(task.id)) return task;

      if (task.isRecurring) {
        const completedDates = task.completedDates || [];
        if (!completedDates.includes(targetDate)) {
          return {
            ...task,
            completedDates: [...completedDates, targetDate]
          };
        }
        return task;
      } else {
        return {
          ...task,
          completed: true
        };
      }
    });
    saveTasksToLocalStorage(updated);
    playChime('click');
  };

  const handleBatchDeleteTasks = (ids: string[], onlyThisDate?: string) => {
    let updated: Task[];
    if (onlyThisDate) {
      updated = tasks.map(task => {
        if (!ids.includes(task.id)) return task;
        const deletedDates = task.deletedDates || [];
        if (!deletedDates.includes(onlyThisDate)) {
          return {
            ...task,
            deletedDates: [...deletedDates, onlyThisDate]
          };
        }
        return task;
      });
    } else {
      updated = tasks.filter(task => !ids.includes(task.id));
    }
    saveTasksToLocalStorage(updated);
    playChime('click');
  };

  const handleUpdateTask = (id: string, updatedFields: Partial<Task>) => {
    const updated = tasks.map(task => 
      task.id === id ? { ...task, ...updatedFields } : task
    );
    saveTasksToLocalStorage(updated);
  };

  // Callback when Voice assistant parses a task
  const handleTaskParsed = (parsed: {
    date: string;
    content: string;
    priority?: Priority;
    time?: string;
    hasReminder: boolean;
    reminderTime?: string;
    isRecurring?: boolean;
    recurrence?: RecurrenceType;
    recurrenceEndDate?: string;
  }) => {
    handleAddTask(parsed);
    // Automatically focus the calendar on the newly scheduled date
    setSelectedDate(parsed.date);
  };

  const handleDeleteMatchingTasks = (keyword: string) => {
    const cleanedKeyword = keyword.trim().toLowerCase();
    if (!cleanedKeyword) return;
    const updated = tasks.filter(task => !task.content.toLowerCase().includes(cleanedKeyword));
    saveTasksToLocalStorage(updated);
  };

  // Format header clock in Chinese
  const formatClockTime = (d: Date) => {
    return d.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatHeaderDate = (d: Date) => {
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const date = d.getDate();
    return `${year}年${month}月${date}日 ${weekdays[d.getDay()]}`;
  };

  const activeTheme = THEMES.find(t => t.id === themeId) || THEMES[0];
  const isDark = activeTheme.id === 'plum';
  const primaryText = isDark ? 'text-[#F3EBF0]' : 'text-[#1A1A1A]';
  const secondaryText = isDark ? 'text-[#F3EBF0]/60' : 'text-black/55';

  return (
    <div className={`min-h-screen ${activeTheme.bgClass} font-sans p-4 md:p-10 transition-colors duration-500`} id="app-root">
      {/* Container wrapper */}
      <div className="max-w-7xl mx-auto pt-4 md:pt-8">
        
        {/* Main Content Calendar & List Grid */}
        {selectedDate && (
          <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Calendar panel (Left Row 1) */}
            <div className="lg:col-span-7 lg:col-start-1 lg:row-start-1 flex flex-col gap-6">
              <ToxicSoup theme={activeTheme} />
              <CalendarView 
                selectedDate={selectedDate} 
                onSelectDate={setSelectedDate} 
                tasks={tasks} 
                categories={categories}
                theme={activeTheme}
              />
            </div>

            {/* Daily tasks panel (Right Spanning Row 1 & 2) */}
            <div className="lg:col-span-5 lg:col-start-8 lg:row-start-1 lg:row-span-2 h-full">
              <TaskList 
                date={selectedDate} 
                tasks={tasks} 
                categories={categories}
                onAddTask={handleAddTask}
                onToggleTask={handleToggleTask}
                onDeleteTask={handleDeleteTask}
                onUpdateTask={handleUpdateTask}
                onBatchCompleteTasks={handleBatchCompleteTasks}
                onBatchDeleteTasks={handleBatchDeleteTasks}
                onAddCategory={handleAddCategory}
                onDeleteCategory={handleDeleteCategory}
                theme={activeTheme}
              />
            </div>

            {/* Focus Mode Panel (Left Row 2) */}
            <div className="lg:col-span-7 lg:col-start-1 lg:row-start-2">
              <FocusMode 
                tasks={tasks}
                theme={activeTheme}
                onToggleTask={handleToggleTask}
              />
            </div>

            {/* Achievement Statistics Panel (Full Width Bottom) */}
            <div className="lg:col-span-12 mt-2">
              <AchievementStats 
                tasks={tasks}
                theme={activeTheme}
              />
            </div>
          </main>
        )}
      </div>

      {/* Global In-app Reminder triggers */}
      <ReminderSystem 
        tasks={tasks} 
        onToggleTask={handleToggleTask} 
        onUpdateTask={handleUpdateTask} 
      />
    </div>
  );
}
