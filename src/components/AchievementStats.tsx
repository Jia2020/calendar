import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip 
} from 'recharts';
import { Task, ThemeConfig } from '../types';
import { doesTaskMatchDate, isTaskCompletedOnDate } from '../utils/taskUtils';
import { TrendingUp, BarChart2, Award, CheckCircle2, Flame, CalendarRange, Sparkles } from 'lucide-react';

interface AchievementStatsProps {
  tasks: Task[];
  theme: ThemeConfig;
}

// Custom defined palette for premium theme coordination
interface ThemePalette {
  accentHex: string;
  gradientStart: string;
  metricBg: string;
  metricBorder: string;
  toggleBg: string;
  toggleActive: string;
  chartStroke: string;
  iconBg: string;
  metrics: {
    rate: { text: string; icon: string; bg: string };
    completed: { text: string; icon: string; bg: string };
    streak: { text: string; icon: string; bg: string };
    peak: { text: string; icon: string; bg: string };
  };
}

const PALETTES: Record<string, ThemePalette> = {
  monochrome: {
    accentHex: '#1A1A1A',
    gradientStart: 'rgba(26, 26, 26, 0.16)',
    metricBg: 'bg-[#FAF9F6]',
    metricBorder: 'border-black/5',
    toggleBg: 'bg-[#FAF9F6]',
    toggleActive: 'bg-[#1A1A1A] text-white shadow-sm',
    chartStroke: '#1A1A1A',
    iconBg: 'bg-black/5',
    metrics: {
      rate: { text: 'text-[#1A1A1A]', icon: 'text-[#1A1A1A]', bg: 'bg-[#1A1A1A]/10' },
      completed: { text: 'text-[#444444]', icon: 'text-[#444444]', bg: 'bg-[#444444]/10' },
      streak: { text: 'text-[#666666]', icon: 'text-[#666666]', bg: 'bg-[#666666]/10' },
      peak: { text: 'text-[#1A1A1A]', icon: 'text-[#1A1A1A]', bg: 'bg-[#1A1A1A]/10' }
    }
  },
  celadon: {
    accentHex: '#2E5A44',
    gradientStart: 'rgba(46, 90, 68, 0.16)',
    metricBg: 'bg-[#F3F6F2]',
    metricBorder: 'border-[#1B3224]/10',
    toggleBg: 'bg-[#F3F6F2]',
    toggleActive: 'bg-[#1B3224] text-white shadow-sm',
    chartStroke: '#2E5A44',
    iconBg: 'bg-[#1B3224]/5',
    metrics: {
      rate: { text: 'text-[#1B3224]', icon: 'text-[#2E5A44]', bg: 'bg-[#2E5A44]/10' },
      completed: { text: 'text-[#234330]', icon: 'text-[#3E6C52]', bg: 'bg-[#3E6C52]/10' },
      streak: { text: 'text-[#2B4B38]', icon: 'text-[#4F7F64]', bg: 'bg-[#4F7F64]/10' },
      peak: { text: 'text-[#1B3224]', icon: 'text-[#1B3224]', bg: 'bg-[#1B3224]/10' }
    }
  },
  sand: {
    accentHex: '#9E6A47',
    gradientStart: 'rgba(158, 106, 71, 0.16)',
    metricBg: 'bg-[#FAF5EE]',
    metricBorder: 'border-[#4F3621]/10',
    toggleBg: 'bg-[#FAF5EE]',
    toggleActive: 'bg-[#4F3621] text-white shadow-sm',
    chartStroke: '#9E6A47',
    iconBg: 'bg-[#4F3621]/5',
    metrics: {
      rate: { text: 'text-[#4F3621]', icon: 'text-[#9E6A47]', bg: 'bg-[#9E6A47]/10' },
      completed: { text: 'text-[#62442B]', icon: 'text-[#B5825E]', bg: 'bg-[#B5825E]/10' },
      streak: { text: 'text-[#533821]', icon: 'text-[#CFA081]', bg: 'bg-[#CFA081]/10' },
      peak: { text: 'text-[#4F3621]', icon: 'text-[#4F3621]', bg: 'bg-[#4F3621]/10' }
    }
  },
  indigo: {
    accentHex: '#3D5E8C',
    gradientStart: 'rgba(61, 94, 140, 0.16)',
    metricBg: 'bg-[#F1F4F9]',
    metricBorder: 'border-[#1D293B]/10',
    toggleBg: 'bg-[#F1F4F9]',
    toggleActive: 'bg-[#1D293B] text-white shadow-sm',
    chartStroke: '#3D5E8C',
    iconBg: 'bg-[#1D293B]/5',
    metrics: {
      rate: { text: 'text-[#1D293B]', icon: 'text-[#3D5E8C]', bg: 'bg-[#3D5E8C]/10' },
      completed: { text: 'text-[#26374F]', icon: 'text-[#5176A6]', bg: 'bg-[#5176A6]/10' },
      streak: { text: 'text-[#2E4360]', icon: 'text-[#6C8EBB]', bg: 'bg-[#6C8EBB]/10' },
      peak: { text: 'text-[#1D293B]', icon: 'text-[#1D293B]', bg: 'bg-[#1D293B]/10' }
    }
  },
  plum: {
    accentHex: '#E05275',
    gradientStart: 'rgba(224, 82, 117, 0.22)',
    metricBg: 'bg-[#1C1316]',
    metricBorder: 'border-[#E05275]/10',
    toggleBg: 'bg-[#1C1316]',
    toggleActive: 'bg-[#E05275] text-white shadow-md shadow-[#E05275]/15',
    chartStroke: '#E05275',
    iconBg: 'bg-[#E05275]/10',
    metrics: {
      rate: { text: 'text-[#F3EBF0]', icon: 'text-[#E05275]', bg: 'bg-[#E05275]/12' },
      completed: { text: 'text-[#EFE5EB]', icon: 'text-[#EE6E8F]', bg: 'bg-[#EE6E8F]/12' },
      streak: { text: 'text-[#E7DAE2]', icon: 'text-[#FFA2B9]', bg: 'bg-[#FFA2B9]/12' },
      peak: { text: 'text-[#F3EBF0]', icon: 'text-[#E05275]', bg: 'bg-[#E05275]/15' }
    }
  }
};

