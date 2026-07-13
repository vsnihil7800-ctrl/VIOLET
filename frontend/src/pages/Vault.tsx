import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../services/api";
import {
  FileText,
  UploadCloud,
  Search,
  Trash2,
  Download,
  Loader2,
  FileCheck,
  FolderOpen,
  X
} from "lucide-react";

interface VaultDocument {
  id: string;
  user_id: string;
  name: string;
  file_path: string;
  category: string;
  file_size: number;
  created_at: string;
}

const VAULT_CATEGORIES = ["all", "personal", "financial", "health", "work", "others"];

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";
const FILE_SERVER_BASE = API_BASE.replace("/api/v1", ""); // Host base to download files

export const Vault: React.FC = () => {
  const queryClient = useQueryClient();

  // Search & Category Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // File Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState("personal");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // ----------------- API QUERIES -----------------

  // Fetch documents list with query parameters
  const { data: documents, isLoading: isDocsLoading } = useQuery<VaultDocument[]>({
    queryKey: ["vaultDocuments", searchQuery, selectedCategory],
    queryFn: async () => {
      const res = await api.get("/schedule/documents", {
        params: {
          q: searchQuery.trim() || undefined,
          category: selectedCategory !== "all" ? selectedCategory : undefined
        }
      });
      return res.data;
    },
  });

  // ----------------- MUTATIONS -----------------

  // Delete Document
  const deleteDocMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/schedule/documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vaultDocuments"] });
    },
  });

  // ----------------- ACTION HANDLERS -----------------

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      setUploadError(null);
    }
  };

  const handleFileUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("category", uploadCategory);

    try {
      await api.post("/schedule/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      queryClient.invalidateQueries({ queryKey: ["vaultDocuments"] });
      setUploadFile(null);
    } catch (err: any) {
      console.error(err);
      setUploadError(err.response?.data?.detail || "Failed to upload document.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = (id: string) => {
    if (confirm("Permanently delete this document from secure vault storage?")) {
      deleteDocMutation.mutate(id);
    }
  };

  // Format file bytes to human readable string (KB, MB)
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getCategoryColor = (cat: string) => {
    if (cat === "personal") return "bg-indigo-500/10 text-indigo-500 border-indigo-500/25";
    if (cat === "financial") return "bg-emerald-500/10 text-emerald-500 border-emerald-500/25";
    if (cat === "health") return "bg-rose-500/10 text-rose-500 border-rose-500/25";
    if (cat === "work") return "bg-amber-500/10 text-amber-500 border-amber-500/25";
    return "bg-slate-500/10 text-slate-500 border-slate-500/25";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Secure Document Vault</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Upload essential files, organize personal/financial records, and search items securely
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: File Upload Locker */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <h3 className="font-bold text-sm flex items-center gap-1.5">
              <UploadCloud size={18} className="text-primary animate-bounce" />
              Locker Upload
            </h3>

            {uploadError && (
              <div className="px-4 py-2.5 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-xs font-semibold">
                {uploadError}
              </div>
            )}

            <form onSubmit={handleFileUploadSubmit} className="space-y-4 bg-secondary/15 border border-border/40 p-4 rounded-xl">
              
              {/* Image Drag area */}
              {!uploadFile ? (
                <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border/80 hover:border-primary/50 rounded-xl cursor-pointer bg-background hover:bg-secondary/35 transition-all p-4">
                  <FolderOpen size={24} className="text-muted-foreground mb-1.5 opacity-60" />
                  <span className="text-[10px] font-bold text-foreground">Click to select files</span>
                  <span className="text-[9px] text-muted-foreground mt-0.5">Supports PDF, PNG, TXT, DOCX</span>
                  <input type="file" className="hidden" onChange={handleFileSelect} />
                </label>
              ) : (
                <div className="p-3 bg-background border border-border rounded-xl flex items-center justify-between gap-3">
                  <div className="min-w-0 flex items-center gap-2">
                    <FileCheck size={18} className="text-primary shrink-0" />
                    <div className="truncate">
                      <p className="text-[11px] font-bold text-foreground truncate max-w-[150px]">{uploadFile.name}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">{formatBytes(uploadFile.size)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadFile(null)}
                    className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Index Category</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg outline-none text-xs font-medium capitalize"
                >
                  {VAULT_CATEGORIES.filter(c => c !== "all").map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={isUploading || !uploadFile}
                className="w-full py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/95 text-xs flex items-center justify-center gap-1.5 shadow"
              >
                {isUploading ? <Loader2 size={12} className="animate-spin" /> : null}
                Secure File Upload
              </button>

            </form>
          </div>
        </div>

        {/* Right Column: Searchable list vault */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          
          {/* Operations Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/60 pb-3">
            <h3 className="font-bold text-sm">Indexed Storage</h3>
            
            <div className="flex gap-2 w-full sm:w-auto">
              {/* Search */}
              <div className="relative flex-1 sm:flex-none">
                <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search file name..."
                  className="w-full sm:w-44 pl-8 pr-2 py-1.5 bg-secondary/50 border border-border rounded-xl outline-none text-xs"
                />
              </div>

              {/* Category tabs */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-secondary/50 border border-border rounded-xl px-2 py-1.5 text-xs font-medium capitalize outline-none"
              >
                {VAULT_CATEGORIES.map(c => (
                  <option key={c} value={c}>
                    {c === "all" ? "All Categories" : c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Files grid list */}
          {isDocsLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-muted-foreground" size={24} />
            </div>
          ) : !documents || documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-xs">
              <FileText size={32} className="opacity-40 mb-2" />
              No documents matched the current search filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/80 text-muted-foreground font-semibold">
                    <th className="py-2.5">File Name</th>
                    <th className="py-2.5">Category</th>
                    <th className="py-2.5">Size</th>
                    <th className="py-2.5 hidden sm:table-cell">Uploaded Date</th>
                    <th className="py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map(doc => (
                    <tr key={doc.id} className="border-b border-border/40 hover:bg-secondary/15 transition-colors">
                      <td className="py-2.5 font-bold text-foreground truncate max-w-[180px]">{doc.name}</td>
                      <td className="py-2.5">
                        <span className={`px-1.5 py-0.5 rounded border text-[9px] font-extrabold uppercase tracking-wide
                          ${getCategoryColor(doc.category)}`}>
                          {doc.category}
                        </span>
                      </td>
                      <td className="py-2.5 text-muted-foreground">{formatBytes(doc.file_size)}</td>
                      <td className="py-2.5 text-muted-foreground hidden sm:table-cell">
                        {new Date(doc.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="py-2.5 text-right flex justify-end gap-1.5">
                        {/* Download link trigger */}
                        <a
                          href={`${FILE_SERVER_BASE}${doc.file_path}`}
                          download={doc.name}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 text-muted-foreground hover:text-primary hover:bg-secondary/40 rounded transition-colors"
                        >
                          <Download size={13} />
                        </a>
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="p-1 text-muted-foreground hover:text-destructive hover:bg-secondary/40 rounded transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
