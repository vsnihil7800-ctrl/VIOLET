import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import {
  NotebookText,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Loader2,
} from "lucide-react";

interface NoteEntry {
  id: string;
  column_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface NoteColumn {
  id: string;
  user_id: string;
  title: string;
  position: number;
  created_at: string;
  entries: NoteEntry[];
}

export const Notes: React.FC = () => {
  const queryClient = useQueryClient();

  // New column form
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");

  // New entry drafts, keyed by column id
  const [entryDrafts, setEntryDrafts] = useState<Record<string, string>>({});

  // Editing an existing entry
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingEntryContent, setEditingEntryContent] = useState("");

  // ----------------- QUERIES -----------------

  const { data: columns, isLoading } = useQuery<NoteColumn[]>({
    queryKey: ["noteColumns"],
    queryFn: async () => {
      const res = await api.get("/notes/columns");
      return res.data;
    },
  });

  // ----------------- MUTATIONS -----------------

  const createColumnMutation = useMutation({
    mutationFn: (title: string) => api.post("/notes/columns", { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["noteColumns"] });
      setNewColumnTitle("");
      setIsAddingColumn(false);
    },
  });

  const deleteColumnMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/notes/columns/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["noteColumns"] });
    },
  });

  const createEntryMutation = useMutation({
    mutationFn: ({ columnId, content }: { columnId: string; content: string }) =>
      api.post(`/notes/columns/${columnId}/entries`, { content }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["noteColumns"] });
      setEntryDrafts((prev) => ({ ...prev, [variables.columnId]: "" }));
    },
  });

  const updateEntryMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      api.put(`/notes/entries/${id}`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["noteColumns"] });
      setEditingEntryId(null);
      setEditingEntryContent("");
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/notes/entries/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["noteColumns"] });
    },
  });

  // ----------------- HANDLERS -----------------

  const handleCreateColumn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumnTitle.trim()) return;
    createColumnMutation.mutate(newColumnTitle.trim());
  };

  const handleDeleteColumn = (id: string, title: string) => {
    if (confirm(`Delete the "${title}" column and everything inside it?`)) {
      deleteColumnMutation.mutate(id);
    }
  };

  const handleAddEntry = (columnId: string) => {
    const content = (entryDrafts[columnId] || "").trim();
    if (!content) return;
    createEntryMutation.mutate({ columnId, content });
  };

  const handleStartEditEntry = (entry: NoteEntry) => {
    setEditingEntryId(entry.id);
    setEditingEntryContent(entry.content);
  };

  const handleSaveEditEntry = () => {
    if (!editingEntryId || !editingEntryContent.trim()) return;
    updateEntryMutation.mutate({ id: editingEntryId, content: editingEntryContent.trim() });
  };

  const handleCancelEditEntry = () => {
    setEditingEntryId(null);
    setEditingEntryContent("");
  };

  const handleDeleteEntry = (id: string) => {
    deleteEntryMutation.mutate(id);
  };

  // ----------------- RENDER -----------------

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            <NotebookText className="text-primary" size={24} />
            Notes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create your own named lists - Watchlist, Ideas, Recipes, anything - and store entries inside each.
          </p>
        </div>
        {!isAddingColumn && (
          <button
            onClick={() => setIsAddingColumn(true)}
            className="py-2 px-4 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/95 text-sm flex items-center gap-1.5 shadow"
          >
            <Plus size={16} />
            New Column
          </button>
        )}
      </div>

      {isAddingColumn && (
        <form
          onSubmit={handleCreateColumn}
          className="flex items-center gap-2 bg-card border border-border rounded-xl p-3"
        >
          <input
            type="text"
            autoFocus
            value={newColumnTitle}
            onChange={(e) => setNewColumnTitle(e.target.value)}
            placeholder="Column name, e.g. Watchlist"
            className="flex-1 px-3 py-2 bg-secondary/50 border border-border rounded-lg outline-none focus:border-primary text-sm"
          />
          <button
            type="submit"
            disabled={createColumnMutation.isPending}
            className="py-2 px-4 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/95 text-sm flex items-center gap-1.5"
          >
            {createColumnMutation.isPending ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
            Create
          </button>
          <button
            type="button"
            onClick={() => {
              setIsAddingColumn(false);
              setNewColumnTitle("");
            }}
            className="p-2 border border-border hover:bg-secondary rounded-lg"
          >
            <X size={16} />
          </button>
        </form>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin" size={24} />
        </div>
      ) : !columns || columns.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-20 bg-card border border-dashed border-border rounded-2xl">
          <NotebookText size={32} className="text-muted-foreground mb-3" />
          <p className="text-sm font-semibold text-foreground">No columns yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Click "New Column" above to create your first list, like "Watchlist" or "Book Ideas".
          </p>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((col) => (
            <div
              key={col.id}
              className="bg-card border border-border rounded-2xl shadow-sm flex-shrink-0 w-72 flex flex-col max-h-[70vh]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="font-bold text-sm truncate">{col.title}</h3>
                <button
                  onClick={() => handleDeleteColumn(col.id, col.title)}
                  className="p-1 text-muted-foreground hover:text-destructive hover:bg-secondary/40 rounded transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Entries list */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {col.entries.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No entries yet.</p>
                ) : (
                  col.entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="group bg-secondary/30 border border-border/50 rounded-lg p-2.5 text-sm"
                    >
                      {editingEntryId === entry.id ? (
                        <div className="space-y-2">
                          <textarea
                            autoFocus
                            rows={3}
                            value={editingEntryContent}
                            onChange={(e) => setEditingEntryContent(e.target.value)}
                            className="w-full px-2 py-1.5 bg-background border border-border rounded-md outline-none focus:border-primary text-xs resize-none"
                          />
                          <div className="flex gap-1.5 justify-end">
                            <button
                              onClick={handleCancelEditEntry}
                              className="p-1 border border-border hover:bg-secondary rounded"
                            >
                              <X size={12} />
                            </button>
                            <button
                              onClick={handleSaveEditEntry}
                              disabled={updateEntryMutation.isPending}
                              className="p-1 bg-primary text-primary-foreground rounded"
                            >
                              {updateEntryMutation.isPending ? (
                                <Loader2 className="animate-spin" size={12} />
                              ) : (
                                <Check size={12} />
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <p className="whitespace-pre-wrap break-words text-foreground flex-1">{entry.content}</p>
                          <div className="flex-shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleStartEditEntry(entry)}
                              className="p-1 text-muted-foreground hover:text-primary hover:bg-secondary/60 rounded"
                            >
                              <Pencil size={11} />
                            </button>
                            <button
                              onClick={() => handleDeleteEntry(entry.id)}
                              className="p-1 text-muted-foreground hover:text-destructive hover:bg-secondary/60 rounded"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Add entry input */}
              <div className="p-3 border-t border-border">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={entryDrafts[col.id] || ""}
                    onChange={(e) =>
                      setEntryDrafts((prev) => ({ ...prev, [col.id]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddEntry(col.id);
                      }
                    }}
                    placeholder="Add an entry..."
                    className="flex-1 px-3 py-2 bg-secondary/50 border border-border rounded-lg outline-none focus:border-primary text-xs"
                  />
                  <button
                    onClick={() => handleAddEntry(col.id)}
                    disabled={createEntryMutation.isPending}
                    className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/95"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
