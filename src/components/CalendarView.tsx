import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Zap, 
  Sparkles, Camera, RefreshCw, X, UploadCloud, Check, HelpCircle,
  RotateCw, Grid, Crop
} from 'lucide-react';
import { Task, ThemeConfig, Category } from '../types';
import { doesTaskMatchDate, isTaskCompletedOnDate } from '../utils/taskUtils';

interface CalendarViewProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  tasks: Task[];
  categories?: Category[];
  theme?: ThemeConfig;
}

// 12 Curated highly aesthetic natural art photography backdrops
const DEFAULT_MONTH_BGS = [
  'https://cdn.mos.cms.futurecdn.net/bExixosAe6qPGSFxbmxgD4-1600-80.jpg.webp', // Jan
  'https://i.pinimg.com/736x/6b/dc/dc/6bdcdc0698042887cf2cf7bc8284baae.jpg', // Feb
  'https://www.saatchigallery.com/wp-content/smush-webp/2023/08/bunt7.png.webp', // Mar
  'https://www.saatchigallery.com/wp-content/smush-webp/2023/08/bunt6.png.webp', // Apr
  'https://www.saatchigallery.com/wp-content/smush-webp/2023/08/bunt2.png.webp', // May
  'https://www.saatchigallery.com/wp-content/smush-webp/2023/08/bunt5.png.webp', // Jun
  'https://www.saatchigallery.com/wp-content/smush-webp/2024/12/DSC_0932-1-scaled.jpg.webp', // Jul
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR4_GTykDIP_SkO3LXi-gM3ohwfF9TyOLHrGo2t3eONWNBpLW6jRyOFjhuI&s=10', // Aug
  'https://www.saatchigallery.com/wp-content/smush-webp/2024/12/DSC_1075-1-scaled.jpg.webp', // Sep
  'https://www.saatchigallery.com/wp-content/smush-webp/2023/08/bunt3.png.webp', // Oct
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRcCbyjdOBqVhfr8xdaq1tdypCNWWKNm-_xyYYo4HABaJ-tWaBhHaLsPIs&s=10', // Nov
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQEOBUd1e_fquBprVycZksKZratIoi8BkoosQq0u0hvyC9AjnSysyUG9iA&s=10'  // Dec
];

// Helper to compress images on the client side using HTML5 Canvas to prevent LocalStorage quota limits
const compressImage = (file: File, callback: (base64: string) => void) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 1000;
      const MAX_HEIGHT = 1000;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        // Use JPEG format with 0.6 compression for maximum efficiency and quality
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        callback(dataUrl);
      }
    };
    img.src = e.target?.result as string;
  };
  reader.readAsDataURL(file);
};

