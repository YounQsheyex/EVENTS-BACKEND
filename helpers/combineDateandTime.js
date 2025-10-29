//  Convert any flexible time input → 24-hour format ("HH:mm")
const parseFlexibleTimeTo24 = (timeStr) => {
  if (!timeStr || typeof timeStr !== "string") return "";

  const cleaned = timeStr.trim().toUpperCase();

  //  Handle simple 24-hour input: "16:00" or "09:30"
  if (/^\d{1,2}:\d{2}$/.test(cleaned)) {
    const [hourStr, minute] = cleaned.split(":");
    const hour = parseInt(hourStr, 10);
    if (hour >= 0 && hour < 24) {
      return `${hour.toString().padStart(2, "0")}:${minute}`;
    }
  }

  //  Handle 12-hour input like "4:00PM", "04:30 am", "4:00 pm"
  const match = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return ""; // Invalid format — safe fallback

  let [, hourStr, minute, modifier] = match;
  let hour = parseInt(hourStr, 10);

  if (modifier) {
    modifier = modifier.toUpperCase();
    if (modifier === "PM" && hour < 12) hour += 12;
    if (modifier === "AM" && hour === 12) hour = 0;
  }

  return `${hour.toString().padStart(2, "0")}:${minute}`;
};

// Convert 24-hour ("HH:mm") → 12-hour ("hh:mm AM/PM")
const formatTimeToAmPm = (time) => {
  if (!time || typeof time !== "string") return "";
  const [hourStr, minute] = time.split(":");
  let hour = parseInt(hourStr, 10);
  if (isNaN(hour)) return time;

  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${ampm}`;
};

// Helper function to combine date and time into a single Date object
const combineDateAndTime = (date, timeStr) => {
  const [hour, minute] = timeStr.split(":").map(Number);
  const combined = new Date(date);
  combined.setHours(hour, minute, 0, 0);
  return combined;
};

module.exports = {
  parseFlexibleTimeTo24,
  formatTimeToAmPm,
  combineDateAndTime,
};
