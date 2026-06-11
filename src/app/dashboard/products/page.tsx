"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Box, ExternalLink, RefreshCw, Target, Sparkles, Trash2, Paperclip, FileText, X } from "lucide-react";
import { IcpFilterBuilder, emptyIcpFilters, type IcpFilters } from "@/components/shared/icp-filter";

type ProductFile = { url: string; filename: string; description: string };

interface Product {
  id: string;
  name: string;
  description: string;
  usps: string;
  targetAudience: string;
  sourceUrl: string;
  productFiles?: string;
  icpMode?: "PROMPT" | "FILTER";
  icpPrompt?: string;
  icpFilters?: string;
}

const blankForm = {
  name: "",
  description: "",
  usps: "",
  targetAudience: "",
  sourceUrl: "",
  icpMode: "PROMPT" as "PROMPT" | "FILTER",
  icpPrompt: "",
};

function getFileIcon(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return <FileText className="h-4 w-4 text-red-500 shrink-0" />;
  if (["xlsx", "xls", "csv"].includes(ext || "")) return <FileText className="h-4 w-4 text-green-500 shrink-0" />;
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext || "")) return <FileText className="h-4 w-4 text-blue-500 shrink-0" />;
  return <FileText className="h-4 w-4 text-foreground-muted shrink-0" />;
}

function summariseIcp(p: Product): string {
  if (p.icpMode === "FILTER" && p.icpFilters) {
    try {
      const f = JSON.parse(p.icpFilters) as IcpFilters;
      const bits = [
        ...(f.jobTitles || []),
        ...(f.seniorities || []),
        ...(f.industries || []),
        ...(f.headcount || []).map((h) => `${h} emp`),
      ];
      return bits.slice(0, 4).join(", ") + (bits.length > 4 ? "…" : "") || "Filter defined";
    } catch {
      return "Filter defined";
    }
  }
  return p.icpPrompt || "Not specified";
}

