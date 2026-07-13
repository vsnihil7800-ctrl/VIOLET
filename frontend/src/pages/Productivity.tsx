import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import {
  CheckSquare,
  FileText,
  Flame,
  Plus,
  Trash2,
  Loader2,
  Pin,
  Code,
  Laptop,
  HelpCircle,
  Edit3
} from "lucide-react";

interface TodoItem {
  id: string;
  user_id: string;
  title: string;
  completed: boolean;
  priority: string;
  due_date: string | null;
  created_at: string;
}

interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  color: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

const COLOR_OPTIONS = [
  { name: "slate", bg: "bg-slate-500/10 border-slate-500/30 text-slate-700 dark:text-slate-300" },
  { name: "indigo", bg: "bg-indigo-500/10 border-indigo-500/30 text-indigo-700 dark:text-indigo-300" },
  { name: "amber", bg: "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300" },
  { name: "emerald", bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300" },
  { name: "rose", bg: "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300" },
];

export const Productivity: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("checklist");
  
  // Checklist filters & inputs
  const [todoFilter, setTodoFilter] = useState<"all" | "active" | "completed">("all");
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [newTodoPriority, setNewTodoPriority] = useState("medium");

  // Sticky Note inputs & editor states
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteColor, setNoteColor] = useState("slate");
  const [isPinNote, setIsPinNote] = useState(false);
  const [isNoteSaving, setIsNoteSaving] = useState(false);

  // Coding logs inputs
  const [codeMinutes, setCodeMinutes] = useState("");
  const [codeCommits, setCodeCommits] = useState("");
  const [isLogSaving, setIsLogSaving] = useState(false);

  // ----------------- API QUERIES -----------------

  // 1. Fetch Summary
  const { data: summary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ["productivitySummary"],
    queryFn: async () => {
      const res = await api.get("/productivity/summary");
      return res.data;
    },
  });

  // 2. Fetch all Todos
  const { data: todos, isLoading: isTodosLoading } = useQuery<TodoItem[]>({
    queryKey: ["productivityTodos"],
    queryFn: async () => {
      const res = await api.get("/productivity/todos");
      return res.data;
    },
  });

  // 3. Fetch all Notes
  const { data: notes, isLoading: isNotesLoading } = useQuery<Note[]>({
    queryKey: ["productivityNotes"],
    queryFn: async () => {
      const res = await api.get("/productivity/notes");
      return res.data;
    },
  });

  // 4. Fetch coding streak logs
  const { data: streaks, isLoading: isStreaksLoading } = useQuery({
    queryKey: ["productivityStreaks"],
    queryFn: async () => {
      const res = await api.get("/productivity/streaks");
      return res.data;
    },
  });

  // ----------------- MUTATIONS: TODOS -----------------

  const createTodoMutation = useMutation({
    mutationFn: (payload: any) => api.post("/productivity/todos", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productivityTodos"] });
      queryClient.invalidateQueries({ queryKey: ["productivitySummary"] });
      setNewTodoTitle("");
    },
  });

  const toggleTodoMutation = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      api.patch(`/productivity/todos/${id}`, { completed }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productivityTodos"] });
      queryClient.invalidateQueries({ queryKey: ["productivitySummary"] });
    },
  });

  const deleteTodoMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/productivity/todos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productivityTodos"] });
      queryClient.invalidateQueries({ queryKey: ["productivitySummary"] });
    },
  });

  // ----------------- MUTATIONS: NOTES -----------------

  const createNoteMutation = useMutation({
    mutationFn: (payload: any) => api.post("/productivity/notes", payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["productivityNotes"] });
      queryClient.invalidateQueries({ queryKey: ["productivitySummary"] });
      handleSelectNote(res.data);
    },
  });

  const saveNoteMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      api.patch(`/productivity/notes/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productivityNotes"] });
      queryClient.invalidateQueries({ queryKey: ["productivitySummary"] });
      setIsNoteSaving(false);
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/productivity/notes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productivityNotes"] });
      queryClient.invalidateQueries({ queryKey: ["productivitySummary"] });
      setSelectedNote(null);
    },
  });

  // ----------------- MUTATIONS: CODING LOGS -----------------

  const createStreakMutation = useMutation({
    mutationFn: (payload: any) => api.post("/productivity/streaks", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productivityStreaks"] });
      queryClient.invalidateQueries({ queryKey: ["productivitySummary"] });
      setCodeMinutes("");
      setCodeCommits("");
      setIsLogSaving(false);
    },
  });

  // ----------------- ACTION HANDLERS -----------------

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoTitle.trim()) return;
    createTodoMutation.mutate({
      title: newTodoTitle.trim(),
      priority: newTodoPriority,
    });
  };

  const handleToggleTodo = (id: string, currentCompleted: boolean) => {
    toggleTodoMutation.mutate({ id, completed: !currentCompleted });
  };

  const handleDeleteTodo = (id: string) => {
    deleteTodoMutation.mutate(id);
  };

  const handleCreateNewNote = () => {
    createNoteMutation.mutate({
      title: "Untitled Note",
      content: "",
      color: "slate",
      is_pinned: false,
    });
  };

  const handleSelectNote = (n: Note) => {
    setSelectedNote(n);
    setNoteTitle(n.title);
    setNoteContent(n.content);
    setNoteColor(n.color);
    setIsPinNote(n.is_pinned);
  };

  const handleSaveNote = () => {
    if (!selectedNote) return;
    setIsNoteSaving(true);
    saveNoteMutation.mutate({
      id: selectedNote.id,
      payload: {
        title: noteTitle.trim() || "Untitled Note",
        content: noteContent,
        color: noteColor,
        is_pinned: isPinNote,
      },
    });
  };

  const handleDeleteNote = (id: string) => {
    if (confirm("Are you sure you want to delete this note stickies?")) {
      deleteNoteMutation.mutate(id);
    }
  };

  const handleLogCoding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeMinutes || parseInt(codeMinutes) <= 0) return;
    setIsLogSaving(true);
    createStreakMutation.mutate({
      minutes_coded: parseInt(codeMinutes),
      commits_count: codeCommits ? parseInt(codeCommits) : 0,
    });
  };

  // ----------------- CLIENT SIDE REGEX MARKDOWN ENGINE -----------------
  const parseMarkdownToHtml = (text: string) => {
    if (!text) return '<span class="text-muted-foreground italic text-xs">Type notes using Markdown formatting...</span>';
    
    // Clean up basic tags and escape html characters
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Convert Headers: # (h2), ## (h3), ### (h4)
    html = html.replace(/^### (.*$)/gim, '<h4 class="font-bold text-sm mt-3 mb-1 text-foreground border-b border-border/40 pb-0.5">$1</h4>');
    html = html.replace(/^## (.*$)/gim, '<h3 class="font-bold text-base mt-4 mb-1.5 text-foreground border-b border-border/60 pb-0.5">$1</h3>');
    html = html.replace(/^# (.*$)/gim, '<h2 class="font-black text-lg mt-5 mb-2.5 text-foreground border-b border-border pb-1">$1</h2>');

    // Bold & Italics
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong class="font-extrabold text-foreground">$1</strong>');
    html = html.replace(/\*(.*?)\*/gim, '<em class="italic">$1</em>');

    // Inline Code snippets
    html = html.replace(/`([^`]+)`/g, '<code class="bg-secondary/80 px-1 py-0.5 rounded text-[11px] font-mono border border-border text-primary font-bold">$1</code>');

    // Unordered list items (- or *)
    html = html.replace(/^\* (.*$)/gim, '<li class="ml-4 list-disc text-xs text-muted-foreground py-0.5">$1</li>');
    html = html.replace(/^- (.*$)/gim, '<li class="ml-4 list-disc text-xs text-muted-foreground py-0.5">$1</li>');

    // Line breaks
    return html.split('\n').join('<br />');
  };

  // Filter checklist items locally
  const filteredTodos = todos?.filter((item) => {
    if (todoFilter === "active") return !item.completed;
    if (todoFilter === "completed") return item.completed;
    return true;
  });

  const getPriorityColor = (p: string) => {
    if (p === "high") return "bg-rose-500/10 text-rose-500 border-rose-500/25";
    if (p === "medium") return "bg-amber-500/10 text-amber-500 border-amber-500/25";
    return "bg-indigo-500/10 text-indigo-500 border-indigo-500/25";
  };

  const getNoteCardStyle = (colorName: string) => {
    const opt = COLOR_OPTIONS.find(o => o.name === colorName);
    return opt ? opt.bg : COLOR_OPTIONS[0].bg;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Productivity & Notes</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Log coding streaks, manage prioritizing checklists, and write formatted rich notes
          </p>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Coding Streak Flame */}
        <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between shadow-sm relative overflow-hidden group">
          <div>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Coding Streak</p>
            <p className="text-2xl font-black mt-1 text-primary">
              {isSummaryLoading ? "..." : `${summary?.coding_streak ?? 0} Days`}
            </p>
          </div>
          <div className="p-3 bg-primary/10 text-primary rounded-xl group-hover:scale-110 transition-transform">
            <Flame size={20} className="fill-primary/20" />
          </div>
        </div>

        {/* Tasks Pending */}
        <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Pending Todos</p>
            <p className="text-2xl font-black mt-1 text-foreground">
              {isSummaryLoading ? "..." : `${summary?.pending_todos_count ?? 0} Active`}
            </p>
          </div>
          <div className="p-3 bg-secondary rounded-xl text-muted-foreground">
            <CheckSquare size={20} />
          </div>
        </div>

        {/* Total Stickies notes */}
        <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Total Notes</p>
            <p className="text-2xl font-black mt-1 text-foreground">
              {isSummaryLoading ? "..." : `${summary?.total_notes_count ?? 0} Files`}
            </p>
          </div>
          <div className="p-3 bg-secondary rounded-xl text-muted-foreground">
            <FileText size={20} />
          </div>
        </div>

        {/* Dynamic Log input bar */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center justify-center">
          <form onSubmit={handleLogCoding} className="w-full flex items-center gap-2">
            <div className="flex-1 space-y-1">
              <input
                type="number"
                required
                value={codeMinutes}
                onChange={(e) => setCodeMinutes(e.target.value)}
                placeholder="Mins Coded"
                className="w-full px-2 py-1 bg-secondary/50 border border-border rounded-lg outline-none text-xs text-center"
              />
              <input
                type="number"
                value={codeCommits}
                onChange={(e) => setCodeCommits(e.target.value)}
                placeholder="Commits"
                className="w-full px-2 py-1 bg-secondary/50 border border-border rounded-lg outline-none text-xs text-center"
              />
            </div>
            <button
              type="submit"
              disabled={isLogSaving}
              className="py-2.5 px-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/95 text-xs transition-colors shrink-0 flex items-center justify-center"
            >
              {isLogSaving ? <Loader2 size={12} className="animate-spin" /> : <Code size={14} />}
            </button>
          </form>
        </div>

      </div>

      {/* Main Tab Options */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col">
        
        {/* Selector tab row */}
        <div className="flex border-b border-border bg-card/60 backdrop-blur">
          {["checklist", "stickynotes", "streaklogs"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all
                ${activeTab === tab
                  ? "border-primary text-primary bg-secondary/20"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/10"
                }`}
            >
              {tab === "checklist" ? "To-Do Checklist" : tab === "stickynotes" ? "Stickies Board" : "Coding Log History"}
            </button>
          ))}
        </div>

        {/* Dynamic content windows */}
        <div className="p-6 min-h-[300px]">
          
          {/* TAB 1: CHECKLIST PORTAL */}
          {activeTab === "checklist" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Form column */}
              <div className="space-y-4">
                <h3 className="font-bold text-sm">Add New Task</h3>
                <form onSubmit={handleAddTodo} className="space-y-3 bg-secondary/15 border border-border/40 p-4 rounded-xl">
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Task description</label>
                    <input
                      type="text"
                      required
                      value={newTodoTitle}
                      onChange={(e) => setNewTodoTitle(e.target.value)}
                      placeholder="e.g. Implement rich stickies list"
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Priority</label>
                    <select
                      value={newTodoPriority}
                      onChange={(e) => setNewTodoPriority(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none text-xs font-medium"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/95 text-xs flex items-center justify-center gap-1 shadow"
                  >
                    <Plus size={14} /> Add Checklist Item
                  </button>
                </form>
              </div>

              {/* Right Checklist log column */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-sm">Task Records</h3>
                  <div className="flex bg-secondary p-0.5 rounded-lg text-[10px] font-semibold">
                    {["all", "active", "completed"].map((f) => (
                      <button
                        key={f}
                        onClick={() => setTodoFilter(f as any)}
                        className={`px-2 py-1 rounded capitalize transition-all
                          ${todoFilter === f ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {isTodosLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="animate-spin" size={20} />
                  </div>
                ) : !filteredTodos || filteredTodos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-xs">
                    <HelpCircle size={32} className="opacity-40 mb-2" />
                    No task records fit the current parameters.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredTodos.map((todo) => (
                      <div
                        key={todo.id}
                        className={`p-3 border border-border/40 rounded-xl flex items-center justify-between gap-4 transition-all
                          ${todo.completed ? "bg-secondary/15 opacity-60" : "bg-card"}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={todo.completed}
                            onChange={() => handleToggleTodo(todo.id, todo.completed)}
                            className="w-4 h-4 text-primary bg-secondary border-border rounded focus:ring-primary cursor-pointer shrink-0"
                          />
                          <span className={`text-xs font-semibold truncate max-w-[280px] text-foreground
                            ${todo.completed ? "line-through text-muted-foreground font-normal" : ""}`}>
                            {todo.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className={`px-1.5 py-0.5 rounded border text-[9px] font-extrabold uppercase tracking-wide shrink-0
                            ${getPriorityColor(todo.priority)}`}>
                            {todo.priority}
                          </span>
                          <button
                            onClick={() => handleDeleteTodo(todo.id)}
                            className="p-1 text-muted-foreground hover:text-destructive hover:bg-secondary/40 rounded transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: STICKIES & MARKDOWN NOTEPAD */}
          {activeTab === "stickynotes" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Board stickies selection */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-sm">Sticky Notes</h3>
                  <button
                    onClick={handleCreateNewNote}
                    className="p-1 bg-secondary hover:bg-secondary/80 border border-border text-foreground font-bold rounded-lg text-[10px] flex items-center gap-1 transition-colors"
                  >
                    <Plus size={11} /> New Note
                  </button>
                </div>

                {isNotesLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="animate-spin" size={20} />
                  </div>
                ) : !notes || notes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-xs">
                    <FileText size={32} className="opacity-40 mb-2" />
                    No sticky notes logged yet.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                    {notes.map((note) => (
                      <div
                        key={note.id}
                        onClick={() => handleSelectNote(note)}
                        className={`p-3.5 border rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-all hover:scale-98
                          ${getNoteCardStyle(note.color)}
                          ${selectedNote?.id === note.id ? "ring-2 ring-primary border-transparent" : ""}`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-bold text-xs truncate max-w-[130px]">{note.title}</h4>
                            {note.is_pinned && <Pin size={11} className="fill-foreground shrink-0" />}
                          </div>
                          <p className="text-[10px] opacity-75 truncate mt-0.5 max-w-[170px]">
                            {note.content || "Empty notepad..."}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNote(note.id);
                          }}
                          className="p-1 text-muted-foreground hover:text-destructive hover:bg-secondary/40 rounded transition-colors shrink-0"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right notepad editor column */}
              <div className="lg:col-span-2 space-y-4">
                {selectedNote ? (
                  <div className="space-y-4 bg-secondary/10 border border-border/40 p-5 rounded-2xl">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={noteTitle}
                          onChange={(e) => setNoteTitle(e.target.value)}
                          placeholder="Note Title"
                          className="w-full bg-transparent border-b border-transparent focus:border-border/60 outline-none font-bold text-sm py-0.5 text-foreground"
                        />
                      </div>
                      
                      <div className="flex items-center gap-2.5">
                        {/* Pin status toggle */}
                        <button
                          onClick={() => setIsPinNote(!isPinNote)}
                          className={`p-1.5 rounded-lg border transition-all
                            ${isPinNote ? "bg-primary/10 text-primary border-primary/20" : "border-border text-muted-foreground hover:text-foreground"}`}
                        >
                          <Pin size={12} className={isPinNote ? "fill-primary" : ""} />
                        </button>

                        <button
                          onClick={handleSaveNote}
                          disabled={isNoteSaving}
                          className="py-1 px-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/95 text-xs flex items-center gap-1.5 transition-colors shadow"
                        >
                          {isNoteSaving ? <Loader2 size={12} className="animate-spin" /> : <Edit3 size={12} />}
                          Save Note
                        </button>
                      </div>
                    </div>

                    {/* Color Palette selector */}
                    <div className="flex items-center gap-1.5 pt-1.5 border-t border-border/40">
                      <span className="text-[9px] uppercase font-bold text-muted-foreground mr-1">Card Theme:</span>
                      {COLOR_OPTIONS.map((opt) => (
                        <button
                          key={opt.name}
                          onClick={() => setNoteColor(opt.name)}
                          className={`w-4 h-4 rounded-full border border-border/40 transition-transform
                            ${opt.name === "slate" ? "bg-slate-400" : ""}
                            ${opt.name === "indigo" ? "bg-indigo-400" : ""}
                            ${opt.name === "amber" ? "bg-amber-400" : ""}
                            ${opt.name === "emerald" ? "bg-emerald-400" : ""}
                            ${opt.name === "rose" ? "bg-rose-400" : ""}
                            ${noteColor === opt.name ? "scale-125 ring-2 ring-primary/40 border-transparent" : "hover:scale-110"}`}
                        />
                      ))}
                    </div>

                    {/* Content editor text split layout */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-muted-foreground uppercase">Markdown Editor</label>
                        <textarea
                          rows={10}
                          value={noteContent}
                          onChange={(e) => setNoteContent(e.target.value)}
                          placeholder="Write using markdown triggers, e.g.
# Major Heading
- Bullet lists
**Bold text**
`code blocks`"
                          className="w-full p-3 bg-background border border-border rounded-xl outline-none focus:border-primary text-xs font-mono resize-none leading-relaxed"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-muted-foreground uppercase">Live Preview</label>
                        <div
                          className="w-full p-3 bg-secondary/20 border border-border/40 rounded-xl text-xs overflow-y-auto max-h-[220px] select-text prose prose-invert font-sans leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(noteContent) }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-xs bg-secondary/5 rounded-2xl border border-dashed border-border/60">
                    <Edit3 size={36} className="opacity-30 mb-2" />
                    Select a note from the stickies library or click New Note to edit.
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 3: CODING LOG HISTORY */}
          {activeTab === "streaklogs" && (
            <div className="space-y-4">
              {isStreaksLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="animate-spin" size={20} />
                </div>
              ) : !streaks || streaks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-xs">
                  <Laptop size={32} className="opacity-40 mb-2" />
                  No coding streaks records logged. Let's write some code today!
                </div>
              ) : (
                <div className="overflow-x-auto max-w-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border/80 text-muted-foreground font-semibold">
                        <th className="py-2.5">Date</th>
                        <th className="py-2.5">Minutes Coded</th>
                        <th className="py-2.5 text-right">Commits Logged</th>
                      </tr>
                    </thead>
                    <tbody>
                      {streaks.map((st: any) => (
                        <tr key={st.id} className="border-b border-border/40 hover:bg-secondary/15 transition-colors">
                          <td className="py-2.5 text-muted-foreground">
                            {new Date(st.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                          </td>
                          <td className="py-2.5 font-bold text-foreground">{st.minutes_coded} minutes</td>
                          <td className="py-2.5 text-right font-extrabold text-primary">{st.commits_count} commits</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
