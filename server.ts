import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK safely
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("WARNING: GEMINI_API_KEY is not defined. AI voice-parsing features will operate in demo mode.");
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

// Simple heuristic parser as a helper and robust fallback
function parseTaskHeuristically(text: string, referenceTime: string) {
  const dateObj = new Date(referenceTime);
  let taskDate = referenceTime.substring(0, 10);
  let recurrenceEndDate: string | undefined = undefined;
  let taskTime = "";
  let priority = "medium";
  let hasReminder = false;
  let isRecurring = false;
  let recurrence: "daily" | "weekly" | "monthly" | "workday" | "none" = "none";

  // Check for batch deletion commands
  if (
    text.includes("删除所有") ||
    text.includes("删除所有的") ||
    text.includes("清空所有") ||
    text.includes("清空所有的") ||
    text.includes("清空所有“") ||
    text.includes("删除所有“") ||
    text.startsWith("删除")
  ) {
    const keyword = text
      .replace(/(删除所有|删除所有的|清空所有|清空所有的|删除|“|”|'|")/g, "")
      .trim();
    if (keyword) {
      return {
        success: true,
        action: "delete_matching",
        deleteKeyword: keyword
      };
    }
  }

  // Simple recurrence recognition
  if (text.includes("每天") || text.includes("每日")) {
    isRecurring = true;
    recurrence = "daily";
  } else if (text.includes("每周") || text.includes("每星期") || text.includes("每个星期")) {
    isRecurring = true;
    recurrence = "weekly";
  } else if (text.includes("每月") || text.includes("每个月")) {
    isRecurring = true;
    recurrence = "monthly";
  } else if (text.includes("工作日") || text.includes("周一至周五") || text.includes("周一到周五")) {
    isRecurring = true;
    recurrence = "workday";
  }

  // Parse "下个月" vs "从下个月" vs "下周" / "从下周开始" / "下周每天"
  if (text.includes("从下个月") || text.includes("从下月") || text.includes("下个月开始") || text.includes("下月开始")) {
    const currentYear = dateObj.getFullYear();
    const currentMonth = dateObj.getMonth();
    const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const startOfNextMonth = new Date(nextMonthYear, nextMonth, 1);
    taskDate = startOfNextMonth.toISOString().substring(0, 10);
  } else if (text.includes("下个月") || text.includes("下月")) {
    const currentYear = dateObj.getFullYear();
    const currentMonth = dateObj.getMonth();
    const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const startOfNextMonth = new Date(nextMonthYear, nextMonth, 1);
    const endOfNextMonth = new Date(nextMonthYear, nextMonth + 1, 0); // last day of next month
    taskDate = startOfNextMonth.toISOString().substring(0, 10);
    recurrenceEndDate = endOfNextMonth.toISOString().substring(0, 10);
  } else if (text.includes("下周每天") || text.includes("下周的每天") || (text.includes("下周") && text.includes("每天"))) {
    isRecurring = true;
    recurrence = "daily";
    
    const currentDay = dateObj.getDay(); // 0 = Sun, 1 = Mon ...
    const daysToNextMonday = currentDay === 0 ? 1 : 8 - currentDay;
    const nextMonday = new Date(dateObj);
    nextMonday.setDate(dateObj.getDate() + daysToNextMonday);
    taskDate = nextMonday.toISOString().substring(0, 10);

    const nextSunday = new Date(nextMonday);
    nextSunday.setDate(nextMonday.getDate() + 6);
    recurrenceEndDate = nextSunday.toISOString().substring(0, 10);
  } else if (text.includes("从下周开始") || text.includes("下周开始")) {
    const currentDay = dateObj.getDay();
    const daysToNextMonday = currentDay === 0 ? 1 : 8 - currentDay;
    const nextMonday = new Date(dateObj);
    nextMonday.setDate(dateObj.getDate() + daysToNextMonday);
    taskDate = nextMonday.toISOString().substring(0, 10);
  } else {
    // Simple date recognition
    if (text.includes("明天")) {
      const tomorrow = new Date(dateObj);
      tomorrow.setDate(tomorrow.getDate() + 1);
      taskDate = tomorrow.toISOString().substring(0, 10);
    } else if (text.includes("后天")) {
      const afterTomorrow = new Date(dateObj);
      afterTomorrow.setDate(afterTomorrow.getDate() + 2);
      taskDate = afterTomorrow.toISOString().substring(0, 10);
    } else if (text.includes("下周")) {
      const nextWeek = new Date(dateObj);
      nextWeek.setDate(nextWeek.getDate() + 7);
      taskDate = nextWeek.toISOString().substring(0, 10);
    }
  }

  // End Date Recognition: e.g. "到7月底" or "到7月31号"
  const endMonthDayMatch = text.match(/到(\d{1,2})月(\d{1,2})[号日]/);
  const endMonthEndMatch = text.match(/到(\d{1,2})月底/);
  
  if (endMonthDayMatch) {
    const month = parseInt(endMonthDayMatch[1]);
    const day = parseInt(endMonthDayMatch[2]);
    let year = dateObj.getFullYear();
    if (month < dateObj.getMonth() + 1) {
      year += 1;
    }
    const end = new Date(year, month - 1, day);
    recurrenceEndDate = end.toISOString().substring(0, 10);
  } else if (endMonthEndMatch) {
    const month = parseInt(endMonthEndMatch[1]);
    let year = dateObj.getFullYear();
    if (month < dateObj.getMonth() + 1) {
      year += 1;
    }
    const lastDay = new Date(year, month, 0);
    recurrenceEndDate = lastDay.toISOString().substring(0, 10);
  }

  // Simple priority recognition
  if (text.includes("紧急") || text.includes("重要") || text.includes("高优先级") || text.includes("急事")) {
    priority = "high";
  } else if (text.includes("简单") || text.includes("低优先级") || text.includes("不急")) {
    priority = "low";
  }

  // Simple reminder recognition
  if (text.includes("提醒") || text.includes("闹钟") || text.includes("记得")) {
    hasReminder = true;
  }

  // Extract potential times (e.g., 10点, 15:30)
  const timeMatch = text.match(/(\d{1,2})[:：](\d{2})/);
  if (timeMatch) {
    taskTime = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
    hasReminder = true;
  } else {
    const hoursMatch = text.match(/(\d{1,2})点/);
    if (hoursMatch) {
      let hour = parseInt(hoursMatch[1]);
      if (text.includes("下午") && hour < 12) hour += 12;
      if (text.includes("晚上") && hour < 12) hour += 12;
      taskTime = `${hour.toString().padStart(2, '0')}:00`;
      hasReminder = true;
    }
  }

  // Clean task description
  let content = text
    .replace(/(从下个月开始|从下月开始|从下个月|从下月|下个月开始|下月开始|下个月的每天|下月的每天|下个月每天|下月每天|下个月|下月|从下周开始|下周开始|下周的每天|下周每天|每天|每日|每周|每星期|每个星期|每月|每个月|工作日|周一至周五|周一到周五)/g, "")
    .replace(/(明天|今天|后天|下周|提醒我|记得)/g, "")
    .replace(/到\d{1,2}月\d{1,2}[号日]/g, "")
    .replace(/到\d{1,2}月底/g, "")
    .replace(/\d{1,2}点(\d{2}分)?/g, "")
    .replace(/\d{1,2}[:：]\d{2}/g, "")
    .replace(/(高优先级|中优先级|低优先级|紧急|重要|不急)/g, "")
    .replace(/(删除所有|删除所有的|清空所有|清空所有的|删除|“|”|'|")/g, "")
    .trim();

  if (!content) content = text;

  return {
    success: true,
    action: "add",
    date: taskDate,
    time: taskTime || undefined,
    content,
    priority,
    hasReminder,
    reminderTime: taskTime || undefined,
    isRecurring,
    recurrence,
    recurrenceEndDate
  };
}

// API Route: Parse natural language task (from speech transcription or text)
app.post("/api/parse-task", async (req, res) => {
  const { text, userTime } = req.body;

  if (!text) {
    return res.status(400).json({ error: "Missing text to parse" });
  }

  const ai = getGeminiClient();

  // Reference time context provided by client, or fallback to current server time
  const referenceTime = userTime || new Date().toISOString();
  const dateObj = new Date(referenceTime);
  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayOfWeek = weekdays[dateObj.getDay()];

  if (!ai) {
    // Elegant fallback mock if API key is missing, so the app remains fully functional
    console.log("No Gemini API key found, running natural language parsing fallback logic.");
    const fallbackResult = parseTaskHeuristically(text, referenceTime);
    return res.json(fallbackResult);
  }

  try {
    const prompt = `You are an intelligent calendar task and command parser.
The user spoken or typed natural language task needs to be parsed into a structured calendar action.
The user's current local time is: ${referenceTime} (Day of week: ${dayOfWeek}).

User text: "${text}"

Determine if this is an ADD task action or a batch DELETE command:
A. If the user wants to DELETE tasks (e.g., "删除所有'看书'", "清空看书这个任务", "删除日历上所有的背单词"):
   1. Set action to "delete_matching".
   2. Set deleteKeyword to the specified keyword to be deleted (e.g. "看书").

B. If the user wants to ADD a task (e.g., "下周每天提醒我10点看书", "从下周开始到7月底每天下午三点健身"):
   1. Set action to "add".
   2. The exact task starting date in YYYY-MM-DD format (resolve terms like '今天', '明天', '下周一', '下个月5号' relative to ${referenceTime}. For "从下周开始", resolve next week's Monday).
   3. The specific task time in HH:MM format (24h) if mentioned (e.g., '下午三点' -> '15:00', '早上8:30' -> '08:30').
   4. A clean, concise Chinese task title/content (e.g. "看书", "健身"), removing raw temporal and command words.
   5. Priority level ('high', 'medium', 'low') based on urgency.
   6. Whether a reminder is needed (true/false).
   7. The specific reminder time in HH:MM format.
   8. Recurrence properties: isRecurring (true/false) and recurrence ('daily', 'weekly', 'monthly', 'workday', 'none').
   9. recurrenceEndDate: If there's an ending condition or duration range, calculate and specify the end date in YYYY-MM-DD format relative to reference time.
      Examples:
      - "下周每天提醒我..." -> recurrenceEndDate is Sunday of next week (7 days from Monday).
      - "从下周开始到7月底..." -> recurrenceEndDate is the last day of July (2026-07-31).
      - "下个月每天提醒我..." -> This means ONLY next month. Specify the task starting date as the 1st day of next month, AND specify recurrenceEndDate as the last day of next month.
      - "从下个月开始每天提醒我..." -> This means starting from next month but continuing indefinitely. Specify the task starting date as the 1st day of next month, but do NOT specify recurrenceEndDate (keep it null or empty).
      - If no end date is mentioned, keep recurrenceEndDate null/empty.

You must return a valid JSON object matching the requested schema.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            action: {
              type: Type.STRING,
              description: "The action requested by the user. Must be 'add' or 'delete_matching'."
            },
            deleteKeyword: {
              type: Type.STRING,
              description: "For 'delete_matching' actions, the specific keyword content to find and delete."
            },
            date: {
              type: Type.STRING,
              description: "The targeted starting date of the task in YYYY-MM-DD format, calculated relative to the reference local time."
            },
            time: {
              type: Type.STRING,
              description: "The time of the task in HH:MM format if specified, otherwise empty."
            },
            content: {
              type: Type.STRING,
              description: "The cleaned up, concise Chinese description of the task."
            },
            priority: {
              type: Type.STRING,
              description: "The priority of the task. Must be one of: 'high', 'medium', 'low'."
            },
            hasReminder: {
              type: Type.BOOLEAN,
              description: "Whether the user requested a notification/reminder for this task."
            },
            reminderTime: {
              type: Type.STRING,
              description: "The exact time for the reminder trigger in HH:MM format (24h)."
            },
            isRecurring: {
              type: Type.BOOLEAN,
              description: "Whether the task is a recurring/periodical task."
            },
            recurrence: {
              type: Type.STRING,
              description: "The recurrence period. Must be one of: 'daily', 'weekly', 'monthly', 'workday', 'none'."
            },
            recurrenceEndDate: {
              type: Type.STRING,
              description: "The ending date for the recurring task in YYYY-MM-DD format, if a range or deadline was specified."
            }
          },
          required: ["action", "isRecurring", "recurrence"]
        }
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
    return res.json({
      success: true,
      ...parsedData
    });
  } catch (error: any) {
    console.warn("Gemini Parsing Error - Falling back to Heuristic Parser:", error);
    // If Gemini fails for any reason (rate limits, key issue, format mismatch, etc.)
    // we seamlessly fall back to our high-quality regex/word matching parser!
    const fallbackResult = parseTaskHeuristically(text, referenceTime);
    return res.json(fallbackResult);
  }
});

async function startServer() {
  // Vite integration for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
