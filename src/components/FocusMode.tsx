import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Pause, RotateCcw, Wind, Compass, Sparkles, 
  Maximize2, Minimize2, Volume2, VolumeX, CheckCircle, 
  Target, Flame, Activity, Hourglass, Bell, Moon
} from 'lucide-react';
import { Task, ThemeConfig } from '../types';
import { playChime } from './AudioChime';
import { doesTaskMatchDate, isTaskCompletedOnDate } from '../utils/taskUtils';

interface FlipClockProps {
  seconds: number;
  isDark: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  isDeep?: boolean;
}

function FlipDigit({ digit, isDark, size = 'sm', isDeep = false }: { digit: string; isDark: boolean; size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'; isDeep?: boolean }) {
  let widthClass = 'w-6 h-9';
  let textClass = 'text-lg';

  if (size === 'md') {
    widthClass = 'w-14 h-20';
    textClass = 'text-4xl';
  } else if (size === 'lg') {
    widthClass = 'w-24 h-36';
    textClass = 'text-6xl';
  } else if (size === 'xl') {
    widthClass = 'w-32 h-44';
    textClass = 'text-8xl';
  } else if (size === '2xl') {
    widthClass = 'w-44 h-60';
    textClass = 'text-[9.5rem]';
  }
  
  const bgClass = isDeep 
    ? 'bg-white text-black border border-neutral-200/80 shadow-white/10' 
    : 'border-neutral-800/80 bg-neutral-950 text-white';

  return (
    <div 
      className={`relative flex flex-col items-center justify-center rounded-2xl shadow-2xl border overflow-hidden ${bgClass} ${widthClass}`}
      style={{ perspective: '400px' }}
    >
      {/* Top Half subtle shade */}
      <div className={`absolute top-0 inset-x-0 h-1/2 ${isDeep ? 'bg-black/[0.04]' : 'bg-black/[0.25]'}`} />
      
      {/* Horizontal divider line */}
      <div className={`absolute inset-x-0 top-1/2 h-[1.5px] z-10 ${isDeep ? 'bg-black/10' : 'bg-black/60'}`} />

      {/* Number with 3D Flip effect using Framer Motion */}
      <AnimatePresence mode="popLayout">
         <motion.span
          key={digit}
          initial={{ rotateX: -80, opacity: 0 }}
          animate={{ rotateX: 0, opacity: 1 }}
          exit={{ rotateX: 80, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={`absolute font-mono font-black select-none ${textClass}`}
          style={{ backfaceVisibility: 'hidden', transformOrigin: 'center center' }}
        >
          {digit}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

function FlipClock({ seconds, isDark, size = 'sm', isDeep = false }: FlipClockProps) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  
  const mStr = mins.toString().padStart(2, '0');
  const sStr = secs.toString().padStart(2, '0');

  let dotSize = 'w-1.5 h-1.5';
  let gapClass = 'gap-1';
  let colonGap = 'gap-1.5 px-0.5';

  if (size === 'md') {
    dotSize = 'w-2 h-2';
    gapClass = 'gap-1.5';
    colonGap = 'gap-2 px-1';
  } else if (size === 'lg') {
    dotSize = 'w-3 h-3';
    gapClass = 'gap-2.5';
    colonGap = 'gap-3 px-1.5';
  } else if (size === 'xl') {
    dotSize = 'w-4 h-4';
    gapClass = 'gap-4';
    colonGap = 'gap-4 px-2';
  } else if (size === '2xl') {
    dotSize = 'w-5 h-5';
    gapClass = 'gap-5';
    colonGap = 'gap-5 px-3';
  }

  return (
    <div className={`flex items-center ${gapClass}`}>
      {/* Minutes */}
      <FlipDigit digit={mStr[0]} isDark={isDark} size={size} isDeep={isDeep} />
      <FlipDigit digit={mStr[1]} isDark={isDark} size={size} isDeep={isDeep} />

      {/* Colon Separator */}
      <div className={`flex flex-col ${colonGap} animate-pulse shrink-0`}>
        <div className={`rounded-full ${dotSize} ${isDeep ? 'bg-neutral-300' : 'bg-neutral-500'}`} />
        <div className={`rounded-full ${dotSize} ${isDeep ? 'bg-neutral-300' : 'bg-neutral-500'}`} />
      </div>

      {/* Seconds */}
      <FlipDigit digit={sStr[0]} isDark={isDark} size={size} isDeep={isDeep} />
      <FlipDigit digit={sStr[1]} isDark={isDark} size={size} isDeep={isDeep} />
    </div>
  );
}

interface FocusModeProps {
  tasks: Task[];
  theme: ThemeConfig;
  onToggleTask?: (id: string, dateStr?: string) => void;
}

type FocusType = 'pomodoro' | 'breathing';
type SoundType = 'none' | 'ocean' | 'rain' | 'alpha';

export default function FocusMode({ tasks, theme, onToggleTask }: FocusModeProps) {
  const isDark = theme.id === 'plum';
  const primaryText = isDark ? 'text-[#F3EBF0]' : 'text-[#1A1A1A]';
  const secondaryText = isDark ? 'text-[#F3EBF0]/60' : 'text-black/55';
  const borderClass = theme.borderClass;

  // Tabs / Selection
  const [activeTab, setActiveTab] = useState<FocusType>('pomodoro');
  const [isImmersive, setIsImmersive] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');

  // Pomodoro Timer States
  const [pomoMinutes, setPomoMinutes] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionType, setSessionType] = useState<'focus' | 'shortBreak' | 'longBreak'>('focus');
  const [completedSessions, setCompletedSessions] = useState<number>(() => {
    return parseInt(localStorage.getItem('pomo_completed_sessions') || '0', 10);
  });

  // Breathing Guide States
  // Box breathing cycle: Inhale (4s) -> Hold (4s) -> Exhale (4s) -> Hold (4s)
  const [breathStage, setBreathStage] = useState<'inhale' | 'holdIn' | 'exhale' | 'holdOut'>('inhale');
  const [breathProgress, setBreathProgress] = useState(0); // 0 to 100 within current 4s stage
  const [breathCount, setBreathCount] = useState(0);

  // Sound Synth States
  const [activeSound, setActiveSound] = useState<SoundType>('none');
  const [volume, setVolume] = useState(0.5);

  // Web Audio Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const soundNodesRef = useRef<{
    source?: AudioBufferSourceNode;
    gainNode?: GainNode;
    filterNode?: BiquadFilterNode;
    lfoNode?: OscillatorNode;
    lfoGain?: GainNode;
    leftOsc?: OscillatorNode;
    rightOsc?: OscillatorNode;
    mergerNode?: ChannelMergerNode;
  }>({});

  // Timer Ref
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const breathIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Active task selection
  const todayStr = new Date().toISOString().substring(0, 10);
  const activeTask = tasks.find(t => t.id === selectedTaskId);
  const pendingTasks = tasks.filter(t => doesTaskMatchDate(t, todayStr) && !isTaskCompletedOnDate(t, todayStr));

  // Initialize completed count
  useEffect(() => {
    localStorage.setItem('pomo_completed_sessions', completedSessions.toString());
  }, [completedSessions]);

  // Setup/Teardown Timers
  useEffect(() => {
    if (isRunning && activeTab === 'pomodoro') {
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleSessionComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isRunning, sessionType, activeTab]);

  // Breathing cycle interval
  useEffect(() => {
    if (isRunning && activeTab === 'breathing') {
      let startTime = Date.now();
      const stageDuration = 4000; // 4 seconds per stage

      breathIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / stageDuration) * 100, 100);
        setBreathProgress(progress);

        if (elapsed >= stageDuration) {
          startTime = Date.now();
          setBreathStage((prev) => {
            switch (prev) {
              case 'inhale': return 'holdIn';
              case 'holdIn': return 'exhale';
              case 'exhale': return 'holdOut';
              case 'holdOut':
                setBreathCount(c => c + 1);
                return 'inhale';
              default: return 'inhale';
            }
          });
        }
      }, 50);
    } else {
      if (breathIntervalRef.current) clearInterval(breathIntervalRef.current);
      setBreathProgress(0);
    }

    return () => {
      if (breathIntervalRef.current) clearInterval(breathIntervalRef.current);
    };
  }, [isRunning, activeTab]);

  // Synced audio generator
  useEffect(() => {
    if (activeSound !== 'none') {
      startSynth();
    } else {
      stopSynth();
    }
    return () => stopSynth();
  }, [activeSound]);

  // Update volume node if volume slider changes
  useEffect(() => {
    if (soundNodesRef.current.gainNode) {
      soundNodesRef.current.gainNode.gain.setValueAtTime(volume * 0.15, audioCtxRef.current?.currentTime || 0);
    }
  }, [volume]);

  // Handle pomodoro state adjustments when resetting duration
  const setTimerPreset = (minutes: number, type: typeof sessionType) => {
    setIsRunning(false);
    setSessionType(type);
    setPomoMinutes(minutes);
    setTimeLeft(minutes * 60);
    playChime('click');
  };

  const handleSessionComplete = () => {
    setIsRunning(false);
    playChime('alert');
    
    if (sessionType === 'focus') {
      setCompletedSessions(prev => prev + 1);
      
      // Auto toggle associated task if completed and user wishes
      if (activeTask && onToggleTask) {
        onToggleTask(activeTask.id, todayStr);
      }
      // Set break automatically
      setTimerPreset(5, 'shortBreak');
    } else {
      setTimerPreset(25, 'focus');
    }
  };

  const toggleRunning = () => {
    setIsRunning(prev => !prev);
    playChime('click');
  };

  const resetFocus = () => {
    setIsRunning(false);
    if (activeTab === 'pomodoro') {
      setTimeLeft(pomoMinutes * 60);
    } else {
      setBreathStage('inhale');
      setBreathProgress(0);
      setBreathCount(0);
    }
    playChime('click');
  };

  // Synthesizer Web Audio logic
  const startSynth = () => {
    try {
      stopSynth(); // Clean old nodes
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      const mainGain = ctx.createGain();
      mainGain.gain.setValueAtTime(volume * 0.15, ctx.currentTime);
      mainGain.connect(ctx.destination);
      soundNodesRef.current.gainNode = mainGain;

      if (activeSound === 'rain' || activeSound === 'ocean') {
        // Create pink-ish white noise
        const bufferSize = ctx.sampleRate * 4; // 4 seconds buffer
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          // Pink noise filter approximation
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
          data[i] *= 0.11; // normalise
          b6 = white * 0.115926;
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';

        if (activeSound === 'rain') {
          // Rain: Constant soothing high-cut filter
          filter.frequency.setValueAtTime(1200, ctx.currentTime);
          source.connect(filter);
          filter.connect(mainGain);
        } else if (activeSound === 'ocean') {
          // Ocean waves: LFO sweeps filter & volume slowly
          filter.frequency.setValueAtTime(350, ctx.currentTime);
          
          const lfo = ctx.createOscillator();
          lfo.frequency.setValueAtTime(0.12, ctx.currentTime); // ~8 seconds wave period
          
          const lfoGain = ctx.createGain();
          lfoGain.gain.setValueAtTime(250, ctx.currentTime); // modulate filter by +/- 250 Hz

          lfo.connect(lfoGain);
          lfoGain.connect(filter.frequency);

          // Wave volume swell
          const volLfo = ctx.createGain();
          const ampLfo = ctx.createOscillator();
          ampLfo.frequency.setValueAtTime(0.12, ctx.currentTime);
          
          const ampLfoGain = ctx.createGain();
          ampLfoGain.gain.setValueAtTime(0.4, ctx.currentTime);

          ampLfo.connect(ampLfoGain);
          // offset to prevent negative values
          const offset = ctx.createConstantSource ? ctx.createConstantSource() : null;
          if (offset) {
            offset.offset.setValueAtTime(0.6, ctx.currentTime);
            ampLfoGain.connect(volLfo.gain);
            offset.connect(volLfo.gain);
            offset.start();
            soundNodesRef.current.source = source; // dummy
          } else {
            ampLfoGain.connect(volLfo.gain);
          }

          source.connect(filter);
          filter.connect(volLfo);
          volLfo.connect(mainGain);

          ampLfo.start();
          lfo.start();
          
          soundNodesRef.current.lfoNode = lfo;
          soundNodesRef.current.lfoGain = lfoGain;
        }

        source.start();
        soundNodesRef.current.source = source;
        soundNodesRef.current.filterNode = filter;

      } else if (activeSound === 'alpha') {
        // Binaural Alpha Waves
        // Warm drone: Left 150Hz, Right 160Hz (10Hz difference is alpha rate)
        const oscL = ctx.createOscillator();
        const oscR = ctx.createOscillator();
        
        oscL.type = 'sine';
        oscL.frequency.setValueAtTime(150, ctx.currentTime);

        oscR.type = 'sine';
        oscR.frequency.setValueAtTime(160, ctx.currentTime);

        const merger = ctx.createChannelMerger(2);
        
        // Lowpass filters for each to make it deep and comfortable
        const filterL = ctx.createBiquadFilter();
        const filterR = ctx.createBiquadFilter();
        filterL.type = 'lowpass';
        filterL.frequency.setValueAtTime(180, ctx.currentTime);
        filterR.type = 'lowpass';
        filterR.frequency.setValueAtTime(180, ctx.currentTime);

        oscL.connect(filterL);
        oscR.connect(filterR);

        filterL.connect(merger, 0, 0);
        filterR.connect(merger, 0, 1);

        merger.connect(mainGain);

        oscL.start();
        oscR.start();

        soundNodesRef.current.leftOsc = oscL;
        soundNodesRef.current.rightOsc = oscR;
        soundNodesRef.current.mergerNode = merger;
      }
    } catch (err) {
      console.warn("Failed to generate sound dynamically:", err);
    }
  };

  const stopSynth = () => {
    try {
      const nodes = soundNodesRef.current;
      if (nodes.source) {
        nodes.source.disconnect();
        try { nodes.source.stop(); } catch(e){}
      }
      if (nodes.lfoNode) {
        nodes.lfoNode.disconnect();
        try { nodes.lfoNode.stop(); } catch(e){}
      }
      if (nodes.leftOsc) {
        nodes.leftOsc.disconnect();
        try { nodes.leftOsc.stop(); } catch(e){}
      }
      if (nodes.rightOsc) {
        nodes.rightOsc.disconnect();
        try { nodes.rightOsc.stop(); } catch(e){}
      }
      if (nodes.gainNode) {
        nodes.gainNode.disconnect();
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
      }
    } catch(e){}
    soundNodesRef.current = {};
    audioCtxRef.current = null;
  };

  // Format Helper for timer
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Breathing Visual Specs based on breathState
  const getBreathingMetrics = () => {
    switch (breathStage) {
      case 'inhale':
        return {
          scale: 1.35 + (breathProgress / 100) * 0.4, // expand 1.35 to 1.75
          opacity: 0.4 + (breathProgress / 100) * 0.6, // glow up
          text: '吸气 Inhale',
          desc: '慢吸一口气，扩展腹部'
        };
      case 'holdIn':
        return {
          scale: 1.75, // stay big
          opacity: 1.0,
          text: '屏息 Hold',
          desc: '平静安详，守住这份宁静'
        };
      case 'exhale':
        return {
          scale: 1.75 - (breathProgress / 100) * 0.4, // shrink down
          opacity: 1.0 - (breathProgress / 100) * 0.6, // glow down
          text: '呼气 Exhale',
          desc: '平缓吐气，带走疲倦'
        };
      case 'holdOut':
        return {
          scale: 1.35, // stay small
          opacity: 0.4,
          text: '屏息 Hold',
          desc: '身心澄空，准备下个循环'
        };
    }
  };

  const breathMetrics = getBreathingMetrics();

  // Handle Tab Switch
  const handleTabChange = (tab: FocusType) => {
    setIsRunning(false);
    setActiveTab(tab);
    resetFocus();
  };

  return (
    <>
      {/* Primary Card */}
      <div 
        className={`${theme.cardBg} rounded-3xl border ${borderClass} p-6 shadow-sm flex flex-col space-y-6 transition-all duration-500`}
        id="focus-card"
      >
        <div className="flex items-center justify-between pb-4 border-b border-black/[0.05]">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-2xl ${isDark ? 'bg-[#E05275]/15 text-[#E05275]' : 'bg-black/5 text-black'}`}>
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-lg font-serif font-black ${primaryText}`}>
                专注仪式
              </h3>
              <p className={`text-[10px] font-mono tracking-widest uppercase ${secondaryText} mt-0.5`}>
                IMMERSIVE FOCUS ENGINE
              </p>
            </div>
          </div>

          {/* Tab Selector */}
          <div className={`flex items-center border ${isDark ? 'border-white/10 bg-[#22191C]' : 'border-black/10 bg-[#FAF9F6]'} rounded-xl p-0.5 text-xs font-bold`}>
            <button
              onClick={() => handleTabChange('pomodoro')}
              className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                activeTab === 'pomodoro'
                  ? isDark ? 'bg-[#E05275] text-white' : 'bg-black text-white'
                  : isDark ? 'text-[#F3EBF0]/60 hover:text-white' : 'text-black/55 hover:text-black'
              }`}
            >
              番茄钟
            </button>
            <button
              onClick={() => handleTabChange('breathing')}
              className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                activeTab === 'breathing'
                  ? isDark ? 'bg-[#E05275] text-white' : 'bg-black text-white'
                  : isDark ? 'text-[#F3EBF0]/60 hover:text-white' : 'text-black/55 hover:text-black'
              }`}
            >
              呼吸灯
            </button>
          </div>
        </div>

        {/* Task Linkage Select */}
        <div className="space-y-2">
          <label className={`text-[10px] font-mono tracking-widest font-black uppercase flex items-center gap-1.5 ${secondaryText}`}>
            <Target className="w-3.5 h-3.5" />
            关联待办任务 / FOCUS TARGET
          </label>
          <select
            value={selectedTaskId}
            onChange={(e) => {
              setSelectedTaskId(e.target.value);
              playChime('click');
            }}
            className={`w-full text-xs font-medium border ${
              isDark ? 'border-white/10 bg-[#1C1619] text-[#F3EBF0]' : 'border-black/10 bg-white text-black'
            } rounded-2xl px-3.5 py-3 focus:outline-none cursor-pointer`}
          >
            <option value="">🍀 无特定关联任务（自由专注）</option>
            {pendingTasks.map((t) => (
              <option key={t.id} value={t.id} className="text-black">
                📌 {t.time ? `[${t.time}] ` : ''}{t.content}
              </option>
            ))}
          </select>
        </div>

        {/* Core Screen */}
        <div className="flex flex-col items-center justify-center py-6 relative rounded-2xl overflow-hidden min-h-[280px]">
          {/* Subtle Ambient Background Gradient that pulses slightly in focus */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/[0.02] pointer-events-none" />

          {activeTab === 'pomodoro' ? (
            /* POMODORO VIEW */
            <div className="text-center space-y-6 z-10 flex flex-col items-center w-full py-4">
              {/* Thin and light rectangular progress style countdown visualizer */}
              <div className="relative w-[36rem] h-[18rem] max-w-full flex items-center justify-center">
                <svg viewBox="0 0 320 160" className="w-full h-full select-none" style={{ color: isDark ? '#E05275' : '#1A1A1A' }}>
                  {/* Outer Case Track - thinner and lighter */}
                  <rect
                    x="8"
                    y="8"
                    width="304"
                    height="144"
                    rx="16"
                    ry="16"
                    fill={isDark ? 'rgba(255, 255, 255, 0.01)' : 'rgba(0, 0, 0, 0.005)'}
                    stroke={isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}
                    strokeWidth="1.5"
                  />

                  {/* Active Progress Rect - thinner */}
                  <motion.rect
                    x="8"
                    y="8"
                    width="304"
                    height="144"
                    rx="16"
                    ry="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    pathLength="100"
                    animate={{
                      strokeDashoffset: 100 * (1 - timeLeft / (pomoMinutes * 60))
                    }}
                    style={{
                      strokeDasharray: "100",
                    }}
                    transition={{ duration: 1, ease: 'linear' }}
                  />
                </svg>

                {/* Counter text overlaid */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <FlipClock seconds={timeLeft} isDark={isDark} size="lg" />
                  <span className={`text-[10px] font-mono tracking-widest font-black uppercase mt-5 px-2.5 py-0.5 rounded-full ${
                    sessionType === 'focus' 
                      ? isDark ? 'bg-[#E05275]/15 text-[#E05275]' : 'bg-black text-white'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}>
                    {sessionType === 'focus' ? '工作 Focus' : sessionType === 'shortBreak' ? '短休 Break' : '长休'}
                  </span>
                </div>
              </div>

              {/* Presets */}
              <div className="flex flex-wrap items-center justify-center gap-2 px-3">
                <button
                  onClick={() => setTimerPreset(25, 'focus')}
                  className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                    pomoMinutes === 25 && sessionType === 'focus'
                      ? isDark ? 'bg-white/10 text-white' : 'bg-black/5 text-black font-black'
                      : 'opacity-50 hover:opacity-100 text-current'
                  }`}
                >
                  25分钟
                </button>
                <span className="opacity-20 text-xs">|</span>
                <button
                  onClick={() => setTimerPreset(45, 'focus')}
                  className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                    pomoMinutes === 45 && sessionType === 'focus'
                      ? isDark ? 'bg-white/10 text-white' : 'bg-black/5 text-black font-black'
                      : 'opacity-50 hover:opacity-100 text-current'
                  }`}
                >
                  45分钟
                </button>
                <span className="opacity-20 text-xs">|</span>
                <button
                  onClick={() => setTimerPreset(5, 'shortBreak')}
                  className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                    sessionType === 'shortBreak'
                      ? 'bg-emerald-500/10 text-emerald-500 font-black'
                      : 'opacity-50 hover:opacity-100 text-current'
                  }`}
                >
                  5分休息
                </button>
                <span className="opacity-20 text-xs">|</span>
                <div className="flex items-center gap-1.5 pl-1 shrink-0">
                  <button
                    onClick={() => {
                      const newMins = Math.max(1, pomoMinutes - 1);
                      setTimerPreset(newMins, sessionType);
                    }}
                    className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold border transition-colors cursor-pointer ${
                      isDark ? 'border-white/10 hover:bg-white/5 text-white' : 'border-black/10 hover:bg-black/5 text-black'
                    }`}
                    title="减少1分钟"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={pomoMinutes}
                    onChange={(e) => {
                      const val = Math.max(1, Math.min(180, parseInt(e.target.value) || 1));
                      setTimerPreset(val, sessionType);
                    }}
                    className={`w-9 text-center text-[10px] font-mono font-bold rounded-md border py-0.5 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                      isDark 
                        ? 'bg-[#1C1619] border-white/10 text-[#F3EBF0]' 
                        : 'bg-white border-black/10 text-black'
                    }`}
                  />
                  <button
                    onClick={() => {
                      const newMins = Math.min(180, pomoMinutes + 1);
                      setTimerPreset(newMins, sessionType);
                    }}
                    className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold border transition-colors cursor-pointer ${
                      isDark ? 'border-white/10 hover:bg-white/5 text-white' : 'border-black/10 hover:bg-black/5 text-black'
                    }`}
                    title="增加1分钟"
                  >
                    +
                  </button>
                  <span className="text-[9px] font-bold opacity-60">分钟</span>
                </div>
              </div>
            </div>
          ) : (
            /* BREATHING LIGHT VIEW */
            <div className="text-center space-y-6 z-10 w-full flex flex-col items-center">
              {/* Dynamic Breathing Halo */}
              <div className="relative w-48 h-48 flex items-center justify-center">
                {/* Expanding outer blur ring */}
                <motion.div
                  className={`absolute w-28 h-28 rounded-full ${isDark ? 'bg-[#E05275]/25' : 'bg-black/5'} filter blur-2xl`}
                  animate={{
                    scale: breathMetrics.scale * 1.3,
                    opacity: breathMetrics.opacity * 0.75
                  }}
                  transition={{ duration: 0.1, ease: 'easeInOut' }}
                />

                {/* Core animated bubble */}
                <motion.div
                  className={`w-28 h-28 rounded-full flex items-center justify-center text-white font-bold shadow-lg ${
                    isDark 
                      ? 'bg-gradient-to-br from-[#E05275] to-[#B0284F]' 
                      : 'bg-gradient-to-br from-[#1A1A1A] to-[#3A3A3A]'
                  }`}
                  animate={{
                    scale: breathMetrics.scale
                  }}
                  style={{
                    boxShadow: isDark 
                      ? `0 0 20px rgba(224, 82, 117, ${breathMetrics.opacity * 0.6})` 
                      : `0 0 20px rgba(0, 0, 0, ${breathMetrics.opacity * 0.3})`
                  }}
                  transition={{ duration: 0.1, ease: 'easeInOut' }}
                >
                  <div className="flex flex-col items-center justify-center text-center">
                    <Wind className="w-5 h-5 animate-pulse mb-1" />
                    <span className="text-[10px] tracking-widest font-mono font-black uppercase text-white/80">
                      {breathCount} 次
                    </span>
                  </div>
                </motion.div>
              </div>

              {/* Instruction guides */}
              <div className="space-y-1">
                <h4 className={`text-xl font-serif font-black ${primaryText}`}>
                  {breathMetrics.text}
                </h4>
                <p className={`text-xs ${secondaryText} font-medium`}>
                  {breathMetrics.desc}
                </p>
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center gap-4 mt-6 z-10">
            <button
              onClick={toggleRunning}
              className={`px-6 py-2.5 rounded-full font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md ${
                isRunning 
                  ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                  : isDark ? 'bg-[#E05275] hover:bg-[#E05275]/90 text-white' : 'bg-black hover:bg-black/90 text-white'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  暂停专注
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  开始专注
                </>
              )}
            </button>

            <button
              onClick={resetFocus}
              className={`p-3 rounded-full border ${
                isDark ? 'border-white/10 hover:bg-white/5 text-[#F3EBF0]' : 'border-black/10 hover:bg-black/5 text-black'
              } transition-all cursor-pointer`}
              title="重置"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                setIsImmersive(true);
                playChime('click');
              }}
              className={`p-3 rounded-full border ${
                isDark ? 'border-white/10 hover:bg-white/5 text-[#F3EBF0]' : 'border-black/10 hover:bg-black/5 text-black'
              } transition-all cursor-pointer`}
              title="沉浸全屏模式"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Ambient Synthesizer Deck */}
        <div className={`pt-4 border-t border-black/[0.05] space-y-3`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-mono tracking-widest font-black uppercase flex items-center gap-1.5 ${secondaryText}`}>
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              专注白噪音合成器 / WHITE NOISE SYNTH
            </span>
            <div className="flex items-center gap-1.5">
              {volume === 0 ? <VolumeX className="w-3.5 h-3.5 opacity-40" /> : <Volume2 className="w-3.5 h-3.5 opacity-40" />}
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-16 h-1 bg-black/10 rounded-lg appearance-none cursor-pointer accent-black"
                title="音量"
              />
            </div>
          </div>

          {/* Sound options */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'none', label: '🔇 静音', title: '无背景声' },
              { id: 'ocean', label: '🌊 潮汐', title: '深海潮汐，助您平复心率' },
              { id: 'rain', label: '🌧️ 细雨', title: '林中降雨，遮蔽外界杂音' },
              { id: 'alpha', label: '🎧 阿尔法', title: '10Hz双耳节拍，提高工作注意力' }
            ].map((snd) => {
              const active = activeSound === snd.id;
              return (
                <button
                  key={snd.id}
                  onClick={() => {
                    setActiveSound(snd.id as SoundType);
                    playChime('click');
                  }}
                  className={`py-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer truncate ${
                    active
                      ? isDark 
                        ? 'bg-[#E05275]/10 border-[#E05275] text-[#E05275]' 
                        : 'bg-black/5 border-black text-black'
                      : isDark
                        ? 'border-white/10 hover:bg-white/5 text-[#F3EBF0]/70'
                        : 'border-black/5 hover:bg-black/5 text-black/60'
                  }`}
                  title={snd.title}
                >
                  {snd.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Local Achievements metrics */}
        <div className={`pt-4 border-t border-black/[0.05] flex items-center justify-between text-xs`}>
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className={`${secondaryText} font-medium`}>今日已达成：</span>
            <span className={`font-mono font-black ${primaryText}`}>
              {completedSessions} 次番茄专注
            </span>
          </div>
          {completedSessions > 0 && (
            <button
              onClick={() => {
                setCompletedSessions(0);
                playChime('click');
              }}
              className={`text-[9px] uppercase tracking-widest font-bold opacity-45 hover:opacity-100 underline cursor-pointer`}
            >
              清空成就
            </button>
          )}
        </div>
      </div>

      {/* FULLSCREEN IMMERSIVE OVERLAY */}
      <AnimatePresence>
        {isImmersive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#0E0B0D] text-[#FAF9F6] flex flex-col items-center justify-between p-8 md:p-12 overflow-hidden"
          >
            {/* Top header on immersive view */}
            <div className="w-full max-w-4xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#E05275] text-white rounded-xl flex items-center justify-center font-serif text-lg font-black shadow">
                  A
                </div>
                <div>
                  <h3 className="text-sm font-serif font-black tracking-tight text-white/90">
                    日历专注仪式
                  </h3>
                  {activeTask && (
                    <p className="text-[10px] font-mono text-[#E05275] font-bold tracking-widest uppercase flex items-center gap-1 mt-0.5 animate-pulse">
                      <Target className="w-3 h-3" />
                      当前专注：{activeTask.content}
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => {
                  setIsImmersive(false);
                  playChime('click');
                }}
                className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-full text-[10px] tracking-widest font-black uppercase flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                退出全屏
              </button>
            </div>

            {/* Main Immersive Animation Space */}
            <div className="flex flex-col items-center justify-center flex-1 max-w-2xl w-full py-12">
              {activeTab === 'pomodoro' ? (
                /* POMODORO DEEP VIEW */
                <div className="text-center space-y-12 flex flex-col items-center w-full py-6">
                  {/* Giant thin and light rectangular progress visualizer */}
                  <div className="relative w-[52rem] h-[28rem] flex items-center justify-center max-w-full">
                    <svg viewBox="0 0 440 240" className="w-full h-full select-none" style={{ color: '#E05275' }}>
                      {/* Outer Case Track - thinner and lighter */}
                      <rect
                        x="12"
                        y="12"
                        width="416"
                        height="216"
                        rx="24"
                        ry="24"
                        fill="rgba(255, 255, 255, 0.005)"
                        stroke="rgba(255, 255, 255, 0.08)"
                        strokeWidth="1.5"
                      />

                      {/* Active Progress Rect - thinner */}
                      <motion.rect
                        x="12"
                        y="12"
                        width="416"
                        height="216"
                        rx="24"
                        ry="24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        pathLength="100"
                        animate={{
                          strokeDashoffset: 100 * (1 - timeLeft / (pomoMinutes * 60))
                        }}
                        style={{
                          strokeDasharray: "100",
                        }}
                        transition={{ duration: 1, ease: 'linear' }}
                      />
                    </svg>

                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <FlipClock seconds={timeLeft} isDark={true} size="xl" isDeep={true} />
                      <span className="text-xs tracking-widest font-mono font-black uppercase mt-8 px-3.5 py-1 bg-[#E05275] text-white rounded-full shadow-[0_0_15px_rgba(224,82,117,0.4)]">
                        {sessionType === 'focus' ? '深度工作中 FOCUS' : '轻松小憩 BREAK'}
                      </span>
                    </div>
                  </div>

                  {/* Association focus task content */}
                  {activeTask ? (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 max-w-sm">
                      <span className="text-[9px] tracking-widest text-[#E05275] font-black uppercase block mb-1">CURRENT ASSIGNED TASK</span>
                      <p className="text-md font-serif font-black text-white leading-relaxed">{activeTask.content}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-white/50 italic tracking-wider">“ 保持呼吸的节奏，忘却外界喧嚣 ”</p>
                  )}
                </div>
              ) : (
                /* BREATHING DEEP VIEW */
                <div className="text-center space-y-12 flex flex-col items-center w-full">
                  <div className="relative w-64 h-64 flex items-center justify-center">
                    {/* Glowing huge breathing ring */}
                    <motion.div
                      className="absolute w-40 h-40 rounded-full bg-[#E05275]/20 filter blur-3xl"
                      animate={{
                        scale: breathMetrics.scale * 1.5,
                        opacity: breathMetrics.opacity * 0.8
                      }}
                      transition={{ duration: 0.1, ease: 'easeInOut' }}
                    />

                    {/* Core pulsing capsule */}
                    <motion.div
                      className="w-36 h-36 rounded-full flex items-center justify-center bg-gradient-to-br from-[#E05275] to-[#901C3E] text-white shadow-2xl relative"
                      animate={{
                        scale: breathMetrics.scale * 1.15
                      }}
                      style={{
                        boxShadow: `0 0 30px rgba(224, 82, 117, ${breathMetrics.opacity * 0.7})`
                      }}
                      transition={{ duration: 0.1, ease: 'easeInOut' }}
                    >
                      <div className="flex flex-col items-center justify-center">
                        <Wind className="w-7 h-7 mb-1.5 text-white animate-pulse" />
                        <span className="text-xs tracking-widest font-mono font-bold text-white/95">
                          {breathCount} 次
                        </span>
                      </div>
                    </motion.div>
                  </div>

                  {/* Guided breathing large typography */}
                  <div className="space-y-2">
                    <motion.h2 
                      key={breathMetrics.text}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-3xl font-serif font-black tracking-tight text-white"
                    >
                      {breathMetrics.text}
                    </motion.h2>
                    <p className="text-sm text-white/60 font-medium">{breathMetrics.desc}</p>
                  </div>
                </div>
              )}


            </div>

            {/* Immersive controls bottom */}
            <div className="w-full max-w-xl flex flex-col items-center gap-6 pb-6">
              <div className="flex items-center gap-6">
                <button
                  onClick={toggleRunning}
                  className="px-8 py-3 bg-[#E05275] hover:bg-[#E05275]/90 text-white rounded-full font-black text-xs tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-lg hover:scale-105 active:scale-95"
                >
                  {isRunning ? (
                    <>
                      <Pause className="w-4 h-4 fill-current" />
                      暂停专注
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      启动专注
                    </>
                  )}
                </button>

                <button
                  onClick={resetFocus}
                  className="p-3.5 rounded-full border border-white/10 hover:bg-white/5 text-white/80 transition-all cursor-pointer"
                  title="重置"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Volume & Noise selection in immersive bar */}
              <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-4 py-2.5 rounded-2xl w-full max-w-md text-xs justify-between">
                <div className="flex items-center gap-1.5">
                  <Moon className="w-4 h-4 text-[#E05275]" />
                  <span className="text-[10px] font-mono font-bold tracking-widest text-white/60 uppercase">SOOTHING LULL</span>
                </div>
                
                <div className="flex items-center gap-2 pr-2">
                  {['none', 'ocean', 'rain', 'alpha'].map((sndId) => (
                    <button
                      key={sndId}
                      onClick={() => {
                        setActiveSound(sndId as SoundType);
                        playChime('click');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                        activeSound === sndId
                          ? 'bg-white text-black border-white'
                          : 'border-white/10 hover:bg-white/5 text-white/60'
                      }`}
                    >
                      {sndId === 'none' ? '静音' : sndId === 'ocean' ? '潮汐' : sndId === 'rain' ? '细雨' : '阿尔法'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