export default function AchievementStats({ tasks, theme }: AchievementStatsProps) {
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const isDark = theme.id === 'plum';

  // Retrieve the custom palette for this theme (or default to monochrome)
  const palette = useMemo(() => {
    return PALETTES[theme.id] || PALETTES.monochrome;
  }, [theme.id]);

  // Generate data for the past 7 days
  const chartData = useMemo(() => {
    const days = [];
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      const label = weekdays[d.getDay()];
      
      // Calculate tasks for this date
      let total = 0;
      let completed = 0;
      
      tasks.forEach(task => {
        if (doesTaskMatchDate(task, dateStr)) {
          total++;
          if (isTaskCompletedOnDate(task, dateStr)) {
            completed++;
          }
        }
      });
      
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      days.push({
        date: dateStr,
        label: `${label} (${month}/${day})`,
        shortLabel: label,
        total,
        completed,
        rate,
      });
    }
    return days;
  }, [tasks]);

  // Metric 1: Average Completion Rate over 7 Days
  const avgCompletionRate = useMemo(() => {
    const activeDays = chartData.filter(d => d.total > 0);
    if (activeDays.length === 0) return 0;
    const totalRate = activeDays.reduce((sum, d) => sum + d.rate, 0);
    return Math.round(totalRate / activeDays.length);
  }, [chartData]);

  // Metric 2: Total Completed Tasks over 7 Days
  const totalCompleted = useMemo(() => {
    return chartData.reduce((sum, d) => sum + d.completed, 0);
  }, [chartData]);

  // Metric 3: Completion Streak (Consecutive days with completion rate >= 50% or some tasks done)
  const currentStreak = useMemo(() => {
    let streak = 0;
    // Iterate from today (last item in list) backwards
    for (let i = chartData.length - 1; i >= 0; i--) {
      const day = chartData[i];
      if (day.total > 0 && day.rate >= 50) {
        streak++;
      } else if (day.total === 0) {
        // If no tasks scheduled, don't break the streak if we already have a streak, 
        // but don't count it as active completion either.
        continue;
      } else {
        break;
      }
    }
    return streak;
  }, [chartData]);

  // Metric 4: Peak day
  const peakDay = useMemo(() => {
    let maxRate = -1;
    let peak = '暂无日程';
    chartData.forEach(day => {
      if (day.total > 0 && day.rate > maxRate) {
        maxRate = day.rate;
        peak = `${day.shortLabel} (${day.rate}%)`;
      }
    });
    return peak;
  }, [chartData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className={`p-3.5 rounded-2xl shadow-xl border text-xs font-serif ${
          isDark 
            ? 'bg-[#22191C] border-white/10 text-[#F3EBF0]' 
            : 'bg-white border-black/5 text-[#1A1A1A]'
        }`}>
          <p className="font-bold mb-1.5">{label}</p>
          <p className="flex items-center gap-1.5 mb-1 font-medium">
            <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: palette.accentHex }} />
            <span>达成率: <strong className="font-mono text-sm">{data.rate}%</strong></span>
          </p>
          <p className="text-neutral-400 font-mono mt-1 text-[11px]">
            已完成: {data.completed} / 计划数: {data.total}
          </p>
        </div>
      );
    }
    return null;
  };

  const primaryText = theme.textClass;
  const secondaryText = isDark ? 'text-white/60' : 'text-black/60';
  const gridStroke = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)';

  return (
    <div className={`rounded-3xl border p-6 transition-all duration-300 ${theme.cardBg} ${theme.borderClass}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-2xl ${palette.iconBg} ${palette.metrics.rate.icon}`}>
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`text-lg font-serif font-bold ${primaryText}`}>成就与专注趋势</h2>
            <p className={`text-xs font-serif mt-0.5 ${secondaryText}`}>回顾过去7天的执行效率与时间投入</p>
          </div>
        </div>

        {/* Toggle buttons */}
        <div className={`flex p-1 rounded-xl border ${palette.toggleBg} ${palette.metricBorder} self-start sm:self-auto`}>
          <button
            onClick={() => setChartType('line')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-serif font-semibold transition-all cursor-pointer ${
              chartType === 'line'
                ? palette.toggleActive
                : `text-neutral-500 hover:${isDark ? 'text-[#F3EBF0]' : 'text-black'}`
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            趋势图
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-serif font-semibold transition-all cursor-pointer ${
              chartType === 'bar'
                ? palette.toggleActive
                : `text-neutral-500 hover:${isDark ? 'text-[#F3EBF0]' : 'text-black'}`
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            对比图
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Metric 1 */}
        <div className={`p-4 rounded-2xl border transition-all duration-300 ${palette.metricBg} ${palette.metricBorder}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[11px] font-serif font-medium ${secondaryText}`}>平均完成率</span>
            <div className={`p-1 rounded-lg ${palette.metrics.rate.bg}`}>
              <CheckCircle2 className={`w-3.5 h-3.5 ${palette.metrics.rate.icon}`} />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-mono font-bold ${palette.metrics.rate.text}`}>{avgCompletionRate}</span>
            <span className={`text-xs font-mono ${secondaryText}`}>%</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className={`p-4 rounded-2xl border transition-all duration-300 ${palette.metricBg} ${palette.metricBorder}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[11px] font-serif font-medium ${secondaryText}`}>累计完成数</span>
            <div className={`p-1 rounded-lg ${palette.metrics.completed.bg}`}>
              <Sparkles className={`w-3.5 h-3.5 ${palette.metrics.completed.icon}`} />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-mono font-bold ${palette.metrics.completed.text}`}>{totalCompleted}</span>
            <span className={`text-xs font-serif ${secondaryText}`}>个任务</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className={`p-4 rounded-2xl border transition-all duration-300 ${palette.metricBg} ${palette.metricBorder}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[11px] font-serif font-medium ${secondaryText}`}>持续高效连击</span>
            <div className={`p-1 rounded-lg ${palette.metrics.streak.bg}`}>
              <Flame className={`w-3.5 h-3.5 ${palette.metrics.streak.icon}`} />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-mono font-bold ${palette.metrics.streak.text}`}>{currentStreak}</span>
            <span className={`text-xs font-serif ${secondaryText}`}>天达标</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className={`p-4 rounded-2xl border transition-all duration-300 ${palette.metricBg} ${palette.metricBorder}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[11px] font-serif font-medium ${secondaryText}`}>专注最高点</span>
            <div className={`p-1 rounded-lg ${palette.metrics.peak.bg}`}>
              <CalendarRange className={`w-3.5 h-3.5 ${palette.metrics.peak.icon}`} />
            </div>
          </div>
          <div className="truncate pr-1">
            <span className={`text-sm font-serif font-bold ${palette.metrics.peak.text}`}>{peakDay}</span>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="h-60 sm:h-64 w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'line' ? (
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={palette.accentHex} stopOpacity={isDark ? 0.35 : 0.22}/>
                  <stop offset="95%" stopColor={palette.accentHex} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis 
                dataKey="label" 
                tick={{ fill: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)', fontSize: 10, fontFamily: 'serif' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                domain={[0, 100]} 
                tick={{ fill: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)', fontSize: 10, fontFamily: 'mono' }}
                axisLine={false}
                tickLine={false}
                unit="%"
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: palette.accentHex, strokeWidth: 1.2, strokeDasharray: '4 4' }} />
              <Area 
                type="monotone" 
                dataKey="rate" 
                stroke={palette.chartStroke} 
                strokeWidth={2.5}
                fillOpacity={1} 
                fill="url(#chartGradient)" 
                activeDot={{ r: 6, strokeWidth: 0, fill: palette.accentHex }}
              />
            </AreaChart>
          ) : (
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis 
                dataKey="label" 
                tick={{ fill: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)', fontSize: 10, fontFamily: 'serif' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                domain={[0, 100]} 
                tick={{ fill: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)', fontSize: 10, fontFamily: 'mono' }}
                axisLine={false}
                tickLine={false}
                unit="%"
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }} />
              <Bar 
                dataKey="rate" 
                fill={palette.chartStroke} 
                radius={[6, 6, 0, 0]} 
                maxBarSize={32}
                activeBar={{ fillOpacity: 0.85 }}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
