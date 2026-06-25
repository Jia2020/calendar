import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Check, Trash2, Clock, Bell, AlertTriangle, 
  ArrowUpDown, CheckCircle, Circle, Edit3, Save, X, Repeat, Mic, MicOff,
  Square, CheckSquare
} from 'lucide-react';
import { Task, Priority, ThemeConfig, RecurrenceType, Category } from '../types';
import { playChime } from './AudioChime';
import { doesTaskMatchDate, isTaskCompletedOnDate } from '../utils/taskUtils';

const WEEK_DAYS = [
  { label: '一', value: 1 },
  { label: '二', value: 2 },
  { label: '三', value: 3 },
  { label: '四', value: 4 },
  { label: '五', value: 5 },
  { label: '六', value: 6 },
  { label: '日', value: 0 },
];

interface TaskListProps {
  date: string; // YYYY-MM-DD
  tasks: Task[];
  categories: Category[];
  onAddTask: (task: Omit<Task, 'id' | 'completed' | 'createdAt'>) => void;
  onToggleTask: (id: string, dateStr?: string) => void;
  onDeleteTask: (id: string, onlyThisDate?: string) => void;
  onUpdateTask: (id: string, updated: Partial<Task>) => void;
  onBatchCompleteTasks?: (ids: string[], dateStr: string) => void;
  onBatchDeleteTasks?: (ids: string[], onlyThisDate?: string) => void;
  onAddCategory: (name: string, color: string) => void;
  onDeleteCategory: (id: string) => void;
  theme?: ThemeConfig;
}

type SortBy = 'time' | 'status';

