import React, { useState, useRef, useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import { api } from "../services/api";
import {
  Send,
  Loader2,
  Database,
  Trash2,
  Paperclip,
  X,
  FileCheck
} from "lucide-react";

interface Message {
  sender: "user" | "violet";
  content: string;
  timestamp?: string;
}

const SUGGESTIONS = [
  "Add ₹250 spent on lunch.",
  "Create a reminder to pay electricity bill tomorrow.",
  "Add a meeting tomorrow at 3 PM.",
  "Show my expenses this month.",
  "Show my gym streak."
];

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

export const Assistant: React.FC = () => {
  const { accessToken } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  
  // Vision Attachment Uploads State
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch History on Mount
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get("/assistant/history");
        if (res.data.length > 0) {
          setMessages(res.data);
        } else {
          // Default Welcome Message
          setMessages([
            {
              sender: "violet",
              content: "Hello! I am **Violet**, your AI assistant companion. I have direct RAG integration with your database tables: Finance budgets, stock allocations, gym streaks, notes boards, and calendars. Try entering a command like *'Add ₹250 spent on lunch'* or upload a receipt photo below!"
            }
          ]);
        }
      } catch (err) {
        console.error("Failed to load chat history:", err);
      } finally {
        setIsHistoryLoading(false);
      }
    };
    fetchHistory();
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, isUploading]);

  // 2. Clear Chat history
  const handleClearHistory = async () => {
    if (confirm("Clear your chat conversation history?")) {
      try {
        await api.delete("/assistant/history");
        setMessages([
          {
            sender: "violet",
            content: "Conversation history cleared. How can I assist you with your command center workspaces today?"
          }
        ]);
      } catch (err) {
        console.error("Failed to clear history:", err);
      }
    }
  };

  // 3. File Attachment Select Handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachment(file);
    }
  };

  // 4. Send Message Handler (with streaming read support)
  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    // A. Push User bubble
    const userMsg: Message = { sender: "user", content: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    // B. Push empty placeholder Violet bubble for streaming
    const violetPlaceholder: Message = { sender: "violet", content: "" };
    setMessages((prev) => [...prev, violetPlaceholder]);

    try {
      // C. Stream fetch request
      const response = await fetch(`${API_BASE}/assistant/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify({ message: textToSend })
      });

      if (!response.body) {
        throw new Error("No readable response body stream");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accumulatedText = "";

      setIsLoading(false); // remove active loader ring

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        const chunk = decoder.decode(value, { stream: true });
        accumulatedText += chunk;

        // D. Append streamed word block chunk to last Violet bubble
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.sender === "violet") {
            last.content = accumulatedText;
          }
          return updated;
        });
      }
    } catch (err) {
      console.error(err);
      setIsLoading(false);
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.sender === "violet") {
          last.content = "Failed to stream assistant response. Please check backend server configuration.";
        }
        return updated;
      });
    }
  };

  // 5. Submit Form (Handles text prompt or vision attachments upload)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Scenario 1: Vision attachment upload inside chat
    if (attachment) {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", attachment);

      try {
        const res = await api.post("/assistant/upload-vision", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        
        // Append both User and Assistant bubbles returned by backend
        setMessages((prev) => [
          ...prev,
          res.data.user_message,
          res.data.assistant_response
        ]);
        setAttachment(null);
      } catch (err) {
        console.error(err);
        setMessages((prev) => [
          ...prev,
          { sender: "violet", content: "Failed to upload and scan image attachment." }
        ]);
      } finally {
        setIsUploading(false);
      }
      return;
    }

    // Scenario 2: Text command
    if (input.trim()) {
      handleSendMessage(input);
    }
  };

  const parseMarkdown = (text: string) => {
    if (!text) return "";
    return text
      .replace(/^### (.*$)/gim, '<h4 class="font-bold text-sm mt-3 mb-1 text-foreground border-b border-border/40 pb-0.5">$1</h4>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-extrabold text-foreground">$1</strong>')
      .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc text-xs text-muted-foreground">$1</li>')
      .split('\n').join('<br />');
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col justify-between animate-fade-in space-y-4">
      
      {/* Header Info */}
      <div className="flex justify-between items-center pb-2 border-b border-border/80">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Violet AI Command Center</h2>
          <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
            <Database size={13} className="text-primary" />
            Command parsing & actual database execution active
          </p>
        </div>
        
        {messages.length > 1 && (
          <button
            onClick={handleClearHistory}
            className="p-2 border border-border/60 hover:border-destructive/30 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-xl transition-all"
            title="Clear Chat Logs"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Main Conversation Pane */}
      <div className="flex-1 bg-card border border-border rounded-2xl p-6 shadow-sm overflow-y-auto space-y-4 min-h-[300px]">
        {isHistoryLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <Loader2 className="animate-spin text-primary" size={24} />
            <span className="text-xs text-muted-foreground font-semibold">Retrieving context conversation memory...</span>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isUser = msg.sender === "user";
            return (
              <div key={idx} className={`flex gap-3 max-w-[85%] ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}>
                <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-bold text-xs shadow-sm
                  ${isUser ? "bg-secondary text-foreground" : "bg-gradient-to-tr from-primary to-accent text-white"}`}>
                  {isUser ? "ME" : "V"}
                </div>

                <div className="space-y-1.5 min-w-0">
                  <div className={`p-4 rounded-2xl leading-relaxed text-xs border
                    ${isUser 
                      ? "bg-primary text-primary-foreground border-primary/20 rounded-tr-none" 
                      : "bg-secondary/40 text-foreground border-border/40 rounded-tl-none select-text"}`}>
                    
                    {isUser ? (
                      <p className="font-semibold">{msg.content}</p>
                    ) : (
                      <div 
                        className="space-y-2 select-text font-medium"
                        dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.content) }}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Streaming Loader */}
        {isLoading && (
          <div className="flex gap-3 max-w-[80%] mr-auto animate-pulse">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-accent text-white flex items-center justify-center font-bold text-xs shadow-sm">
              V
            </div>
            <div className="p-4 bg-secondary/40 border border-border/40 rounded-2xl rounded-tl-none flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
              <Loader2 className="animate-spin text-primary" size={14} />
              Violet is parsing commands...
            </div>
          </div>
        )}

        {/* Uploading Vision Loader */}
        {isUploading && (
          <div className="flex gap-3 max-w-[80%] mr-auto animate-pulse">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-accent text-white flex items-center justify-center font-bold text-xs shadow-sm">
              V
            </div>
            <div className="p-4 bg-secondary/40 border border-border/40 rounded-2xl rounded-tl-none flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
              <Loader2 className="animate-spin text-primary" size={14} />
              Violet AI is scanning photo pixels...
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Suggestion Chips */}
      {!isLoading && !isUploading && messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {SUGGESTIONS.map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(s)}
              className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 border border-border/40 rounded-full text-[10px] font-bold text-muted-foreground hover:text-foreground transition-all"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Upload attachment pill info preview */}
      {attachment && (
        <div className="px-4 py-2 bg-secondary border border-border rounded-xl flex items-center justify-between gap-3 text-xs w-64 mx-auto shadow-sm">
          <div className="flex items-center gap-1.5 truncate">
            <FileCheck size={14} className="text-emerald-500" />
            <span className="truncate font-bold text-[10px]">{attachment.name}</span>
          </div>
          <button
            onClick={() => setAttachment(null)}
            className="p-1 rounded-lg hover:bg-secondary/80 text-muted-foreground hover:text-foreground"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Message Input Board Bar with attachment hooks */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        {/* Attachment trigger */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading || isUploading}
          className="p-3 bg-card border border-border rounded-xl text-muted-foreground hover:text-foreground transition-colors shadow-sm"
        >
          <Paperclip size={15} />
        </button>
        <input
          type="file"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*"
        />

        <input
          type="text"
          required={!attachment} // If attachment is loaded, prompt can be blank to scan!
          disabled={isLoading || isUploading}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={attachment ? "Press send to scan image..." : "Ask Violet (e.g. 'Add ₹250 spent on lunch', 'owes me 500')"}
          className="flex-1 px-4 py-3 bg-card border border-border rounded-xl outline-none text-xs text-foreground focus:border-primary shadow-sm"
        />
        
        <button
          type="submit"
          disabled={isLoading || isUploading}
          className="px-4 bg-primary text-primary-foreground font-semibold rounded-xl text-xs hover:bg-primary/95 flex items-center justify-center transition-colors shadow"
        >
          <Send size={15} />
        </button>
      </form>

    </div>
  );
};
