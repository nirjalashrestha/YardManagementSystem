import { useEffect, useMemo, useRef, useState } from "react";
import { FiMessageCircle, FiSend, FiX } from "react-icons/fi";
import { sendAiSupport } from "../services/settingsService";
import "../styles/assistant.css";

const QUICK_PROMPTS = [
  "How to create arrival?",
  "How to assign dock?",
  "Why truck not in dock list?",
  "How to create entry?",
];

const STARTER_MESSAGE = {
  role: "assistant",
  text: "Hi, I am your YMS Assistant. Ask about arrivals, docks, yard map, or errors.",
};

const isGreeting = (text) => /^(hi|hello|hey|namaste)\b/i.test(String(text || "").trim());
const isAssistantBackendError = (text) => /^assistant error\b/i.test(String(text || "").trim());

const FALLBACK_ANSWERS = [
  {
    patterns: [/\bhow (to|do i)\s+(create|add)\s+(an?\s+)?arrival\b/, /\bnew\s+arrival\b/],
    text: "Go to Gate Activity > Arrivals > Add Arrival. Fill truck, trailer, driver, carrier, and facility details, then save.",
  },
  {
    patterns: [/\bhow (to|do i)\s+assign\s+(a\s+)?dock\b/, /\bdock assignment\b/],
    text: "Use Dock Management > Assign/Release Dock. Select an entered truck, choose an available dock in the same facility/location, and confirm.",
  },
  {
    patterns: [/\b(not|missing).*(dock list)\b/, /\btruck.*not.*dock list\b/],
    text: "A truck appears for dock assignment only when arrival status is Entered and the selected facility/location matches the dock.",
  },
  {
    patterns: [/\bhow (to|do i)\s+create\s+(an?\s+)?entry\b/, /\bmark\s+entry\b/],
    text: "Open Gate Activity, find a waiting arrival, then mark Entry at the gate. Only entered trucks can move to dock/yard workflows.",
  },
  {
    patterns: [/\byard\s+map\b/, /\bwhere.*truck\b/],
    text: "Open Yard Map to view slot status and gate flow. Use filters by facility/location to narrow the view.",
  },
  {
    patterns: [/\berror\b/, /\bfailed\b/, /\bvalidation\b/, /\bissue\b/],
    text: "Check required fields first, then confirm facility/location alignment and role permissions. If it still fails, copy the exact message and timestamp for support.",
  },
  {
    patterns: [/\bhow (to|do i)\s+(create|add)\s+(an?\s+)?departure\b/, /\bnew\s+departure\b/],
    text: "Go to Gate Activity > Departures > Add Departure. Select ref trailer/arrival, set exit gate and final status, then save.",
  },
  {
    patterns: [/\bwhy.*dock.*waiting list\b/, /\btruck.*not.*dock.*waiting\b/],
    text: "Only eligible arrivals appear in dock waiting: usually Entered status, same facility, and not already assigned/closed.",
  },
  {
    patterns: [/\bwhy.*location.*not.*showing\b/, /\blocation.*dropdown\b/],
    text: "Location dropdown is filtered by selected facility and location type. Select facility first, then check if locations exist and are active.",
  },
  {
    patterns: [/\bhow (to|do i)\s+assign\s+parking\b/, /\bassign\/release parking\b/],
    text: "Open Parking Management > Assign/Release Parking, select an eligible arrival, choose available slot in same facility, then confirm.",
  },
  {
    patterns: [/\bwhy.*parking slot.*occupied\b/, /\bparking.*shows occupied\b/],
    text: "A slot shows occupied when it has an active parking assignment (no park-out/final status yet). Release the assignment to free it.",
  },
  {
    patterns: [/\bhow (to|do i)\s+create\s+yard move\b/, /\bnew\s+yard move\b/],
    text: "Open Yard Move > Add Yard Move, fill trailer, facility, from location, to location, and status, then save.",
  },
  {
    patterns: [/\bwhy.*trailer.*not.*visible.*yard move\b/, /\btrailer.*yard move.*not.*show\b/],
    text: "Trailer list is filtered by active arrivals/facility/status. Check trailer exists in current facility and is not already departed/closed.",
  },
  {
    patterns: [/\bhow (to|do i)\s+create\s+yard check\b/, /\bnew\s+yard check\b/],
    text: "Open Yard Check > Add Yard Check, select trailer/facility/location and status, then save.",
  },
  {
    patterns: [/\bhow (to|do i)\s+create\s+inspection\b/, /\bnew\s+inspection\b/],
    text: "Open Inspection page > Add Inspection, select trailer/facility/location, fill findings and status, then save.",
  },
  {
    patterns: [/\bnotification count.*not.*reduc\b/, /\bmark(ed)? as read\b/],
    text: "Notification count reduces only after mark-read/read-all API succeeds. Open notifications and mark items read, then refresh.",
  },
  {
    patterns: [/\buser page.*401\b/, /\buser page.*403\b/, /\b401\/403\b/],
    text: "401 means token/session issue; 403 means role permission issue. Re-login for 401, and verify role policy for 403.",
  },
  {
    patterns: [/\bwhat role.*dock management\b/, /\bdock management.*access\b/],
    text: "Dock Management is typically allowed for Admin and Yard Manager operational roles. Check your RBAC policy mapping.",
  },
  {
    patterns: [/\bwhy.*facility.*delete failed\b/, /\bcannot delete facility\b/],
    text: "Facility delete fails when related records exist (locations, docks, carriers, goods, etc.). Remove dependencies first.",
  },
  {
    patterns: [/\bwhy gate count.*0 waiting\b/, /\b0 waiting\/entered\b/],
    text: "Gate count reads arrivals by gate locationId and status Waiting/Entered. If trailers moved onward or statuses differ, count becomes 0.",
  },
  {
    patterns: [/\bhow to fix time format.*am\/pm\b/, /\btime.*am.*pm\b/],
    text: "Use 12-hour formatting in UI render: locale with hour12 true. Ensure API date/time is parsed before display.",
  },
  {
    patterns: [/\bhow to filter by facility\b/, /\bfilter.*facility.*page\b/],
    text: "Use the facility dropdown on top of the page, then refresh/search. Most lists are scoped by selected facility.",
  },
  {
    patterns: [/\bwhy save button disabled\b/, /\bsave.*disabled\b/],
    text: "Save stays disabled when required fields are missing, invalid, or request is still loading. Check validation errors near fields.",
  },
  {
    patterns: [/\bhow to export report\b/, /\bexport.*report\b/],
    text: "Open Reports, apply date/facility filters, then click Export/Download (CSV/PDF) from the report action area.",
  },
];