export default function TaskList({ 
  date, 
  tasks, 
  categories,
  onAddTask, 
  onToggleTask, 
  onDeleteTask, 
  onUpdateTask,
  onBatchCompleteTasks,
  onBatchDeleteTasks,
  onAddCategory,
  onDeleteCategory,
  theme
}: TaskListProps) {
  const activeTheme = theme || {
    id: 'monochrome',
    name: '墨竹玄黑',
    bgClass: 'bg-[#FAF9F6] text-[#1A1A1A]',
    accentBg: 'bg-[#F4F2EE]',
    textClass: 'text-black',
    cardBg: 'bg-white',
    borderClass: 'border-black/5',
    accentColor: 'border-black bg-black text-white',
    btnClass: 'bg-black text-white hover:bg-black/90'
  };
  const isDark = activeTheme.id === 'plum';
  // Manual adding form state
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [time, setTime] = useState('');
  const [hasReminder, setHasReminder] = useState(false);
  const [reminderTime, setReminderTime] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);
  const [recurrenceStartDate, setRecurrenceStartDate] = useState(date);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Sync recurrence start date with active calendar date
  useEffect(() => {
    setRecurrenceStartDate(date);
  }, [date]);

  const toggleRecurrenceDay = (day: number) => {
    setRecurrenceDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  };

  // Custom Category and custom color picker states
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined);
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#E05275');
  const [filterCategoryId, setFilterCategoryId] = useState<string | undefined>(undefined);
  
  // For editing
  const [editCategoryId, setEditCategoryId] = useState<string | undefined>(undefined);

  // Speech Recognition State & Handler
  const [isListening, setIsListening] = useState(false);
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);

  const toggleListening = () => {
    if (isListening) {
      if (recognitionInstance) {
        recognitionInstance.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("您的浏览器或设备暂不支持网页语音录入功能。推荐在最新版 Chrome, Edge 或 Safari 浏览器中体验此功能。");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'zh-CN';
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsListening(true);
        playChime('click');
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');
        setContent(transcript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
      setRecognitionInstance(recognition);
    } catch (err) {
      console.error(err);
      setIsListening(false);
    }
  };

  // Edit task state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editPriority, setEditPriority] = useState<Priority>('medium');
  const [editTime, setEditTime] = useState('');
  const [editHasReminder, setEditHasReminder] = useState(false);
  const [editReminderTime, setEditReminderTime] = useState('');
  const [editIsRecurring, setEditIsRecurring] = useState(false);
  const [editRecurrence, setEditRecurrence] = useState<RecurrenceType>('none');
  const [editRecurrenceDays, setEditRecurrenceDays] = useState<number[]>([]);
  const [editRecurrenceStartDate, setEditRecurrenceStartDate] = useState('');
  const [editRecurrenceEndDate, setEditRecurrenceEndDate] = useState('');

  const toggleEditRecurrenceDay = (day: number) => {
    setEditRecurrenceDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  };

  // Sorting state
  const [sortBy, setSortBy] = useState<SortBy>('time');

  // Deletion choice state for recurring tasks
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

  // Edit mode and selection state
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [batchHasRecurring, setBatchHasRecurring] = useState(false);

  const toggleSelectTask = (taskId: string) => {
    setSelectedIds(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
    playChime('click');
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === dayTasks.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(dayTasks.map(t => t.id));
    }
    playChime('click');
  };

  const handleBatchComplete = () => {
    if (selectedIds.length === 0) return;
    onBatchCompleteTasks?.(selectedIds, date);
    setSelectedIds([]);
    setIsEditMode(false);
  };

  const handleBatchDeleteClick = () => {
    if (selectedIds.length === 0) return;
    
    // Check if any selected task is recurring
    const selectedTasks = dayTasks.filter(t => selectedIds.includes(t.id));
    const hasRecurring = selectedTasks.some(t => t.isRecurring);
    
    setBatchHasRecurring(hasRecurring);
    setIsBatchDeleting(true);
    playChime('click');
  };

  // Filter tasks for this specific date using helper
  const dayTasks = tasks.filter(t => doesTaskMatchDate(t, date));

  // Filter by custom category if active
  const filteredDayTasks = filterCategoryId
    ? dayTasks.filter(t => t.categoryId === filterCategoryId)
    : dayTasks;

  const handleAddCategory = () => {
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    onAddCategory(trimmed, newCatColor);
    setNewCatName('');
    playChime('click');
  };

  const handleRemoveCategory = (id: string) => {
    onDeleteCategory(id);
    if (selectedCategoryId === id) {
      setSelectedCategoryId(undefined);
    }
    if (filterCategoryId === id) {
      setFilterCategoryId(undefined);
    }
    if (editCategoryId === id) {
      setEditCategoryId(undefined);
    }
    playChime('click');
  };

  // Parse Chinese Date for heading
  const getFormattedDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parts[0];
    const month = parseInt(parts[1]);
    const day = parseInt(parts[2]);
    
    // Get day of week
    const d = new Date(parseInt(year), month - 1, day);
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${month}月${day}日 (${weekdays[d.getDay()]})`;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    onAddTask({
      date: isRecurring ? recurrenceStartDate : date,
      content: content.trim(),
      priority,
      time: time || undefined,
      hasReminder,
      reminderTime: hasReminder ? (reminderTime || time || undefined) : undefined,
      isRecurring,
      recurrence: isRecurring ? recurrence : 'none',
      recurrenceDays: isRecurring && recurrence === 'custom' ? recurrenceDays : undefined,
      recurrenceEndDate: isRecurring && recurrenceEndDate ? recurrenceEndDate : undefined,
      categoryId: selectedCategoryId
    });

    // Reset form
    setContent('');
    setPriority('medium');
    setTime('');
    setHasReminder(false);
    setReminderTime('');
    setIsRecurring(false);
    setRecurrence('none');
    setRecurrenceDays([]);
    setRecurrenceStartDate(date);
    setRecurrenceEndDate('');
    setIsAdding(false);
    setSelectedCategoryId(undefined);
    playChime('click');
  };

  const startEditing = (task: Task) => {
    setEditingId(task.id);
    setEditContent(task.content);
    setEditPriority(task.priority);
    setEditTime(task.time || '');
    setEditHasReminder(task.hasReminder);
    setEditReminderTime(task.reminderTime || '');
    setEditIsRecurring(task.isRecurring || false);
    setEditRecurrence(task.recurrence || 'none');
    setEditRecurrenceDays(task.recurrenceDays || []);
    setEditRecurrenceStartDate(task.date || date);
    setEditRecurrenceEndDate(task.recurrenceEndDate || '');
    setEditCategoryId(task.categoryId || undefined);
  };

  const saveEdit = (id: string) => {
    if (!editContent.trim()) return;
    onUpdateTask(id, {
      date: editIsRecurring ? editRecurrenceStartDate : date,
      content: editContent.trim(),
      priority: editPriority,
      time: editTime || undefined,
      hasReminder: editHasReminder,
      reminderTime: editHasReminder ? (editReminderTime || editTime || undefined) : undefined,
      isRecurring: editIsRecurring,
      recurrence: editIsRecurring ? editRecurrence : 'none',
      recurrenceDays: editIsRecurring && editRecurrence === 'custom' ? editRecurrenceDays : undefined,
      recurrenceEndDate: editIsRecurring && editRecurrenceEndDate ? editRecurrenceEndDate : undefined,
      categoryId: editCategoryId
    });
    setEditingId(null);
    playChime('click');
  };

  // Sort tasks
  const sortedTasks = [...filteredDayTasks].sort((a, b) => {
    if (sortBy === 'status') {
      // Uncompleted tasks first
      const completedA = isTaskCompletedOnDate(a, date);
      const completedB = isTaskCompletedOnDate(b, date);
      if (completedA !== completedB) {
        return completedA ? 1 : -1;
      }
    }

    // Default: Sort by Time (HH:MM), empty times last
    if (a.time && b.time) {
      return a.time.localeCompare(b.time);
    }
    if (a.time) return -1;
    if (b.time) return 1;

    // Fallback to creation order
    return a.createdAt.localeCompare(b.createdAt);
  });

  const getCategoryColor = (task: Task) => {
    if (task.categoryId && categories) {
      const cat = categories.find(c => c.id === task.categoryId);
      if (cat) return cat.color;
    }
    return undefined;
  };

  const getTaskCardStyle = (task: Task, completed: boolean) => {
    if (completed) {
      return isDark
        ? 'bg-[#1C1619]/10 border border-white/5 opacity-40 shadow-none'
        : 'bg-black/[0.01] border border-black/5 opacity-50 shadow-none';
    } else {
      return isDark
        ? 'bg-[#1C1619]/40 border-t border-r border-b border-white/5 shadow-[0_2px_8px_rgba(255,255,255,0.01)]'
        : 'bg-white border-t border-r border-b border-black/5 shadow-[0_2px_8px_rgba(0,0,0,0.02)]';
    }
  };

  const getStatusLampStyle = (task: Task, completed: boolean) => {
    const color = getCategoryColor(task) || (isDark ? '#E05275' : '#10B981');
    if (completed) {
      return {
        backgroundColor: `${color}30`,
        border: `1px solid ${color}40`,
        boxShadow: 'none'
      };
    } else {
      return {
        backgroundColor: color,
        border: `1px solid ${color}`,
        boxShadow: `0 0 10px ${color}80`
      };
    }
  };

  const getRecurrenceLabel = (task: Task) => {
    if (task.recurrence === 'daily') return '每天';
    if (task.recurrence === 'weekly') return '每周';
    if (task.recurrence === 'monthly') return '每月';
    if (task.recurrence === 'workday') return '工作日';
    if (task.recurrence === 'custom') {
      if (!task.recurrenceDays || task.recurrenceDays.length === 0) return '自定义';
      const dayLabels = ['日', '一', '二', '三', '四', '五', '六'];
      const sortedDays = [...task.recurrenceDays].sort((a, b) => {
        const valA = a === 0 ? 7 : a;
        const valB = b === 0 ? 7 : b;
        return valA - valB;
      });
      return '周' + sortedDays.map(d => dayLabels[d]).join('、');
    }
    return '';
  };

  return (
    <div className={`relative ${activeTheme.cardBg} rounded-3xl border ${activeTheme.borderClass} shadow-sm p-6 flex flex-col h-full min-h-[480px] transition-colors duration-500`}>
      {/* Choice Modal for Deleting Recurring Tasks */}
      <AnimatePresence>
        {deletingTask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 rounded-3xl"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-xs ${isDark ? 'bg-[#1F171B] border-white/10' : 'bg-white border-black/10'} border rounded-2xl p-5 shadow-2xl flex flex-col gap-4 text-center`}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-rose-500" />
                </div>
                <h4 className={`text-sm font-bold font-serif ${isDark ? 'text-white' : 'text-[#1A1A1A]'}`}>
                  删除周期性任务
                </h4>
                <p className={`text-xs leading-relaxed ${isDark ? 'text-[#F3EBF0]/60' : 'text-black/60'}`}>
                  任务 “<span className="font-bold">{deletingTask.content}</span>” 是一个周期重复事件。您希望如何删除该事件？
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onDeleteTask(deletingTask.id, date);
                    setDeletingTask(null);
                  }}
                  className={`w-full py-2.5 rounded-xl border font-semibold text-xs cursor-pointer transition-colors ${
                    isDark 
                      ? 'border-white/15 bg-white/5 hover:bg-white/10 text-white' 
                      : 'border-black/10 bg-black/5 hover:bg-black/10 text-black'
                  }`}
                >
                  仅删除今天 ({getFormattedDate(date).split(' ')[0]})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteTask(deletingTask.id);
                    setDeletingTask(null);
                  }}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs text-white cursor-pointer transition-colors ${
                    isDark ? 'bg-[#E05275] hover:bg-[#E05275]/90' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  全部删除 (所有日期)
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingTask(null)}
                  className={`w-full py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                    isDark ? 'text-[#F3EBF0]/40 hover:text-white' : 'text-black/40 hover:text-black'
                  }`}
                >
                  取消
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isBatchDeleting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 rounded-3xl"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-xs ${isDark ? 'bg-[#1F171B] border-white/10' : 'bg-white border-black/10'} border rounded-2xl p-5 shadow-2xl flex flex-col gap-4 text-center`}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-rose-500" />
                </div>
                <h4 className={`text-sm font-bold font-serif ${isDark ? 'text-white' : 'text-[#1A1A1A]'}`}>
                  批量删除任务
                </h4>
                <p className={`text-xs leading-relaxed ${isDark ? 'text-[#F3EBF0]/60' : 'text-black/60'}`}>
                  您已选中 <span className="font-bold text-[#E05275]">{selectedIds.length}</span> 个日程。确定要执行批量删除吗？
                  {batchHasRecurring && (
                    <span className="block mt-2 font-semibold text-amber-500">
                      ⚠️ 选中的日程中包含周期性重复任务。
                    </span>
                  )}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                {batchHasRecurring ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        onBatchDeleteTasks?.(selectedIds, date);
                        setSelectedIds([]);
                        setIsEditMode(false);
                        setIsBatchDeleting(false);
                      }}
                      className={`w-full py-2.5 rounded-xl border font-semibold text-xs cursor-pointer transition-colors ${
                        isDark 
                          ? 'border-white/15 bg-white/5 hover:bg-white/10 text-white' 
                          : 'border-black/10 bg-black/5 hover:bg-black/10 text-black'
                      }`}
                    >
                      仅删除今天 ({getFormattedDate(date).split(' ')[0]})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onBatchDeleteTasks?.(selectedIds);
                        setSelectedIds([]);
                        setIsEditMode(false);
                        setIsBatchDeleting(false);
                      }}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs text-white cursor-pointer transition-colors ${
                        isDark ? 'bg-[#E05275] hover:bg-[#E05275]/90' : 'bg-rose-600 hover:bg-rose-700'
                      }`}
                    >
                      全部删除 (包括所有未来重复日程)
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onBatchDeleteTasks?.(selectedIds);
                      setSelectedIds([]);
                      setIsEditMode(false);
                      setIsBatchDeleting(false);
                    }}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs text-white cursor-pointer transition-colors ${
                      isDark ? 'bg-[#E05275] hover:bg-[#E05275]/90' : 'bg-rose-600 hover:bg-rose-700'
                    }`}
                  >
                    确定删除
                  </button>
                )}
                
                <button
                  type="button"
                  onClick={() => setIsBatchDeleting(false)}
                  className={`w-full py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                    isDark ? 'text-[#F3EBF0]/40 hover:text-white' : 'text-black/40 hover:text-black'
                  }`}
                >
                  取消
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List Header */}
      <div className={`flex items-center justify-between pb-4 border-b ${activeTheme.borderClass} mb-4`}>
        <div>
          <span className={`text-[10px] font-mono tracking-widest uppercase font-bold px-3 py-1 rounded-full ${
            isDark ? 'text-[#F3EBF0]/70 bg-white/10' : 'text-black/55 bg-black/5'
          }`}>
            DAILY DOSSIER
          </span>
          <h3 className={`text-2xl font-serif font-black ${isDark ? 'text-[#F3EBF0]' : 'text-black'} mt-2`}>
            {getFormattedDate(date)}
          </h3>
        </div>

        {/* Sorting controls and Edit Mode triggers */}
        <div className="flex items-center gap-2">
          {dayTasks.length > 1 && !isEditMode && (
            <div className={`flex items-center border ${
              isDark ? 'border-white/10 bg-[#22191C]' : 'border-black/10 bg-[#FAF9F6]'
            } rounded-xl p-0.5 text-[10px] tracking-wider uppercase font-bold ${
              isDark ? 'text-[#F3EBF0]/60' : 'text-black/50'
            }`}>
              <button
                onClick={() => { setSortBy('time'); playChime('click'); }}
                className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                  sortBy === 'time'
                    ? isDark ? 'bg-[#E05275] text-white font-bold' : 'bg-black text-white font-bold'
                    : isDark ? 'hover:text-[#F3EBF0]' : 'hover:text-black'
                }`}
              >
                时间
              </button>
              <button
                onClick={() => { setSortBy('status'); playChime('click'); }}
                className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                  sortBy === 'status'
                    ? isDark ? 'bg-[#E05275] text-white font-bold' : 'bg-black text-white font-bold'
                    : isDark ? 'hover:text-[#F3EBF0]' : 'hover:text-black'
                }`}
              >
                状态
              </button>
            </div>
          )}

          {dayTasks.length > 0 && (
            <button
              onClick={() => {
                setIsEditMode(!isEditMode);
                setSelectedIds([]);
                playChime('click');
              }}
              className={`px-3 py-1.5 rounded-xl border text-[10px] tracking-wider uppercase font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                isEditMode
                  ? isDark 
                    ? 'border-[#E05275] bg-[#E05275]/10 text-[#E05275]' 
                    : 'border-black bg-black/5 text-black'
                  : isDark
                    ? 'border-white/10 hover:border-white/20 text-[#F3EBF0]/80'
                    : 'border-black/10 hover:border-black/20 text-black/80'
              }`}
            >
              <span>{isEditMode ? '退出管理' : '批量管理'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2.5 mb-3 select-none no-scrollbar">
        <button
          onClick={() => { setFilterCategoryId(undefined); playChime('click'); }}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border shrink-0 ${
            !filterCategoryId
              ? isDark ? 'bg-white text-neutral-900 border-white' : 'bg-black text-white border-black'
              : isDark ? 'border-white/10 text-neutral-400 hover:text-neutral-200 bg-white/5' : 'border-black/5 text-neutral-500 hover:text-neutral-800 bg-black/[0.02]'
          }`}
        >
          全部 📌
        </button>
        {categories.map(cat => {
          const isSelected = filterCategoryId === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => { setFilterCategoryId(cat.id); playChime('click'); }}
              className="px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 shrink-0"
              style={{
                borderColor: isSelected ? cat.color : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                backgroundColor: isSelected ? `${cat.color}20` : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                color: isSelected ? cat.color : isDark ? '#A3A3A3' : '#6B7280'
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Select All and Actions bar inside Edit Mode */}
      {isEditMode && dayTasks.length > 0 && (
        <div className={`flex items-center justify-between px-3 py-2 mb-4 rounded-xl text-xs font-serif ${
          isDark ? 'bg-white/5 border border-white/5' : 'bg-[#F4F2EE] border border-black/5'
        }`}>
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleSelectAll}
              className={`p-1 flex items-center gap-1.5 font-bold cursor-pointer transition-colors ${
                isDark ? 'text-[#F3EBF0] hover:text-white' : 'text-black hover:text-black/80'
              }`}
            >
              {selectedIds.length === dayTasks.length ? (
                <CheckSquare className="w-4 h-4 text-[#E05275]" />
              ) : (
                <Square className={`w-4 h-4 ${isDark ? 'text-white/40' : 'text-black/40'}`} />
              )}
              <span>{selectedIds.length === dayTasks.length ? '取消全选' : '全选所有'}</span>
            </button>
            <span className={`text-[10px] font-mono font-bold ${isDark ? 'text-[#F3EBF0]/40' : 'text-black/40'}`}>
              已选 {selectedIds.length} 项
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleBatchComplete}
              disabled={selectedIds.length === 0}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-sans font-bold tracking-wider uppercase transition-colors cursor-pointer flex items-center gap-1 ${
                selectedIds.length === 0
                  ? isDark ? 'text-white/20 bg-white/5 cursor-not-allowed opacity-40' : 'text-black/20 bg-black/5 cursor-not-allowed opacity-40'
                  : isDark 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-400/20 hover:bg-emerald-500/30' 
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <Check className="w-3 h-3" />
              <span>完成</span>
            </button>
            <button
              onClick={handleBatchDeleteClick}
              disabled={selectedIds.length === 0}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-sans font-bold tracking-wider uppercase transition-colors cursor-pointer flex items-center gap-1 ${
                selectedIds.length === 0
                  ? isDark ? 'text-white/20 bg-white/5 cursor-not-allowed opacity-40' : 'text-black/20 bg-black/5 cursor-not-allowed opacity-40'
                  : isDark 
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-400/20 hover:bg-rose-500/30' 
                    : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
              }`}
            >
              <Trash2 className="w-3 h-3" />
              <span>删除</span>
            </button>
          </div>
        </div>
      )}

      {/* Task List container */}
      <div className="flex-1 overflow-y-auto max-h-[340px] pr-1 space-y-1" id="task-scroller">
        {dayTasks.length === 0 ? (
          <div className={`h-full flex flex-col items-center justify-center text-center py-14 ${isDark ? 'text-[#F3EBF0]/40' : 'text-black/40'}`}>
            <div className={`w-12 h-12 rounded-2xl ${activeTheme.accentBg} flex items-center justify-center mb-3`}>
              <Check className={`w-5 h-5 ${isDark ? 'text-white/30' : 'text-black/30'}`} />
            </div>
            <p className={`text-sm font-serif italic ${isDark ? 'text-[#F3EBF0]/85' : 'text-black/80'} font-medium`}>今日暂无日程安排</p>
            <p className={`text-[10px] tracking-widest uppercase font-mono mt-1 ${isDark ? 'text-[#F3EBF0]/30' : 'text-black/30'}`}>
              请点击下方手动录入，或直接说出任务
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {sortedTasks.map((task) => (
              <motion.div
                key={task.id}
                layoutId={`task-${task.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                onClick={() => {
                  if (isEditMode) {
                    toggleSelectTask(task.id);
                  }
                }}
                className={`group py-4.5 px-4 -mx-4 rounded-xl flex flex-col gap-1.5 relative transition-all duration-300 ${
                  isEditMode ? 'cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02]' : ''
                } ${
                  isEditMode && selectedIds.includes(task.id)
                    ? isDark
                      ? 'ring-2 ring-[#E05275]/50 bg-white/5'
                      : 'ring-2 ring-black/30 bg-black/[0.02]'
                    : ''
                } ${
                  getTaskCardStyle(task, isTaskCompletedOnDate(task, date))
                }`}
                style={{
                  borderLeft: isTaskCompletedOnDate(task, date)
                    ? 'none'
                    : `4px solid ${getCategoryColor(task) || (isDark ? '#E05275' : '#71717a')}`
                }}
                id={`task-item-${task.id}`}
              >
                {editingId === task.id ? (
                  /* Editing Mode Form */
                  <div className={`space-y-3 p-3 ${isDark ? 'bg-white/5 border border-white/5 text-[#F3EBF0]' : 'bg-[#F4F2EE] border border-black/5 text-[#1A1A1A]'} rounded-2xl`}>
                    <input
                      type="text"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className={`w-full text-sm font-medium border ${isDark ? 'border-white/10 bg-[#1C1619] text-[#F3EBF0]' : 'border-black/10 bg-white text-black'} rounded-xl px-3 py-2 focus:outline-none`}
                    />
                    
                    <div className="grid grid-cols-1 gap-2 text-xs">
                      <div className="hidden">
                        <label className={`block ${isDark ? 'text-[#F3EBF0]/60' : 'text-black/50'} font-bold mb-1`}>优先级</label>
                        <select
                           value={editPriority}
                           onChange={(e) => setEditPriority(e.target.value as Priority)}
                           className={`w-full border ${isDark ? 'border-white/10 bg-[#1C1619] text-[#F3EBF0]' : 'border-black/10 bg-white text-black'} rounded-xl px-2 py-1.5 font-semibold`}
                        >
                          <option value="high" className="text-black">🔴 高优先级</option>
                          <option value="medium" className="text-black">🟡 中优先级</option>
                          <option value="low" className="text-black">🟢 低优先级</option>
                        </select>
                      </div>

                      <div>
                        <label className={`block ${isDark ? 'text-[#F3EBF0]/60' : 'text-black/50'} font-bold mb-1`}>执行时间</label>
                        <input
                          type="time"
                          value={editTime}
                          onChange={(e) => setEditTime(e.target.value)}
                          className={`w-full border ${isDark ? 'border-white/10 bg-[#1C1619] text-[#F3EBF0]' : 'border-black/10 bg-white text-black'} rounded-xl px-2 py-1.5 font-mono`}
                        />
                      </div>
                    </div>

                    {/* Edit Recurrence */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <label className={`flex items-center gap-1.5 ${isDark ? 'text-[#F3EBF0]/80' : 'text-black'} cursor-pointer font-bold`}>
                          <input
                            type="checkbox"
                            checked={editIsRecurring}
                            onChange={(e) => setEditIsRecurring(e.target.checked)}
                            className="rounded border-black/20 text-[#E05275] focus:ring-[#E05275]"
                          />
                          <span>周期性重复</span>
                        </label>
                      </div>
                      {editIsRecurring && (
                        <div>
                          <select
                            value={editRecurrence}
                            onChange={(e) => setEditRecurrence(e.target.value as RecurrenceType)}
                            className={`w-full border ${isDark ? 'border-white/10 bg-[#1C1619] text-[#F3EBF0]' : 'border-black/10 bg-white text-black'} rounded-xl px-2 py-1.5 font-semibold`}
                          >
                            <option value="daily">每天</option>
                            <option value="weekly">每周</option>
                            <option value="monthly">每月</option>
                            <option value="workday">工作日 (周一至周五)</option>
                            <option value="custom">自定义每周重复天</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {editIsRecurring && (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className={`block ${isDark ? 'text-[#F3EBF0]/60' : 'text-black/50'} font-bold mb-1`}>开始日期</label>
                          <input
                            type="date"
                            value={editRecurrenceStartDate}
                            onChange={(e) => setEditRecurrenceStartDate(e.target.value)}
                            className={`w-full border ${isDark ? 'border-white/10 bg-[#1C1619] text-[#F3EBF0]' : 'border-black/10 bg-white text-black'} rounded-xl px-2 py-1.5 font-mono`}
                          />
                        </div>
                        <div>
                          <label className={`block ${isDark ? 'text-[#F3EBF0]/60' : 'text-black/50'} font-bold mb-1`}>结束日期</label>
                          <input
                            type="date"
                            value={editRecurrenceEndDate}
                            onChange={(e) => setEditRecurrenceEndDate(e.target.value)}
                            className={`w-full border ${isDark ? 'border-white/10 bg-[#1C1619] text-[#F3EBF0]' : 'border-black/10 bg-white text-black'} rounded-xl px-2 py-1.5 font-mono`}
                          />
                        </div>
                      </div>
                    )}

                    {editIsRecurring && editRecurrence === 'custom' && (
                      <div className="text-xs pt-1">
                        <label className={`block ${isDark ? 'text-[#F3EBF0]/60' : 'text-black/50'} font-bold mb-2`}>
                          选择重复星期
                        </label>
                        <div className="flex gap-1.5 items-center justify-between">
                          {WEEK_DAYS.map((day) => {
                            const isSelected = editRecurrenceDays.includes(day.value);
                            return (
                              <button
                                key={day.value}
                                type="button"
                                onClick={() => toggleEditRecurrenceDay(day.value)}
                                className={`w-8 h-8 rounded-full border text-xs font-bold transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                                  isSelected
                                    ? isDark
                                      ? 'bg-[#E05275] text-white border-[#E05275] shadow-md shadow-[#E05275]/25'
                                      : 'bg-black text-white border-black shadow-sm'
                                    : isDark
                                      ? 'border-white/10 text-[#F3EBF0]/60'
                                      : 'border-black/10 text-black/60'
                                }`}
                              >
                                {day.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3 pt-1 text-xs">
                      <label className={`flex items-center gap-1.5 ${isDark ? 'text-[#F3EBF0]/80' : 'text-black'} cursor-pointer`}>
                        <input
                          type="checkbox"
                          checked={editHasReminder}
                          onChange={(e) => setEditHasReminder(e.target.checked)}
                          className="rounded border-black/20 text-black focus:ring-black"
                        />
                        <span className="font-semibold">开启提醒功能</span>
                      </label>
                      {editHasReminder && (
                        <input
                          type="time"
                          value={editReminderTime}
                          onChange={(e) => setEditReminderTime(e.target.value)}
                          className={`border ${isDark ? 'border-white/10 bg-[#1C1619] text-[#F3EBF0]' : 'border-black/10 bg-white text-black'} rounded-lg px-2 py-1 font-mono`}
                        />
                      )}
                    </div>

                    {/* Edit Category selection */}
                    <div className="text-xs pt-1">
                      <label className={`block ${isDark ? 'text-[#F3EBF0]/60' : 'text-black/50'} font-bold mb-1`}>任务分类</label>
                      <select
                        value={editCategoryId || ""}
                        onChange={(e) => setEditCategoryId(e.target.value || undefined)}
                        className={`w-full border ${isDark ? 'border-white/10 bg-[#1C1619] text-[#F3EBF0]' : 'border-black/10 bg-white text-black'} rounded-xl px-2 py-1.5 font-semibold`}
                      >
                        <option value="">无分类</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id} className="text-black">
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2 justify-end pt-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className={`px-3.5 py-1.5 rounded-xl border ${isDark ? 'border-white/10 hover:bg-white/5 text-[#F3EBF0]/70' : 'border-black/10 hover:bg-black/5 text-black/70'} font-semibold cursor-pointer text-xs`}
                      >
                        取消
                      </button>
                      <button
                        onClick={() => saveEdit(task.id)}
                        className={`px-3.5 py-1.5 rounded-xl ${isDark ? 'bg-[#E05275] hover:bg-[#E05275]/90 text-white' : 'bg-black hover:bg-black/90 text-white'} font-semibold cursor-pointer text-xs flex items-center gap-1`}
                      >
                        <Save className="w-3.5 h-3.5" />
                        保存
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Standard Display Mode */
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Interactive Custom Check Box or Select Box */}
                      {isEditMode ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation(); // prevent double toggle
                            toggleSelectTask(task.id);
                          }}
                          className={`p-1 -ml-1 transition-colors cursor-pointer shrink-0 ${
                            isDark ? 'text-[#E05275] hover:text-[#E05275]/85' : 'text-black hover:text-black/85'
                          }`}
                        >
                          {selectedIds.includes(task.id) ? (
                            <CheckSquare className="w-5 h-5" />
                          ) : (
                            <Square className={`w-5 h-5 ${isDark ? 'text-white/20 hover:text-white/60' : 'text-black/20 hover:text-black/60'}`} />
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => onToggleTask(task.id, date)}
                          className={`p-1 -ml-1 ${isDark ? 'text-white/40 hover:text-white' : 'text-black/40 hover:text-black'} transition-colors cursor-pointer shrink-0`}
                          id={`task-check-${task.id}`}
                        >
                          {isTaskCompletedOnDate(task, date) ? (
                            <CheckCircle className={`w-5 h-5 ${isDark ? 'text-white/60' : 'text-black/60'}`} />
                          ) : (
                            <Circle className={`w-5 h-5 ${isDark ? 'text-white/20 hover:text-white/60' : 'text-black/20 hover:text-black/60'}`} />
                          )}
                        </button>
                      )}

                      {/* Dynamic LED Status Lamp Indicator (亮灯与暗灯) */}
                      <div className="flex items-center shrink-0" title={isTaskCompletedOnDate(task, date) ? "已完成 (暗灯)" : "进行中 (亮灯)"}>
                        <span 
                          className="w-3.5 h-3.5 rounded-full transition-all duration-500 block" 
                          style={getStatusLampStyle(task, isTaskCompletedOnDate(task, date))}
                        />
                      </div>

                      {/* Display execution time on left */}
                      <span className={`text-xs font-mono font-bold ${isDark ? 'text-white/30' : 'text-black/30'} shrink-0 select-none`}>
                        {task.time || "—:—"}
                      </span>

                      {/* Content text */}
                      <p className={`text-[15px] font-serif font-semibold tracking-tight group-hover:translate-x-1 transition-transform duration-150 leading-relaxed break-words truncate-2-lines flex-1 ${
                        isTaskCompletedOnDate(task, date) 
                          ? isDark 
                            ? 'line-through text-[#F3EBF0]/45 decoration-[#F3EBF0]/30' 
                            : 'line-through text-black/45 decoration-black/30' 
                          : isDark 
                            ? 'text-[#F3EBF0]' 
                            : 'text-black/90'
                      }`}>
                        {task.content}
                      </p>
                    </div>

                    {/* Right side widgets */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Recurrence Badge */}
                      {task.isRecurring && task.recurrence && task.recurrence !== 'none' && (
                        <span className={`px-2 py-0.5 text-[9px] font-mono font-black uppercase tracking-tighter rounded-md flex items-center gap-1 shrink-0 ${
                          isDark 
                            ? 'bg-[#E05275]/20 text-[#E05275] border border-[#E05275]/35' 
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`} title={`重复周期: ${getRecurrenceLabel(task)}${task.date ? ` (从 ${task.date} 开始)` : ''}${task.recurrenceEndDate ? ` (到 ${task.recurrenceEndDate} 结束)` : ' (无期限)'}`}>
                          <Repeat className="w-2.5 h-2.5 animate-spin-slow" />
                          <span>{getRecurrenceLabel(task)}</span>
                        </span>
                      )}

                      {/* Custom Category Badge */}
                      {task.categoryId && (
                        (() => {
                          const cat = categories.find(c => c.id === task.categoryId);
                          if (!cat) return null;
                          return (
                            <span 
                              className="px-2 py-0.5 text-[9px] font-bold rounded flex items-center gap-1 shrink-0 border select-none"
                              style={{
                                backgroundColor: `${cat.color}15`,
                                borderColor: `${cat.color}40`,
                                color: cat.color
                              }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                              <span>{cat.name}</span>
                            </span>
                          );
                        })()
                      )}

                      {/* Reminder Info */}
                      {task.hasReminder && (
                        <span className={`text-xs font-mono ${isDark ? 'opacity-50' : 'opacity-40'} flex items-center gap-0.5`} title={`提醒时间: ${task.reminderTime || task.time}`}>
                          🔔 {task.reminderTime || task.time || '00:00'}
                        </span>
                      )}

                      {/* Actions hover menu */}
                      {!isEditMode && (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditing(task);
                            }}
                            className={`p-1 rounded transition-colors cursor-pointer ${
                              isDark ? 'hover:bg-white/5 text-white/40 hover:text-white' : 'hover:bg-black/5 text-black/40 hover:text-black'
                            }`}
                            title="编辑任务"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (task.isRecurring && task.recurrence && task.recurrence !== 'none') {
                                setDeletingTask(task);
                              } else {
                                onDeleteTask(task.id);
                              }
                              playChime('click');
                            }}
                            className={`p-1 rounded transition-colors cursor-pointer ${
                              isDark ? 'hover:bg-rose-950/20 text-white/40 hover:text-rose-400' : 'hover:bg-rose-50 text-black/40 hover:text-rose-600'
                            }`}
                            title="删除任务"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Adding Box Button / Trigger form */}
      <div className={`mt-4 pt-4 border-t ${activeTheme.borderClass}`}>
        {!isAdding ? (
          <button
            onClick={() => { setIsAdding(true); playChime('click'); }}
            className={`w-full py-3.5 border border-dashed ${
              isDark 
                ? 'border-white/20 hover:border-[#E05275] text-[#F3EBF0] hover:bg-[#E05275] hover:text-white' 
                : 'border-black/20 hover:border-black text-black hover:bg-black hover:text-white'
            } rounded-2xl flex items-center justify-center gap-2 text-[10px] tracking-[0.2em] font-black uppercase transition-all cursor-pointer bg-transparent`}
            id="add-task-trigger-btn"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>手动添加任务</span>
          </button>
        ) : (
          <motion.form 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleFormSubmit} 
            className={`p-5 border ${isDark ? 'bg-white/5 border-white/5 text-[#F3EBF0]' : 'bg-[#F4F2EE] border-black/5 text-[#1A1A1A]'} rounded-2xl space-y-4`}
            id="task-add-form"
          >
            <div className="flex items-center justify-between pb-1">
              <span className={`text-[10px] tracking-widest font-mono font-bold ${isDark ? 'text-[#F3EBF0]/50' : 'text-black/50'} uppercase`}>NEW SCHEDULE</span>
              <button 
                type="button" 
                onClick={() => setIsAdding(false)}
                className={`p-1 rounded cursor-pointer ${isDark ? 'hover:bg-white/5 text-white/40 hover:text-white' : 'hover:bg-black/5 text-black/40 hover:text-black'}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="relative flex items-center">
              <input
                type="text"
                placeholder={isListening ? "正在倾听，请说话..." : "安排什么日程？例如：下午4点与设计师见面..."}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className={`w-full text-sm font-serif border ${
                  isListening 
                    ? 'border-[#E05275] ring-2 ring-[#E05275]/20 animate-pulse' 
                    : isDark ? 'border-white/10' : 'border-black/10'
                } ${isDark ? 'bg-[#1C1619] text-[#F3EBF0]' : 'bg-white text-[#1A1A1A]'} rounded-xl pl-3 pr-12 py-2.5 focus:outline-none transition-all duration-300`}
                required
                autoFocus
              />
              <button
                type="button"
                onClick={toggleListening}
                className={`absolute right-2.5 p-2 rounded-lg transition-all cursor-pointer ${
                  isListening 
                    ? 'bg-[#E05275] text-white shadow-lg shadow-[#E05275]/30' 
                    : isDark 
                      ? 'hover:bg-white/10 text-[#F3EBF0]/60 hover:text-white' 
                      : 'hover:bg-black/5 text-black/60 hover:text-black'
                }`}
                title={isListening ? "停止语音输入" : "语音输入转文字"}
              >
                {isListening ? (
                  <div className="relative flex items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-3.5 w-3.5 rounded-full bg-white opacity-75"></span>
                    <Mic className="w-4 h-4 z-10" />
                  </div>
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 text-xs">
              <div className="hidden">
                <label className={`block ${isDark ? 'text-[#F3EBF0]/60' : 'text-black/50'} font-mono font-bold mb-1 uppercase tracking-wider text-[9px]`}>Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className={`w-full border ${isDark ? 'border-white/10 bg-[#1C1619] text-[#F3EBF0]' : 'border-black/10 bg-white text-[#1A1A1A]'} rounded-xl px-2 py-1.5 font-medium`}
                >
                  <option value="high" className="text-black">🔴 高优先级</option>
                  <option value="medium" className="text-black">🟡 中优先级</option>
                  <option value="low" className="text-black">🟢 低优先级</option>
                </select>
              </div>

              <div>
                <label className={`block ${isDark ? 'text-[#F3EBF0]/60' : 'text-black/50'} font-mono font-bold mb-1 uppercase tracking-wider text-[9px]`}>Start Time</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className={`w-full border ${isDark ? 'border-white/10 bg-[#1C1619] text-[#F3EBF0]' : 'border-black/10 bg-white text-[#1A1A1A]'} rounded-xl px-2 py-1.5 font-mono`}
                />
              </div>
            </div>

            {/* Recurrence Selector */}
            <div className="grid grid-cols-2 gap-2 text-xs border-t border-b border-black/[0.03] py-2">
              <div className="flex items-center">
                <label className={`flex items-center gap-1.5 ${isDark ? 'text-[#F3EBF0]/80' : 'text-black'} cursor-pointer font-bold`}>
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    className="rounded border-black/20 text-[#E05275] focus:ring-[#E05275]"
                  />
                  <span>开启周期性重复</span>
                </label>
              </div>
              {isRecurring && (
                <div>
                  <label className={`block ${isDark ? 'text-[#F3EBF0]/60' : 'text-black/50'} font-mono font-bold mb-1 uppercase tracking-wider text-[9px]`}>RECURRENCE FREQUENCY</label>
                  <select
                    value={recurrence}
                    onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}
                    className={`w-full border ${isDark ? 'border-white/10 bg-[#1C1619] text-[#F3EBF0]' : 'border-black/10 bg-white text-[#1A1A1A]'} rounded-xl px-2 py-1.5 font-medium`}
                  >
                    <option value="daily">每天</option>
                    <option value="weekly">每周</option>
                    <option value="monthly">每月</option>
                    <option value="workday">工作日 (周一至周五)</option>
                    <option value="custom">自定义每周重复天</option>
                  </select>
                </div>
              )}
            </div>

            {isRecurring && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className={`block ${isDark ? 'text-[#F3EBF0]/60' : 'text-black/50'} font-mono font-bold mb-1 uppercase tracking-wider text-[9px]`}>开始日期 / START DATE</label>
                  <input
                    type="date"
                    value={recurrenceStartDate}
                    onChange={(e) => setRecurrenceStartDate(e.target.value)}
                    className={`w-full border ${isDark ? 'border-white/10 bg-[#1C1619] text-[#F3EBF0]' : 'border-black/10 bg-white text-black'} rounded-xl px-2 py-1.5 font-mono`}
                  />
                </div>
                <div>
                  <label className={`block ${isDark ? 'text-[#F3EBF0]/60' : 'text-black/50'} font-mono font-bold mb-1 uppercase tracking-wider text-[9px]`}>结束日期 / END DATE</label>
                  <input
                    type="date"
                    value={recurrenceEndDate}
                    onChange={(e) => setRecurrenceEndDate(e.target.value)}
                    className={`w-full border ${isDark ? 'border-white/10 bg-[#1C1619] text-[#F3EBF0]' : 'border-black/10 bg-white text-black'} rounded-xl px-2 py-1.5 font-mono`}
                  />
                </div>
              </div>
            )}

            {isRecurring && recurrence === 'custom' && (
              <div className="text-xs pt-1">
                <label className={`block ${isDark ? 'text-[#F3EBF0]/60' : 'text-black/50'} font-mono font-bold mb-2 uppercase tracking-wider text-[9px]`}>
                  选择重复星期 / WEEKDAY SELECTION
                </label>
                <div className="flex gap-1.5 items-center justify-between">
                  {WEEK_DAYS.map((day) => {
                    const isSelected = recurrenceDays.includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleRecurrenceDay(day.value)}
                        className={`w-8 h-8 rounded-full border text-xs font-bold transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                          isSelected
                            ? isDark
                              ? 'bg-[#E05275] text-white border-[#E05275] shadow-md shadow-[#E05275]/25'
                              : 'bg-black text-white border-black shadow-sm'
                            : isDark
                              ? 'border-white/10 text-[#F3EBF0]/60'
                              : 'border-black/10 text-black/60'
                        }`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-1 text-xs">
              <label className={`flex items-center gap-1.5 ${isDark ? 'text-[#F3EBF0]/80' : 'text-black'} cursor-pointer font-medium`}>
                <input
                  type="checkbox"
                  checked={hasReminder}
                  onChange={(e) => setHasReminder(e.target.checked)}
                  className="rounded border-black/20 text-black focus:ring-black"
                />
                <span>设置时间提醒</span>
              </label>
              {hasReminder && (
                <input
                  type="time"
                  value={reminderTime || time}
                  onChange={(e) => setReminderTime(e.target.value)}
                  placeholder="时间"
                  className={`border ${isDark ? 'border-white/10 bg-[#1C1619] text-[#1A1A1A]' : 'border-black/10 bg-white text-[#1A1A1A]'} rounded-lg px-2 py-1 font-mono`}
                />
              )}
            </div>

            {/* Custom Category Selection with inline Creation & Color Picker */}
            <div className="border-t border-black/[0.03] dark:border-white/[0.03] pt-3 mt-1">
              <div className="flex items-center justify-between mb-2">
                <label className={`block ${isDark ? 'text-[#F3EBF0]/60' : 'text-black/50'} font-mono font-bold uppercase tracking-wider text-[9px]`}>
                  分类 / CATEGORY
                </label>
                <button
                  type="button"
                  onClick={() => setIsManagingCategories(!isManagingCategories)}
                  className="text-[10px] font-bold text-sky-500 hover:text-sky-600 transition-colors cursor-pointer"
                >
                  {isManagingCategories ? '返回选择' : '⚙️ 管理分类'}
                </button>
              </div>

              {isManagingCategories ? (
                <div className={`p-3 rounded-xl border ${isDark ? 'border-white/10 bg-white/5' : 'border-black/5 bg-black/[0.02]'} space-y-2.5`}>
                  <div className="text-[10px] font-bold text-neutral-400">新建分类 / Create Category</div>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="分类名称 (如: 工作, 健身)"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className={`flex-1 border text-xs ${isDark ? 'border-white/10 bg-[#1C1619] text-[#F3EBF0]' : 'border-black/10 bg-white text-black'} rounded-lg px-2.5 py-1.5 focus:outline-none`}
                    />
                    
                    {/* Native Color Picker for custom colors */}
                    <div className="flex items-center gap-1.5 shrink-0" title="选择分类颜色">
                      <input
                        type="color"
                        value={newCatColor}
                        onChange={(e) => setNewCatColor(e.target.value)}
                        className="w-8 h-8 rounded-full border border-black/10 dark:border-white/10 cursor-pointer p-0 overflow-hidden shrink-0"
                      />
                    </div>
                    
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0"
                    >
                      新建
                    </button>
                  </div>

                  {/* List of existing categories with delete button */}
                  <div className="pt-2.5 border-t border-black/[0.05] dark:border-white/[0.05]">
                    <div className="text-[10px] font-bold text-neutral-400 mb-1.5">已有分类:</div>
                    <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                      {categories.map(cat => (
                        <div key={cat.id} className="flex items-center justify-between text-[11px] font-medium px-2 py-1 rounded bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.04]">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                            <span className={isDark ? 'text-neutral-200' : 'text-neutral-700'}>{cat.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveCategory(cat.id)}
                            className="text-red-500 hover:text-red-600 p-0.5 transition-colors cursor-pointer"
                            title="删除分类"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto py-1 pr-1">
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryId(undefined)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                      !selectedCategoryId
                        ? isDark ? 'bg-white text-neutral-900 border-white' : 'bg-black text-white border-black'
                        : isDark ? 'border-white/10 bg-white/5 text-neutral-400 hover:text-neutral-200' : 'border-black/5 bg-black/[0.02] text-neutral-500 hover:text-neutral-800'
                    }`}
                  >
                    无分类
                  </button>
                  {categories.map(cat => {
                    const isSelected = selectedCategoryId === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategoryId(cat.id)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                        style={{
                          borderColor: isSelected ? cat.color : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                          backgroundColor: isSelected ? `${cat.color}20` : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                          color: isSelected ? cat.color : isDark ? '#A3A3A3' : '#6B7280'
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <span>{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="submit"
                className={`px-5 py-2.5 ${isDark ? 'bg-[#E05275] hover:bg-[#E05275]/90' : 'bg-black hover:bg-black/90'} text-white rounded-xl text-[10px] tracking-widest font-bold uppercase transition-colors cursor-pointer`}
              >
                创建任务
              </button>
            </div>
          </motion.form>
        )}
      </div>
    </div>
  );
}