export default function CalendarView({ selectedDate, onSelectDate, tasks, categories, theme }: CalendarViewProps) {
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
  const [currentDate, setCurrentDate] = useState(new Date(selectedDate));
  const [flipDirection, setFlipDirection] = useState<'forward' | 'backward'>('forward');
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [croppingItem, setCroppingItem] = useState<{ year: number; monthIdx: number; fileUrl: string } | null>(null);
  const [viewMode, setViewMode] = useState<'cover' | 'year' | 'month'>('cover');
  const [coverTime, setCoverTime] = useState(new Date());

  useEffect(() => {
    if (viewMode !== 'cover') return;
    const timer = setInterval(() => {
      setCoverTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, [viewMode]);

  const formattedCoverTime = useMemo(() => {
    return coverTime.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }, [coverTime]);

  const handleCoverClick = () => {
    setViewMode('year');
  };

  // Helper to compute Lunar zodiac animal and name
  const getZodiacAnimal = (yearNum: number) => {
    const animals = ['rat', 'ox', 'tiger', 'rabbit', 'dragon', 'snake', 'horse', 'goat', 'monkey', 'rooster', 'dog', 'pig'];
    const animalsZh = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
    const idx = (yearNum - 2020) % 12;
    const finalIdx = idx >= 0 ? idx : 12 + idx;
    return { en: animals[finalIdx], zh: animalsZh[finalIdx] };
  };

  // Background Cropper States (Always locked to 1.61 : 1 widescreen ratio)
  const calendarAspect = 1.61;
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [cropRotation, setCropRotation] = useState(0);
  const [imgNaturalAspect, setImgNaturalAspect] = useState<number>(1);
  const [isCropDragging, setIsCropDragging] = useState(false);
  const [cropDragStart, setCropDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (croppingItem) {
      setCropZoom(1);
      setCropOffset({ x: 0, y: 0 });
      setCropRotation(0);

      // Measure original image aspect ratio
      const img = new Image();
      img.src = croppingItem.fileUrl;
      img.onload = () => {
        if (img.naturalWidth && img.naturalHeight) {
          setImgNaturalAspect(img.naturalWidth / img.naturalHeight);
        }
      };
    }
  }, [croppingItem]);

  // Load custom backgrounds from LocalStorage
  const [customBgs, setCustomBgs] = useState<Record<string, string>>(() => {
    const bgs: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('calendar-bg-') && !key.startsWith('calendar-bg-original-')) {
        const suffix = key.replace('calendar-bg-', '');
        if (suffix.includes('-')) {
          bgs[suffix] = localStorage.getItem(key) || '';
        } else {
          // Map legacy keys (like calendar-bg-0) to year 2026
          bgs[`2026-${suffix}`] = localStorage.getItem(key) || '';
        }
      }
    }
    return bgs;
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Month names in Chinese
  const monthNames = [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'
  ];

  const monthEnNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

  // Calculate days in month
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Create calendar cells
  const cells: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

  // Pad previous month days
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ dateStr, dayNum: d, isCurrentMonth: false });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ dateStr, dayNum: d, isCurrentMonth: true });
  }

  // Pad next month days to complete grid (42 cells for 6 rows)
  const remainingCells = 42 - cells.length;
  for (let d = 1; d <= remainingCells; d++) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ dateStr, dayNum: d, isCurrentMonth: false });
  }

  const handlePrevMonth = () => {
    setFlipDirection('backward');
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setFlipDirection('forward');
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    const todayMonth = today.getMonth();
    const todayYear = today.getFullYear();
    if (todayYear !== year || todayMonth !== month) {
      setFlipDirection(todayYear > year || (todayYear === year && todayMonth > month) ? 'forward' : 'backward');
    }
    setCurrentDate(new Date(todayYear, todayMonth, 1));
    const todayStr = today.toISOString().substring(0, 10);
    onSelectDate(todayStr);
  };

  // Helper to check if a day is today
  const isToday = (dateStr: string) => {
    const todayStr = new Date().toISOString().substring(0, 10);
    return dateStr === todayStr;
  };

  // Get tasks list for a given date
  const getTasksForDate = (dateStr: string) => {
    return tasks.filter(t => doesTaskMatchDate(t, dateStr));
  };

  // Handle Background Upload for a specific year and month
  const handleUploadBg = (y: number, mIdx: number, base64: string) => {
    try {
      const keyStr = `${y}-${mIdx}`;
      localStorage.setItem(`calendar-bg-${keyStr}`, base64);
      setCustomBgs(prev => ({ ...prev, [keyStr]: base64 }));
    } catch (err) {
      console.error('Failed to save background to localStorage:', err);
      alert('存储空间已满。我们已自动进行压缩，如果依然无法上传，请尝试分辨率较低或格式更小的图片。');
    }
  };

  // Handle Reset Background
  const handleResetBg = (y: number, mIdx: number) => {
    const keyStr = `${y}-${mIdx}`;
    localStorage.removeItem(`calendar-bg-${keyStr}`);
    localStorage.removeItem(`calendar-bg-original-${keyStr}`);
    localStorage.removeItem(`calendar-default-initial-bg-${keyStr}`);
    localStorage.removeItem(`calendar-default-initial-original-bg-${keyStr}`);
    setCustomBgs(prev => {
      const next = { ...prev };
      delete next[keyStr];
      return next;
    });
  };

  // Mouse event handlers for cropping drag
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsCropDragging(true);
    setCropDragStart({ x: e.clientX - cropOffset.x, y: e.clientY - cropOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isCropDragging) return;
    setCropOffset({
      x: e.clientX - cropDragStart.x,
      y: e.clientY - cropDragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsCropDragging(false);
  };

  // Touch event handlers for mobile cropping drag
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsCropDragging(true);
      const touch = e.touches[0];
      setCropDragStart({ x: touch.clientX - cropOffset.x, y: touch.clientY - cropOffset.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isCropDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setCropOffset({
      x: touch.clientX - cropDragStart.x,
      y: touch.clientY - cropDragStart.y
    });
  };

  const handleTouchEnd = () => {
    setIsCropDragging(false);
  };

  // Viewport sizes for the visual crop boxes - exactly matching the calendar-card aspect ratio!
  const viewportSize = useMemo(() => {
    const maxDimension = 320; // fits beautifully on all screens inside the modal
    if (calendarAspect >= 1) {
      // Landscape layout
      const w = maxDimension;
      const h = Math.round(maxDimension / calendarAspect);
      return { w, h };
    } else {
      // Portrait layout
      const h = maxDimension;
      const w = Math.round(maxDimension * calendarAspect);
      return { w, h };
    }
  }, [calendarAspect]);

  // Export cropped background image using canvas
  const handleCropSave = () => {
    if (!croppingItem) return;

    const img = new Image();
    img.src = croppingItem.fileUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      
      // Calculate high-res target dimensions matching the exact aspect ratio of the calendar
      const targetWidth = calendarAspect >= 1 ? 1000 : Math.round(1000 * calendarAspect);
      const targetHeight = calendarAspect >= 1 ? Math.round(1000 / calendarAspect) : 1000;
      const viewportWidth = viewportSize.w;
      const viewportHeight = viewportSize.h;

      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Safe dark matte background base fill
        ctx.fillStyle = '#1A1114';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Aspect ratios
        const imgAspect = img.naturalWidth / img.naturalHeight;
        const boxAspect = viewportWidth / viewportHeight;

        let drawWidth = 0;
        let drawHeight = 0;

        // Determine base scaling to fit viewport perfectly
        if (imgAspect > boxAspect) {
          drawHeight = canvas.height;
          drawWidth = canvas.height * imgAspect;
        } else {
          drawWidth = canvas.width;
          drawHeight = canvas.width / imgAspect;
        }

        // Apply slider zoom factor
        drawWidth *= cropZoom;
        drawHeight *= cropZoom;

        // Center canvas grid
        ctx.translate(canvas.width / 2, canvas.height / 2);
        
        // Apply 90-degree step rotations
        ctx.rotate((cropRotation * Math.PI) / 180);

        // Scale offsets from viewport pixel scale to destination high-res canvas scale
        const scaleX = canvas.width / viewportWidth;
        const scaleY = canvas.height / viewportHeight;
        ctx.translate(cropOffset.x * scaleX, cropOffset.y * scaleY);

        // Draw centered
        ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);

        // Compress base64 to JPEG 0.6
        const base64Result = canvas.toDataURL('image/jpeg', 0.6);
        
        // Save using our standard compressor handler (handles quota checks)
        handleUploadBg(croppingItem.year, croppingItem.monthIdx, base64Result);

        // Save original image to localStorage for re-cropping adjustment
        try {
          localStorage.setItem(`calendar-bg-original-${croppingItem.year}-${croppingItem.monthIdx}`, croppingItem.fileUrl);
        } catch (err) {
          console.error('Failed to save original background to localStorage:', err);
        }

        setCroppingItem(null); // Close crop modal
      }
    };
  };

  const activeBgImage = useMemo(() => {
    const keyStr = `${year}-${month}`;
    return customBgs[keyStr] || DEFAULT_MONTH_BGS[month];
  }, [customBgs, year, month]);

  const getMonthTaskCount = (y: number, mIdx: number) => {
    const monthStr = String(mIdx + 1).padStart(2, '0');
    const prefix = `${y}-${monthStr}-`;
    return tasks.filter(t => t.date.startsWith(prefix)).length;
  };

  const calendarBorder = 'border-white/10';
  const primaryTextClass = 'text-white drop-shadow-md';
  const mutedTextClass = 'text-white/70 drop-shadow-sm';
  const buttonBgClass = 'bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-all duration-200 backdrop-blur-md';
  const weekdayTextClass = 'text-white/80 font-bold drop-shadow-sm';
  const todayBadgeClass = 'bg-white/20 text-white border border-white/45 font-bold shadow-md shadow-black/10 backdrop-blur-sm';

  return (
    <div 
      className={`rounded-3xl border shadow-lg relative overflow-hidden transition-all duration-700 min-h-[720px] h-[720px] flex flex-col bg-stone-900 ${
        viewMode === 'cover' 
          ? 'border-stone-200 shadow-[0_12px_40px_rgba(0,0,0,0.08),_0_2px_4px_rgba(0,0,0,0.03)]' 
          : `${calendarBorder} shadow-black/25`
      }`}
      style={{
        perspective: '1500px',
      }}
      id="calendar-card"
    >
      {/* Realistic Wire Binder Rings - Always visible on top of both pages */}
      <div className="absolute -top-1.5 inset-x-0 flex justify-center gap-1.5 z-30 pointer-events-none select-none">
        <div className="flex gap-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={`ring-l-${i}`} className="relative flex flex-col items-center">
              {/* Punched hole in paper */}
              <div className="w-1.5 h-1.5 rounded-full bg-stone-800/25 shadow-inner mt-3.5 border border-white/10" />
              {/* 3D metallic wire ring */}
              <div className="absolute top-0.5 w-2 h-7 rounded-full border border-neutral-300 bg-gradient-to-b from-neutral-200 via-neutral-100 to-neutral-400 shadow-[0_1.5px_3px_rgba(0,0,0,0.15)]" />
            </div>
          ))}
        </div>
        <div className="w-16" />
        <div className="flex gap-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={`ring-r-${i}`} className="relative flex flex-col items-center">
              {/* Punched hole in paper */}
              <div className="w-1.5 h-1.5 rounded-full bg-stone-800/25 shadow-inner mt-3.5 border border-white/10" />
              {/* 3D metallic wire ring */}
              <div className="absolute top-0.5 w-2 h-7 rounded-full border border-neutral-300 bg-gradient-to-b from-neutral-200 via-neutral-100 to-neutral-400 shadow-[0_1.5px_3px_rgba(0,0,0,0.15)]" />
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {viewMode === 'cover' ? (
          <motion.div
            key="calendar-cover"
            initial={{ opacity: 0, rotateX: -110, y: -40, scale: 0.96 }}
            animate={{ opacity: 1, rotateX: 0, y: 0, scale: 1 }}
            exit={{ 
              opacity: 0,
              rotateX: -110,
              y: -50,
              scale: 0.95,
              transition: { duration: 0.75, ease: [0.16, 1, 0.3, 1] } 
            }}
            transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
            style={{ 
              transformOrigin: 'top center',
              backfaceVisibility: 'hidden',
              backgroundImage: `url(${activeBgImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
            className="absolute inset-0 w-full h-full pt-10 px-6 pb-6 md:pt-12 md:px-8 md:pb-8 flex flex-col justify-between select-none z-15"
            id="cover-view-container"
          >
            {/* Elegant light frosted-glass background cover layer (original photo stays untouched in center cutout) */}
            <div className="absolute inset-0 bg-[#FAF8F5]/85 backdrop-blur-xl z-0 pointer-events-none rounded-3xl" />

            {/* Top illustrative credentials */}
            <div className="flex items-start justify-between mt-3 px-2 text-stone-700 relative z-10">
              <div className="flex flex-col text-left">
                <span className="text-xl font-serif font-black text-stone-800 tracking-wider uppercase leading-none">
                  Calendar
                </span>
                <span className="text-[10px] font-mono font-bold text-stone-500 tracking-widest mt-1.5 uppercase">
                  {selectedDate.replace(/-/g, '.')}
                </span>
              </div>

              <div className="text-right">
                <span className="block font-serif font-black text-2xl text-stone-800 tracking-tight leading-none">{year}</span>
                <span className="block text-[8px] font-serif italic text-rose-600/95 font-bold mt-1 uppercase tracking-wider">
                  year of the {getZodiacAnimal(year).en}
                </span>
              </div>
            </div>

            {/* Widescreen cutoff container (Cut-out) Placeholder spacer to preserve layout flow */}
            <div className="my-auto py-5 flex items-center justify-center h-56 w-full" />

            {/* Elegant Picture Cutout (Portal Frame) */}
            <div
              onClick={handleCoverClick}
              className="absolute overflow-hidden border-4 border-[#FAF8F5] cursor-pointer group z-10 hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 shadow-[0px_8px_32px_rgba(0,0,0,0.12),_0px_2px_6px_rgba(0,0,0,0.04)]"
              style={{
                width: 'min(530px, 88%)',
                height: 'min(350px, 58vw)',
                borderRadius: '20px',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            >
              {/* Background picture visible through cutout */}
              <div 
                className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-105"
                style={{
                  backgroundImage: `url(${activeBgImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
              
              {/* Cut-out inner shadow overlay to give 3D depth */}
              <div className="absolute inset-0 rounded-xl shadow-[inset_0_4px_12px_rgba(0,0,0,0.45)] pointer-events-none" />
              
              {/* Ambient soft glow shine */}
              <div className="absolute inset-0 bg-gradient-to-tr from-black/10 via-transparent to-white/10 pointer-events-none" />

              {/* Interactive prompt overlay */}
              <div className="absolute inset-0 bg-stone-900/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <div className="bg-white/95 backdrop-blur-sm text-stone-800 px-3.5 py-1.5 rounded-full text-[10px] font-serif font-black uppercase tracking-widest shadow-md flex items-center gap-1.5">
                  <span>翻开日历</span>
                  <span className="text-[11px] animate-pulse">→</span>
                </div>
              </div>
            </div>

            {/* Bottom letterpress typography details */}
            <div className="flex flex-col items-center pb-1 relative z-10">
              <h2 className="text-4xl font-serif font-black tracking-[0.25em] text-stone-800 text-center uppercase leading-none pl-[0.25em] drop-shadow-sm">
                CALENDAR
              </h2>
              <span className="text-xs tracking-[0.3em] font-mono text-stone-500 font-bold mt-2.5 uppercase pl-[0.3em]">
                {formattedCoverTime}
              </span>
            </div>

            {/* Support Base stand strip at the bottom */}
            <div className="absolute bottom-0 inset-x-0 h-2.5 bg-neutral-200 border-t border-neutral-300/40 rounded-b-3xl pointer-events-none shadow-inner z-10" />
          </motion.div>
        ) : viewMode === 'year' ? (
          <motion.div
            key={`calendar-year-view-${year}`}
            initial={{ 
              opacity: 0, 
              rotateX: flipDirection === 'forward' ? 100 : -100, 
              y: flipDirection === 'forward' ? 30 : -30, 
              scale: 0.96 
            }}
            animate={{ 
              opacity: 1, 
              rotateX: 0, 
              y: 0, 
              scale: 1 
            }}
            exit={{ 
              opacity: 0, 
              rotateX: flipDirection === 'forward' ? -100 : 100, 
              y: flipDirection === 'forward' ? -30 : 30, 
              scale: 0.96 
            }}
            transition={{ 
              duration: 0.85, 
              ease: [0.16, 1, 0.3, 1] 
            }}
            style={{ 
              transformOrigin: 'top center',
              backfaceVisibility: 'hidden',
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${activeBgImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
            className="w-full h-full min-h-[720px] flex flex-col justify-between"
          >
            {/* Dark glass overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/45 to-black/70 rounded-3xl pointer-events-none z-0" />

            <div className="relative z-10 m-1.5 pt-9 px-5 pb-5 flex flex-col h-full min-h-[650px] bg-transparent rounded-[22px]">
              {/* Year View Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-xl bg-white/10 text-white">
                    <Grid className="w-5 h-5 text-amber-300" />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setFlipDirection('backward');
                        setCurrentDate(new Date(year - 1, month, 1));
                      }}
                      className="p-1 rounded-lg transition-colors cursor-pointer hover:bg-white/10 text-white/70 hover:text-white"
                      title="上一年"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h2 className="text-xl font-serif font-black tracking-tight text-white drop-shadow-md px-1 select-none">
                      {year}年 <span className="text-amber-300 italic font-serif font-black">挂历</span>
                    </h2>
                    <button
                      onClick={() => {
                        setFlipDirection('forward');
                        setCurrentDate(new Date(year + 1, month, 1));
                      }}
                      className="p-1 rounded-lg transition-colors cursor-pointer hover:bg-white/10 text-white/70 hover:text-white"
                      title="下一年"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {/* Back to cover */}
                  <button
                    onClick={() => setViewMode('cover')}
                    className="p-1.5 rounded-xl border border-white/10 bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 text-[11px] font-serif font-bold cursor-pointer transition-all duration-200 shadow-sm"
                    title="返回封面"
                  >
                    <CalendarIcon className="w-3.5 h-3.5 text-rose-300" />
                    <span>查看封面</span>
                  </button>

                  <button
                    onClick={() => {
                      const today = new Date();
                      setCurrentDate(today);
                      setViewMode('month');
                      onSelectDate(today.toISOString().substring(0, 10));
                    }}
                    className={`px-3 py-1.5 text-[10px] tracking-widest uppercase font-bold rounded-xl transition-all duration-200 cursor-pointer shadow-sm ${buttonBgClass}`}
                  >
                    回到今天
                  </button>
                </div>
              </div>

              {/* 12 Months Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3.5 overflow-y-auto max-h-[490px] pr-1" id="year-view-months-grid">
                {monthNames.map((mName, mIdx) => {
                  const isCurrent = mIdx === month && year === new Date().getFullYear();
                  const keyStr = `${year}-${mIdx}`;
                  const monthImg = customBgs[keyStr] || DEFAULT_MONTH_BGS[mIdx];
                  const taskCount = getMonthTaskCount(year, mIdx);

                  return (
                    <button
                      key={mIdx}
                      onClick={() => {
                        setFlipDirection(mIdx > month ? 'forward' : 'backward');
                        setCurrentDate(new Date(year, mIdx, 1));
                        setViewMode('month');
                      }}
                      className={`group relative rounded-2xl overflow-hidden border transition-all duration-300 flex flex-col justify-between p-3 text-left aspect-[1.3/1] cursor-pointer shadow-lg hover:shadow-black/40 hover:scale-[1.03] active:scale-[0.98] ${
                        isCurrent 
                          ? 'border-amber-400/85 ring-2 ring-amber-400/25 shadow-md shadow-amber-400/10' 
                          : 'border-white/10 hover:border-white/30 bg-black/35 hover:bg-black/55'
                      }`}
                    >
                      {/* Thumbnail background */}
                      <div 
                        className="absolute inset-0 bg-cover bg-center opacity-30 group-hover:opacity-40 transition-opacity duration-300 pointer-events-none"
                        style={{ backgroundImage: `url(${monthImg})` }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/50 pointer-events-none" />

                      {/* Header */}
                      <div className="relative z-10 flex justify-between items-baseline w-full">
                        <span className="text-sm font-serif font-black text-amber-300 tracking-tight group-hover:text-amber-200 transition-colors">
                          {mName}
                        </span>
                        <span className="text-[10px] font-mono tracking-widest text-white/50 uppercase">
                          {monthEnNames[mIdx].substring(0, 3)}
                        </span>
                      </div>

                      {/* Info / Task indicator */}
                      <div className="relative z-10 mt-auto flex justify-between items-center w-full">
                        <span className="text-[10px] font-mono text-white/70 tracking-tight bg-white/10 rounded-md px-1.5 py-0.5 backdrop-blur-sm group-hover:bg-white/20 transition-all">
                          {taskCount > 0 ? `${taskCount}项清单` : '空白页'}
                        </span>
                        <span className="text-white/40 group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all text-xs">
                          →
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Support Base stand strip at the bottom */}
            <div className="absolute bottom-0 inset-x-0 h-2.5 bg-neutral-200 border-t border-neutral-300/40 rounded-b-3xl pointer-events-none shadow-inner z-10" />
          </motion.div>
        ) : (
          <motion.div
            key={`calendar-main-${year}-${month}`}
            initial={{ 
              opacity: 0, 
              rotateX: flipDirection === 'forward' ? 100 : -100, 
              y: flipDirection === 'forward' ? 30 : -30, 
              scale: 0.96 
            }}
            animate={{ 
              opacity: 1, 
              rotateX: 0, 
              y: 0, 
              scale: 1 
            }}
            exit={{ 
              opacity: 0, 
              rotateX: flipDirection === 'forward' ? -100 : 100, 
              y: flipDirection === 'forward' ? -30 : 30, 
              scale: 0.96 
            }}
            transition={{ 
              duration: 0.85, 
              ease: [0.16, 1, 0.3, 1] 
            }}
            style={{ 
              transformOrigin: 'top center',
              backfaceVisibility: 'hidden',
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${activeBgImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
            className="w-full h-full min-h-[720px] flex flex-col justify-between"
          >
            {/* 3D Poster Canvas Shade overlay over the photo for rich organic depth and guaranteed legibility */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-black/65 rounded-3xl pointer-events-none z-0" />

            {/* Fully transparent inner container so the background photo is 100% visible */}
            <div className="relative z-10 m-1.5 pt-9 px-5 pb-5 flex flex-col justify-between h-full min-h-[650px] bg-transparent rounded-[22px]">
              {/* Header section with artistic month title */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-xl bg-white/10 text-white">
                    <CalendarIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <h2 className={`text-xl font-serif font-black tracking-tight ${primaryTextClass}`}>
                        {year}年 <span className="text-amber-300 italic font-serif font-black">{monthNames[month]}</span>
                      </h2>
                      <span className="text-[10px] uppercase font-mono tracking-widest text-white/50 font-bold hidden sm:inline">
                        {monthEnNames[month]}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {/* Return to Year Overview button */}
                  <button
                    onClick={() => setViewMode('year')}
                    className="p-1.5 rounded-xl border border-white/10 bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 text-[11px] font-serif font-bold cursor-pointer transition-all duration-200 shadow-sm"
                    title="查看12个月挂历"
                    id="back-to-year-btn"
                  >
                    <Grid className="w-3.5 h-3.5 text-amber-300" />
                    <span>查看年历</span>
                  </button>

                  {/* Return to Cover button */}
                  <button
                    onClick={() => setViewMode('cover')}
                    className="p-1.5 rounded-xl border border-white/10 bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 text-[11px] font-serif font-bold cursor-pointer transition-all duration-200 shadow-sm"
                    title="返回精美日历封面"
                    id="back-to-cover-btn"
                  >
                    <CalendarIcon className="w-3.5 h-3.5 text-rose-300" />
                    <span>查看封面</span>
                  </button>

                  {/* Gallery configuration button */}
                  <button
                    onClick={() => setIsGalleryOpen(true)}
                    className="p-1.5 rounded-xl border border-white/10 bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 text-[11px] font-serif font-bold cursor-pointer transition-all duration-200 shadow-sm"
                    title="上传/管理12个月背景画册"
                    id="gallery-manage-btn"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                    <span>更换画册背景</span>
                  </button>

                  <button
                    onClick={handleToday}
                    className={`px-3 py-1.5 text-[10px] tracking-widest uppercase font-bold rounded-xl transition-all duration-200 cursor-pointer shadow-sm ${buttonBgClass}`}
                    id="today-btn"
                  >
                    今天
                  </button>
                  
                  <div className="flex items-center border border-white/10 bg-white/10 rounded-xl p-0.5">
                    <button
                      onClick={handlePrevMonth}
                      className="p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-white/10 text-white/70 hover:text-white"
                      title="上个月"
                      id="prev-month-btn"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleNextMonth}
                      className="p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-white/10 text-white/70 hover:text-white"
                      title="下个月"
                      id="next-month-btn"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1.5 text-center mb-2.5">
                {weekdays.map((day, idx) => (
                  <div 
                    key={day} 
                    className={`text-xs font-mono font-bold py-1.5 uppercase ${
                      idx === 0 || idx === 6 ? 'text-rose-400/90' : weekdayTextClass
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1.5">
                {cells.map(({ dateStr, dayNum, isCurrentMonth }) => {
                  const isSel = selectedDate === dateStr;
                  const isTd = isToday(dateStr);
                  const dayTasks = getTasksForDate(dateStr);
                  const completedCount = dayTasks.filter(t => isTaskCompletedOnDate(t, dateStr)).length;
                  const totalCount = dayTasks.length;

                  return (
                    <button
                      key={dateStr}
                      onClick={() => onSelectDate(dateStr)}
                      className={`relative h-16 rounded-2xl flex flex-col items-center justify-between p-1.5 transition-all duration-200 cursor-pointer text-left focus:outline-none border ${
                        isSel 
                          ? 'bg-white text-neutral-900 font-bold shadow-lg border-transparent ring-2 ring-white/30 scale-105' 
                          : isTd
                            ? todayBadgeClass
                            : isCurrentMonth
                              ? 'bg-transparent hover:bg-white/10 text-white border-transparent hover:border-white/10'
                              : 'bg-transparent text-white/30 hover:bg-white/5 border-transparent opacity-40'
                      }`}
                      id={`cell-${dateStr}`}
                    >
                      {/* Day Number */}
                      <span className={`text-[11px] font-mono font-bold ${isSel ? 'text-neutral-900' : 'text-white drop-shadow-sm'}`}>
                        {dayNum}
                      </span>

                      {/* Indicators */}
                      <div className="flex gap-0.5 justify-center items-center h-3.5 w-full">
                        {totalCount > 0 ? (
                          <div className="flex gap-0.5 items-center justify-center flex-wrap max-w-full px-0.5">
                            {dayTasks
                              .slice(0, 4) // Show up to 4 dot indicators
                              .sort((a, b) => {
                                const completedA = isTaskCompletedOnDate(a, dateStr);
                                const completedB = isTaskCompletedOnDate(b, dateStr);
                                if (completedA !== completedB) return completedA ? 1 : -1;
                                if (a.time && b.time) return a.time.localeCompare(b.time);
                                if (a.time) return -1;
                                if (b.time) return 1;
                                return 0;
                              })
                              .map((task) => {
                                let dotColor = 'bg-amber-400';
                                let dotStyle: React.CSSProperties = {};
                                
                                if (task.categoryId && categories) {
                                  const cat = categories.find(c => c.id === task.categoryId);
                                  if (cat) {
                                    dotColor = '';
                                    dotStyle = { backgroundColor: cat.color };
                                  }
                                }
                                
                                const isComp = isTaskCompletedOnDate(task, dateStr);
                                return (
                                  <span 
                                    key={task.id} 
                                    className={`w-1.5 h-1.5 rounded-full ${isSel ? 'bg-neutral-900' : dotColor} ${isComp ? 'opacity-30 scale-90' : 'opacity-100 font-black'}`} 
                                    style={isSel ? {} : dotStyle}
                                    title={task.content}
                                  />
                                );
                              })}
                          </div>
                        ) : null}
                      </div>

                      {/* Underline for Today if not selected */}
                      {isTd && !isSel && (
                        <div className="absolute bottom-0.5 w-3.5 h-0.5 bg-amber-300 rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Color legend */}
              <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap gap-x-4 gap-y-1.5 justify-center text-[10px] tracking-wider uppercase font-bold text-white/60">
                {categories && categories.map((cat) => (
                  <div key={cat.id} className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span>{cat.name}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                  <span>已完成</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 12-Month Gallery Configuration Modal */}
      <AnimatePresence>
        {isGalleryOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Dark background glass blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsGalleryOpen(false)}
              className="absolute inset-0 bg-black/55 backdrop-blur-md cursor-pointer"
            />

            {/* Modal card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className={`relative w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-3xl p-6 shadow-2xl border ${
                isDark 
                  ? 'bg-[#1C1316] border-white/10 text-[#F3EBF0]' 
                  : 'bg-[#FAF9F6] border-black/5 text-[#1A1A1A]'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-black/[0.05] dark:border-white/[0.05]">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-2xl ${isDark ? 'bg-white/10 text-[#E05275]' : 'bg-black/5 text-black'}`}>
                    <Sparkles className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-serif font-black">12个月挂历背景管理</h3>
                    <p className={`text-xs mt-0.5 font-serif ${isDark ? 'text-white/50' : 'text-black/50'}`}>
                      上传您专属的摄影、画作，或点击图片直达目标月份。图片会自动进行高清压缩。
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsGalleryOpen(false)}
                  className={`p-1.5 rounded-xl cursor-pointer transition-colors ${
                    isDark ? 'hover:bg-white/10 text-white/50 hover:text-white' : 'hover:bg-black/5 text-black/50 hover:text-black'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Grid of 12 Months */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-2">
                {monthNames.map((mName, mIdx) => {
                  const isCurrent = mIdx === month;
                  const keyStr = `${year}-${mIdx}`;
                  const monthImg = customBgs[keyStr] || DEFAULT_MONTH_BGS[mIdx];
                  const hasCustom = !!customBgs[keyStr];

                  return (
                    <div 
                      key={mIdx}
                      className={`group relative rounded-2xl overflow-hidden border transition-all duration-300 flex flex-col justify-between aspect-[1.61/1] ${
                        isCurrent 
                          ? isDark 
                            ? 'border-[#E05275] ring-2 ring-[#E05275]/25 shadow-md shadow-[#E05275]/10' 
                            : 'border-neutral-900 ring-2 ring-black/10 shadow-sm'
                          : 'border-black/[0.05] dark:border-white/[0.05] hover:border-black/25 dark:hover:border-white/20'
                      }`}
                    >
                      {/* Thumbnail background */}
                      <div 
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                        style={{ backgroundImage: `url(${monthImg})` }}
                      />
                      
                      {/* Dark overlay */}
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors duration-300" />

                      {/* Top bar with select & custom indicator */}
                      <div className="relative z-10 p-2.5 flex items-start justify-between">
                        <button
                          onClick={() => {
                            setFlipDirection(mIdx > month ? 'forward' : 'backward');
                            setCurrentDate(new Date(year, mIdx, 1));
                            setIsGalleryOpen(false);
                          }}
                          className={`text-xs font-serif font-bold tracking-tight rounded-lg px-2 py-0.5 cursor-pointer flex items-center gap-1 text-white bg-black/40 hover:bg-black/70 backdrop-blur-md transition-all border border-white/10`}
                          title="跳转至此月份"
                        >
                          <span>{mIdx + 1}月 {monthEnNames[mIdx].substring(0, 3)}</span>
                          {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                        </button>

                        {hasCustom && (
                          <span className="text-[9px] font-mono tracking-wider uppercase font-black px-1.5 py-0.5 bg-emerald-500/90 text-white rounded-md flex items-center gap-0.5 border border-emerald-400/20 shadow-sm">
                            <Check className="w-2.5 h-2.5" /> 自定义背景
                          </span>
                        )}
                      </div>

                      {/* Bottom bar with action buttons */}
                      <div className="relative z-10 p-2 flex items-center justify-end gap-1.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-6">
                        {/* Hidden File Input */}
                        <input
                          type="file"
                          accept="image/*"
                          id={`gallery-upload-${mIdx}`}
                          onClick={(e) => {
                            (e.target as HTMLInputElement).value = '';
                          }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                  if (event.target?.result) {
                                    setCroppingItem({
                                      year: year,
                                      monthIdx: mIdx,
                                      fileUrl: event.target.result as string
                                    });
                                  }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="hidden"
                        />
                        
                        <label
                          htmlFor={`gallery-upload-${mIdx}`}
                          className="p-1.5 rounded-lg bg-white/20 hover:bg-white text-white hover:text-black cursor-pointer backdrop-blur-md transition-all flex items-center justify-center border border-white/10 shadow-sm"
                          title="上传本地背景"
                        >
                          <Camera className="w-3.5 h-3.5" />
                        </label>

                        {hasCustom && (
                          <>
                            <button
                              onClick={() => {
                                const originalKey = `calendar-bg-original-${year}-${mIdx}`;
                                const originalUrl = localStorage.getItem(originalKey) || customBgs[keyStr];
                                setCroppingItem({
                                  year: year,
                                  monthIdx: mIdx,
                                  fileUrl: originalUrl
                                });
                              }}
                              className="p-1.5 rounded-lg bg-amber-500/30 hover:bg-amber-600 text-amber-100 hover:text-white cursor-pointer backdrop-blur-md transition-all flex items-center justify-center border border-amber-400/20 shadow-sm"
                              title="重新调整裁剪"
                            >
                              <Crop className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleResetBg(year, mIdx)}
                              className="p-1.5 rounded-lg bg-rose-500/30 hover:bg-rose-600 text-rose-100 hover:text-white cursor-pointer backdrop-blur-md transition-all flex items-center justify-center border border-rose-400/20 shadow-sm"
                              title="恢复默认背景"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom quick notes */}
              <div className="flex items-center gap-2 mt-6 p-3 rounded-2xl border border-dashed border-black/[0.08] dark:border-white/[0.08] text-xs font-serif text-neutral-500">
                <HelpCircle className="w-4 h-4 shrink-0 text-amber-500" />
                <span>
                  想要达到最佳的艺术挂历质感？推荐使用带有留白、水彩插画或胶片摄影风格的横版照片作为背景。
                </span>
              </div>
            </motion.div>
          </div>
        )}

        {croppingItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Dark overlay backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCroppingItem(null)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md cursor-pointer"
            />

            {/* Cropper content card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-lg rounded-3xl p-6 bg-[#1A1114] border border-white/10 text-[#F3EBF0] shadow-2xl flex flex-col gap-5 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-amber-400" />
                  <div>
                    <h3 className="text-base font-serif font-black">挂历背景照片裁剪</h3>
                    <p className="text-[11px] text-white/50 font-serif mt-0.5">
                      为 {croppingItem.monthIdx + 1} 月裁剪出最精致的艺术构图
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setCroppingItem(null)}
                  className="p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Aspect Ratio Info */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase font-mono tracking-wider text-white/40 font-bold">裁剪比例框架</span>
                <div className="flex items-center justify-between bg-white/5 px-4 py-3 rounded-xl border border-white/5 text-xs text-white/80">
                  <span className="font-serif text-white/70">已自动贴合当前日历尺寸比例</span>
                  <span className="font-mono bg-[#E05275]/20 text-[#E05275] px-2.5 py-0.5 rounded-lg border border-[#E05275]/30 text-[11px] font-bold">
                    {calendarAspect >= 1 ? '宽屏' : '竖屏'} ({calendarAspect.toFixed(2)} : 1)
                  </span>
                </div>
              </div>

              {/* Draggable cropping stage container */}
              <div className="flex justify-center items-center py-2">
                <div 
                  className="overflow-hidden relative bg-black/40 border border-white/10 rounded-2xl shadow-inner cursor-grab active:cursor-grabbing flex items-center justify-center group"
                  style={{ 
                    width: `${viewportSize.w}px`, 
                    height: `${viewportSize.h}px`,
                  }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  {/* Image element with matrix transform styling */}
                  <img
                    src={croppingItem.fileUrl}
                    alt="Crop Target"
                    draggable={false}
                    className="pointer-events-none select-none max-w-none origin-center"
                    style={{
                      transform: `translate(${cropOffset.x}px, ${cropOffset.y}px) scale(${cropZoom}) rotate(${cropRotation}deg)`,
                      transition: isCropDragging ? 'none' : 'transform 0.1s ease-out',
                      height: imgNaturalAspect > calendarAspect ? '100%' : 'auto',
                      width: imgNaturalAspect > calendarAspect ? 'auto' : '100%',
                    }}
                  />

                  {/* Faint Gridlines overlay */}
                  <div className="absolute inset-0 pointer-events-none border border-white/20 rounded-2xl flex flex-col justify-between">
                    {/* 3x3 Grid indicator */}
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-20 pointer-events-none">
                      <div className="border-r border-b border-white border-dashed" />
                      <div className="border-r border-b border-white border-dashed" />
                      <div className="border-b border-white border-dashed" />
                      <div className="border-r border-b border-white border-dashed" />
                      <div className="border-r border-b border-white border-dashed" />
                      <div className="border-b border-white border-dashed" />
                      <div className="border-r border-white border-dashed" />
                      <div className="border-r border-white border-dashed" />
                      <div />
                    </div>

                    {/* Corner highlights (Camera focus bracket look) */}
                    <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-white/70" />
                    <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 border-white/70" />
                    <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2 border-white/70" />
                    <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 border-white/70" />
                  </div>

                  {/* Position indicator cue */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/65 backdrop-blur-md px-2.5 py-1 rounded-full text-[9px] font-serif text-white/80 pointer-events-none tracking-wide opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <Grid className="w-2.5 h-2.5" />
                    <span>拖拽或双指移动图片</span>
                  </div>
                </div>
              </div>

              {/* Zoom Slider */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-[10px] uppercase font-mono tracking-wider text-white/40 font-bold">
                  <span>画面缩放</span>
                  <span className="text-amber-300 font-bold">{Math.round(cropZoom * 100)}%</span>
                </div>
                <div className="flex items-center gap-3 bg-white/5 p-2.5 rounded-xl border border-white/5">
                  <span className="text-[10px] text-white/40 font-medium">100%</span>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.02"
                    value={cropZoom}
                    onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                    className="flex-1 accent-[#E05275] cursor-pointer h-1.5 bg-white/10 rounded-lg appearance-none animate-none"
                  />
                  <span className="text-[10px] text-white/40 font-medium">300%</span>
                </div>
              </div>

              {/* Quick rotation / center adjust buttons */}
              <div className="flex items-center justify-between gap-3 text-xs">
                <button
                  onClick={() => {
                    setCropRotation(prev => (prev + 90) % 360);
                  }}
                  className="flex-1 py-2 px-3 rounded-xl border border-white/10 hover:bg-white/10 text-white/80 hover:text-white transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5 text-amber-300" />
                  <span>旋转 90°</span>
                </button>
                <button
                  onClick={() => {
                    setCropOffset({ x: 0, y: 0 });
                    setCropZoom(1);
                    setCropRotation(0);
                  }}
                  className="flex-1 py-2 px-3 rounded-xl border border-white/10 hover:bg-white/10 text-white/80 hover:text-white transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-rose-300" />
                  <span>重置居中</span>
                </button>
              </div>

              {/* Confirm or Cancel Bottom Controls */}
              <div className="flex items-center justify-end gap-3 mt-1 pt-4 border-t border-white/[0.08]">
                <button
                  onClick={() => setCroppingItem(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
                >
                  取消
                </button>
                <button
                  onClick={handleCropSave}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#E05275] hover:bg-[#F26385] text-white shadow-lg shadow-[#E05275]/25 transition-all flex items-center gap-1.5 cursor-pointer font-serif"
                >
                  <Check className="w-4 h-4" />
                  <span>确认裁剪并保存</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