export default function ProductsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [form, setForm] = useState({ ...blankForm });
  const [filters, setFilters] = useState<IcpFilters>({ ...emptyIcpFilters });
  const [docFiles, setDocFiles] = useState<ProductFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setForm({ ...blankForm });
    setFilters({ ...emptyIcpFilters });
    setDocFiles([]);
    setEditingId(null);
  }

  function startEdit(p: Product) {
    setEditingId(p.id);
    setIsAdding(true);
    setForm({
      name: p.name || "",
      description: p.description || "",
      usps: p.usps || "",
      targetAudience: p.targetAudience || "",
      sourceUrl: p.sourceUrl || "",
      icpMode: p.icpMode || "PROMPT",
      icpPrompt: p.icpPrompt || "",
    });
    try {
      setDocFiles(p.productFiles ? JSON.parse(p.productFiles) : []);
    } catch {
      setDocFiles([]);
    }
    try {
      setFilters(p.icpFilters ? { ...emptyIcpFilters, ...JSON.parse(p.icpFilters) } : { ...emptyIcpFilters });
    } catch {
      setFilters({ ...emptyIcpFilters });
    }
  }

  async function handleExtract() {
    if (!form.sourceUrl) {
      setMessage({ text: "Enter a URL first", type: "error" });
      return;
    }
    setExtracting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/products/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: form.sourceUrl }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Extraction failed");
      const data = await res.json();
      setForm((prev) => ({
        ...prev,
        name: data.name || prev.name,
        description: data.description || prev.description,
        usps: data.usps || prev.usps,
        targetAudience: data.targetAudience || prev.targetAudience,
      }));
      setMessage({ text: "Extracted product info from URL!", type: "success" });
    } catch (error: any) {
      setMessage({ text: error.message || "Failed to extract from URL", type: "error" });
    } finally {
      setExtracting(false);
    }
  }

  async function handleAddDocument(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/products/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.json()).error || "Upload failed");
      const { url, filename } = await res.json();
      setDocFiles((prev) => [...prev, { url, filename, description: "" }]);
    } catch (err: any) {
      setMessage({ text: err.message || "Upload failed", type: "error" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function fetchProducts() {
    setLoading(true);
    try {
      const res = await fetch("/api/products");
      if (res.ok) setProducts(await res.json());
    } catch (error) {
      console.error("Failed to load products", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProducts();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const payload = {
      ...form,
      productFiles: JSON.stringify(docFiles),
      icpFilters: form.icpMode === "FILTER" ? JSON.stringify(filters) : undefined,
      icpPrompt: form.icpMode === "PROMPT" ? form.icpPrompt : undefined,
    };

    try {
      const res = await fetch(editingId ? `/api/products/${editingId}` : "/api/products", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save product");
      setMessage({ text: editingId ? "Product updated" : "Product added successfully", type: "success" });
      setIsAdding(false);
      resetForm();
      fetchProducts();
    } catch (error) {
      setMessage({ text: "Failed to save product", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this product?")) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
        setMessage({ text: "Product deleted", type: "success" });
      }
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className="space-y-6 max-w-6xl animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Products & Offerings</h1>
          <p className="text-foreground-muted mt-1 text-sm">
            Manage products your AI agents market, and define each product&apos;s ideal customer profile.
          </p>
        </div>
        <Button
          id="onboarding-add-product"
          onClick={() => {
            if (isAdding) resetForm();
            setIsAdding(!isAdding);
          }}
        >
          {isAdding ? "Cancel" : <><Plus className="mr-2 h-4 w-4" /> Add Product</>}
        </Button>
      </div>

      {message && (
        <div className={`p-4 rounded-md ${message.type === "success" ? "bg-success-500/10 text-success-600" : "bg-error-500/10 text-error-600"}`}>
          {message.text}
        </div>
      )}

      {isAdding && (
        <div className="rounded-xl border border-border bg-background shadow-sm animate-slide-up">
          <div className="border-b border-border p-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">{editingId ? "Edit Product" : "Add New Product"}</h2>
            <Button variant="outline" size="sm" type="button" className="text-brand-600 border-brand-200 bg-brand-50 hover:bg-brand-100" onClick={handleExtract} disabled={extracting || !form.sourceUrl}>
              {extracting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              {extracting ? "Extracting..." : "Auto-Extract from URL"}
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. ColdPigeon Pro" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sourceUrl">Landing Page URL</Label>
                <Input id="sourceUrl" type="url" value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} placeholder="https://acme.com/coldpigeon-pro" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea id="description" className="flex min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Briefly describe what this product does..." />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="usps">Unique Selling Points</Label>
                <textarea id="usps" className="flex min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={form.usps} onChange={(e) => setForm({ ...form, usps: e.target.value })} placeholder="Fast, secure, AI-powered..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetAudience">Target Audience (short)</Label>
                <textarea id="targetAudience" className="flex min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={form.targetAudience} onChange={(e) => setForm({ ...form, targetAudience: e.target.value })} placeholder="SaaS Founders, Sales Reps..." />
              </div>
            </div>

            {/* Product Documents */}
            <div className="border-t border-border pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Paperclip className="h-5 w-5 text-brand-500" />
                  <h3 className="font-semibold text-foreground">Product Documents</h3>
                  <span className="text-xs text-foreground-muted">— Documents &amp; images are attached to every campaign email</span>
                </div>
                <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                  {uploading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-2 h-3.5 w-3.5" />}
                  {uploading ? "Uploading..." : "Add Document"}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.xlsx,.xls,.csv,.jpg,.jpeg,.png,.webp,.gif,.ppt,.pptx,.doc,.docx"
                  onChange={handleAddDocument}
                />
              </div>

              {docFiles.length === 0 ? (
                <p className="text-sm text-foreground-muted py-2">
                  No documents yet. Upload a PDF catalog, pricing sheet, or any file — then describe it so the AI can reference it in campaign emails.
                </p>
              ) : (
                <div className="space-y-3">
                  {docFiles.map((file, idx) => (
                    <div key={idx} className="flex gap-3 items-start rounded-lg border border-border bg-background-tertiary/40 p-3">
                      <div className="flex items-center gap-2 min-w-0 w-48 shrink-0">
                        {getFileIcon(file.filename)}
                        <span className="text-xs font-medium text-foreground truncate">{file.filename}</span>
                        <button
                          type="button"
                          onClick={() => setDocFiles((prev) => prev.filter((_, i) => i !== idx))}
                          className="ml-auto shrink-0 text-foreground-muted hover:text-error-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <textarea
                        className="flex-1 min-h-[60px] rounded-md border border-border bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder="Describe what this document covers — the AI uses this context when writing campaign emails..."
                        value={file.description}
                        onChange={(e) =>
                          setDocFiles((prev) =>
                            prev.map((f, i) => (i === idx ? { ...f, description: e.target.value } : f))
                          )
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ICP Section */}
            <div className="border-t border-border pt-6 space-y-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-brand-500" />
                <h3 className="font-semibold text-foreground">Ideal Customer Profile (ICP)</h3>
              </div>
              <div className="inline-flex rounded-lg border border-border p-1 bg-background-tertiary">
                <button type="button" onClick={() => setForm({ ...form, icpMode: "PROMPT" })} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${form.icpMode === "PROMPT" ? "bg-background shadow-sm text-foreground" : "text-foreground-muted"}`}>
                  <Sparkles className="h-3.5 w-3.5" /> Prompt
                </button>
                <button type="button" onClick={() => setForm({ ...form, icpMode: "FILTER" })} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${form.icpMode === "FILTER" ? "bg-background shadow-sm text-foreground" : "text-foreground-muted"}`}>
                  <Target className="h-3.5 w-3.5" /> Filter
                </button>
              </div>

              {form.icpMode === "PROMPT" ? (
                <div className="space-y-2">
                  <Label htmlFor="icpPrompt">Describe your ideal customer in plain language</Label>
                  <textarea id="icpPrompt" className="flex min-h-[100px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={form.icpPrompt} onChange={(e) => setForm({ ...form, icpPrompt: e.target.value })} placeholder="e.g. Heads of Sales at B2B SaaS companies with 50-500 employees in North America who are scaling their outbound team." />
                  <p className="text-xs text-foreground-muted">The AI uses this to tailor messaging and to score prospect fit.</p>
                </div>
              ) : (
                <div className="rounded-lg border border-border p-4 bg-background-tertiary/40">
                  <IcpFilterBuilder value={filters} onChange={setFilters} />
                  <p className="text-xs text-foreground-muted mt-4">
                    These structured filters mirror Instantly Super Search / Apollo people search and power the Find Leads tool.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? "Save Changes" : "Add Product"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex h-[200px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-background/50 p-12 text-center">
          <Box className="mx-auto h-12 w-12 text-foreground-muted/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground">No products added</h3>
          <p className="mt-1 text-sm text-foreground-muted mb-6">Add at least one product before creating an AI agent.</p>
          <Button onClick={() => setIsAdding(true)}><Plus className="mr-2 h-4 w-4" /> Add your first product</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => {
            let files: ProductFile[] = [];
            try { files = product.productFiles ? JSON.parse(product.productFiles) : []; } catch { }
            const pdfCount = files.filter(f => f.filename.toLowerCase().endsWith(".pdf")).length;
            return (
              <div key={product.id} className="rounded-xl border border-border bg-background shadow-sm overflow-hidden hover:border-brand-300 transition-colors group">
                <div className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-foreground text-lg truncate pr-2">{product.name}</h3>
                    {product.sourceUrl && (
                      <a href={product.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-foreground-muted hover:text-brand-500">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                  <p className="text-sm text-foreground-muted line-clamp-2 mb-4">{product.description || "No description provided."}</p>
                  <div className="space-y-2">
                    <div className="text-xs flex items-start gap-1.5">
                      <Target className="h-3.5 w-3.5 text-brand-500 mt-0.5 shrink-0" />
                      <span className="text-foreground-muted">
                        <span className="font-semibold text-foreground-secondary">ICP ({product.icpMode === "FILTER" ? "Filter" : "Prompt"}): </span>
                        {summariseIcp(product)}
                      </span>
                    </div>
                    <div className="text-xs">
                      <span className="font-semibold text-foreground-secondary">USPs: </span>
                      <span className="text-foreground-muted truncate">{product.usps || "Not specified"}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-background-tertiary px-5 py-3 border-t border-border flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => startEdit(product)}>Edit</Button>
                    {pdfCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 dark:bg-brand-500/10 px-2 py-0.5 text-xs font-medium text-brand-600 dark:text-brand-400">
                        <Paperclip className="h-3 w-3" /> {pdfCount} PDF
                      </span>
                    )}
                    {files.length > 0 && (
                      <span className="text-xs text-foreground-muted">{files.length} doc{files.length > 1 ? "s" : ""}</span>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 text-xs text-error-600 hover:text-error-700 hover:bg-error-50 dark:hover:bg-error-500/10" onClick={() => handleDelete(product.id)}>
                    <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