function pickFallbackReply(message) {
  const text = (message || "").toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
  const hit = FALLBACK_ANSWERS.find((item) => item.patterns.some((pattern) => pattern.test(text)));
  if (hit) return hit.text;
  return "I can help with arrivals, entry, dock assignment, yard map, and validation errors. Ask your question in detail and include the screen/page name if possible.";
}

export default function YmsAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([STARTER_MESSAGE]);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  const quickPrompts = useMemo(() => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user")?.text?.toLowerCase() || "";
    if (!lastUser) return QUICK_PROMPTS;
    return QUICK_PROMPTS.filter((q) => !lastUser.includes(q.toLowerCase())).slice(0, 4);
  }, [messages]);

  const submitMessage = async (rawText) => {
    const text = (rawText || input).trim();
    if (!text || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setLoading(true);

    try {
      const res = await sendAiSupport({ message: text });
      let reply = (res?.reply || res?.response || res?.message || "").trim();
      if (!reply || isAssistantBackendError(reply)) {
        reply = isGreeting(text)
          ? "Hi! I am your YMS Assistant. Ask me about arrivals, docks, parking, yard moves, and errors."
          : pickFallbackReply(text);
      }
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
    } catch (e) {
      const status = Number(e?.response?.status || 0);
      const reply =
        status === 401
          ? "Session expired. Please login again, then ask me your question."
          : (isGreeting(text)
              ? "Hi! I am your YMS Assistant. Ask me about arrivals, docks, parking, yard moves, and errors."
              : pickFallbackReply(text));
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="yms-assistant-wrap" aria-live="polite">
      {open && (
        <section className="yms-assistant-panel" role="dialog" aria-label="YMS Assistant">
          <header className="yms-assistant-head">
            <div className="yms-assistant-title">YMS Assistant</div>
            <button
              type="button"
              className="yms-assistant-close"
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
            >
              <FiX size={15} />
            </button>
          </header>

          <div className="yms-assistant-chat" ref={scrollRef}>
            {messages.map((msg, idx) => (
              <div key={`${msg.role}-${idx}`} className={`yms-assistant-msg ${msg.role}`}>
                {msg.text}
              </div>
            ))}

            {quickPrompts.length > 0 && (
              <div className="yms-assistant-prompts">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="yms-assistant-chip"
                    onClick={() => submitMessage(prompt)}
                    disabled={loading}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {loading && <div className="yms-assistant-msg assistant">Typing...</div>}
          </div>

          <form
            className="yms-assistant-input-row"
            onSubmit={(e) => {
              e.preventDefault();
              submitMessage();
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask something..."
              disabled={loading}
            />
            <button type="submit" disabled={loading || !input.trim()}>
              <FiSend size={14} /> Send
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className="yms-assistant-fab"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Hide assistant" : "Open assistant"}
      >
        <FiMessageCircle size={20} />
      </button>
    </div>
  );
}
