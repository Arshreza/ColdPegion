"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Users, Upload, FolderPlus, X, Ban, CheckCircle2, Plug } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";

function findBestMatch(headers: string[], targetKey: string): string {
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const cleanTarget = clean(targetKey);

  // 1. Exact match (ignoring case/spaces/special chars)
  for (const h of headers) {
    if (clean(h) === cleanTarget) return h;
  }

  // 2. Fuzzy synonym lookup
  const synonyms: Record<string, string[]> = {
    email:       ["email", "mail", "email address", "emailaddress", "address", "to email", "toemail"],
    firstName:   ["first name", "firstname", "first", "given name", "givenname", "fname"],
    lastName:    ["last name", "lastname", "last", "surname", "lname"],
    companyName: ["company", "company name", "companyname", "organization", "org", "employer", "firm"],
    jobTitle:    ["job title", "jobtitle", "title", "role", "position", "designation"],
    linkedinUrl: ["linkedin", "linkedin url", "linkedinurl", "linkedin link", "profile", "social"],
    industry:    ["industry", "sector", "vertical", "company industry"],
    seniority:   ["seniority", "seniority level", "level", "seniority_level"],
    department:  ["department", "dept", "function", "team"],
    phone:       ["phone", "phone number", "mobile", "telephone", "cell", "contact number"],
    website:     ["website", "url", "company website", "web", "company url", "domain"],
    location:    ["location", "city", "region", "address", "country"],
    timezone:    ["timezone", "time zone", "tz"],
  };

  const list = synonyms[targetKey] || [];
  for (const item of list) {
    const cleanItem = clean(item);
    for (const h of headers) {
      if (clean(h) === cleanItem) return h;
    }
  }

  // 3. Substring match
  for (const item of list) {
    const cleanItem = clean(item);
    for (const h of headers) {
      const cleanH = clean(h);
      if (cleanH.includes(cleanItem) || cleanItem.includes(cleanH)) return h;
    }
  }

  return "";
}

function preprocessHeaders(rawHeaders: string[]): string[] {
  const seen: Record<string, number> = {};
  return rawHeaders.map((h, index) => {
    let name = (h || "").trim();
    if (!name) {
      name = `[Empty Col ${index + 1}]`;
    }
    if (seen[name] !== undefined) {
      seen[name] += 1;
      return `${name} (Col ${seen[name]})`;
    } else {
      seen[name] = 1;
      return name;
    }
  });
}

function SearchableSelect({
  id,
  options,
  value,
  onChange,
  placeholder = "Select a column..."
}: {
  id: string;
  options: string[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        id={id}
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch("");
        }}
        className="flex h-9 w-full items-center justify-between rounded-md border border-border bg-background px-3 text-sm ring-offset-background hover:border-border-hover transition-colors outline-none cursor-pointer text-left text-foreground select-none"
      >
        <span className="truncate">{value || placeholder}</span>
        <span className="ml-2 text-foreground-muted">▼</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 z-[10000] mt-1 rounded-md border border-border bg-background shadow-2xl p-2 animate-fade-in space-y-2 backdrop-blur-md">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search columns..."
              className="flex h-8 w-full rounded border border-border bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring outline-none"
              autoFocus
            />
          </div>

          <div className="max-h-48 overflow-y-auto space-y-0.5 text-sm">
            <div
              onClick={() => {
                onChange("");
                setIsOpen(false);
              }}
              className={`flex items-center px-2 py-1.5 rounded cursor-pointer transition-colors text-xs font-semibold text-foreground-muted hover:bg-foreground/5 hover:text-foreground ${
                value === "" ? "bg-brand-600/10 text-brand-600 font-semibold" : ""
              }`}
            >
              (Skip column)
            </div>

            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, idx) => (
                <div
                  key={`${option}-${idx}`}
                  onClick={() => {
                    onChange(option);
                    setIsOpen(false);
                  }}
                  className={`flex items-center px-2 py-1.5 rounded cursor-pointer transition-colors text-xs hover:bg-foreground/5 hover:text-foreground ${
                    value === option ? "bg-brand-600/10 text-brand-600 font-semibold" : "text-foreground"
                  }`}
                >
                  <span className="truncate">{option}</span>
                </div>
              ))
            ) : (
              <div className="px-2 py-3 text-center text-xs text-foreground-muted border border-dashed border-border rounded">
                No matching columns
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProspectsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hasIntegrations, setHasIntegrations] = useState<boolean | null>(null);
  const [addingList, setAddingList] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showAddLead, setShowAddLead] = useState(false);
  const [savingLead, setSavingLead] = useState(false);
  
  const [lists, setLists] = useState<any[]>([]);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [prospects, setProspects] = useState<any[]>([]);
  
  const [newListName, setNewListName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newLead, setNewLead] = useState({
    email: "", firstName: "", lastName: "", companyName: "",
    jobTitle: "", linkedinUrl: "", industry: "", location: "",
    phone: "", website: "", seniority: "", department: "",
  });

  const [headerMappings, setHeaderMappings] = useState({
    email: "email", firstName: "first name", lastName: "last name",
    companyName: "company", jobTitle: "title", linkedinUrl: "linkedin",
    industry: "", seniority: "", department: "",
    phone: "", website: "", location: "", timezone: "",
  });
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showMappingConfig, setShowMappingConfig] = useState(false);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<{
    show: boolean;
    success: boolean;
    imported: number;
    skipped: number;
    error?: string;
  } | null>(null);

  async function fetchLists() {
    try {
      const res = await fetch("/api/prospect-lists");
      if (res.ok) {
        const data = await res.json();
        setLists(data);
        if (data.length > 0 && !activeListId) {
          setActiveListId(data[0].id);
        }
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function fetchProspects(listId: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/prospects?listId=${listId}`);
      if (res.ok) {
        const data = await res.json();
        setProspects(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLists();
    fetch("/api/settings")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) setHasIntegrations(data.hasApolloKey || data.hasInstantlyKey);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (activeListId) {
      fetchProspects(activeListId);
    } else {
      setLoading(false);
    }
  }, [activeListId]);

  async function handleCreateList(e: React.FormEvent) {
    e.preventDefault();
    if (!newListName) return;
    setAddingList(true);
    try {
      const res = await fetch("/api/prospect-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newListName }),
      });
      if (res.ok) {
        const list = await res.json();
        setLists([list, ...lists]);
        setActiveListId(list.id);
        setNewListName("");
      }
    } finally {
      setAddingList(false);
    }
  }

  async function handleAddLead(e: React.FormEvent) {
    e.preventDefault();
    if (!newLead.email || !activeListId) return;
    setSavingLead(true);
    try {
      const res = await fetch("/api/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newLead, listId: activeListId }),
      });
      if (res.ok) {
        setShowAddLead(false);
        setNewLead({ email: "", firstName: "", lastName: "", companyName: "", jobTitle: "", linkedinUrl: "", industry: "", location: "", phone: "", website: "", seniority: "", department: "" });
        fetchProspects(activeListId);
        fetchLists();
      } else {
        const err = await res.json();
        alert(err.error?.[0]?.message || "Failed to add lead");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSavingLead(false);
    }
  }

  async function toggleDnc(prospect: any) {
    const next = !prospect.isDnc;
    setProspects((prev) => prev.map((p) => (p.id === prospect.id ? { ...p, isDnc: next } : p)));
    try {
      await fetch(`/api/prospects/${prospect.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDnc: next }),
      });
    } catch {
      setProspects((prev) => prev.map((p) => (p.id === prospect.id ? { ...p, isDnc: !next } : p)));
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !activeListId) return;
    setPendingFile(file);

    const fileExt = file.name.split(".").pop()?.toLowerCase();

    if (fileExt === "csv") {
      Papa.parse(file, {
        preview: 1,
        complete: (results) => {
          const rawHeaders = (results.data[0] as string[]) || [];
          const headers = preprocessHeaders(rawHeaders);
          setFileHeaders(headers);
          // Set mapping defaults
          setHeaderMappings({
            email:       findBestMatch(headers, "email"),
            firstName:   findBestMatch(headers, "firstName"),
            lastName:    findBestMatch(headers, "lastName"),
            companyName: findBestMatch(headers, "companyName"),
            jobTitle:    findBestMatch(headers, "jobTitle"),
            linkedinUrl: findBestMatch(headers, "linkedinUrl"),
            industry:    findBestMatch(headers, "industry"),
            seniority:   findBestMatch(headers, "seniority"),
            department:  findBestMatch(headers, "department"),
            phone:       findBestMatch(headers, "phone"),
            website:     findBestMatch(headers, "website"),
            location:    findBestMatch(headers, "location"),
            timezone:    findBestMatch(headers, "timezone"),
          });
          setShowMappingConfig(true);
        },
        error: (err) => {
          console.error("CSV header parsing failed:", err);
          alert("Could not parse CSV headers. Please verify the file.");
        }
      });
    } else if (fileExt === "xlsx" || fileExt === "xls") {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = evt.target?.result;
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
          const rawHeaders = json[0] || [];
          const headers = preprocessHeaders(rawHeaders);
          setFileHeaders(headers);
          // Set mapping defaults
          setHeaderMappings({
            email:       findBestMatch(headers, "email"),
            firstName:   findBestMatch(headers, "firstName"),
            lastName:    findBestMatch(headers, "lastName"),
            companyName: findBestMatch(headers, "companyName"),
            jobTitle:    findBestMatch(headers, "jobTitle"),
            linkedinUrl: findBestMatch(headers, "linkedinUrl"),
            industry:    findBestMatch(headers, "industry"),
            seniority:   findBestMatch(headers, "seniority"),
            department:  findBestMatch(headers, "department"),
            phone:       findBestMatch(headers, "phone"),
            website:     findBestMatch(headers, "website"),
            location:    findBestMatch(headers, "location"),
            timezone:    findBestMatch(headers, "timezone"),
          });
          setShowMappingConfig(true);
        } catch (err) {
          console.error("Excel header parsing failed:", err);
          alert("Could not parse Excel headers. Please verify the file.");
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert("Unsupported file format. Please upload CSV or Excel.");
    }
  }

  async function handleConfirmImport() {
    if (!pendingFile || !activeListId) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", pendingFile);
    formData.append("listId", activeListId);
    formData.append("mappings", JSON.stringify(headerMappings));

    try {
      const res = await fetch("/api/prospects/import", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const result = await res.json();
        setImportResult({
          show: true,
          success: true,
          imported: result.imported,
          skipped: result.skipped,
        });
        fetchProspects(activeListId);
        fetchLists();
        setShowMappingConfig(false);
        setPendingFile(null);
      } else {
        const err = await res.json().catch(() => ({}));
        setImportResult({
          show: true,
          success: false,
          imported: 0,
          skipped: 0,
          error: err.error || "Failed to upload CSV",
        });
      }
    } catch (error) {
      console.error(error);
      setImportResult({
        show: true,
        success: false,
        imported: 0,
        skipped: 0,
        error: "Failed to process import request due to a network or server issue.",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-6 max-w-7xl animate-fade-in flex flex-col lg:flex-row gap-6">
      
      {/* Left Sidebar - Lists */}
      <div className="w-full lg:w-64 flex-shrink-0 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Target Lists</h2>
        
        <form onSubmit={handleCreateList} className="flex items-center gap-2">
          <Input 
            placeholder="New list name..." 
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            className="h-9"
          />
          <Button type="submit" size="icon" className="h-9 w-9 shrink-0" disabled={addingList}>
            {addingList ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </form>

        <div className="space-y-1">
          {lists.map(list => (
            <button
              key={list.id}
              onClick={() => setActiveListId(list.id)}
              className={`w-full flex items-center justify-between text-left px-3 py-2 rounded-md text-sm transition-colors ${
                activeListId === list.id 
                  ? "bg-brand-50 text-brand-700 font-medium dark:bg-brand-500/10 dark:text-brand-400" 
                  : "text-foreground-muted hover:bg-background-tertiary hover:text-foreground"
              }`}
            >
              <div className="flex items-center truncate">
                <FolderPlus className="mr-2 h-4 w-4 shrink-0" />
                <span className="truncate">{list.name}</span>
              </div>
              <span className="ml-2 bg-background shrink-0 px-2 py-0.5 rounded-full text-xs border border-border">
                {list._count.prospects}
              </span>
            </button>
          ))}
          {lists.length === 0 && (
            <p className="text-sm text-foreground-muted text-center py-4 border border-dashed border-border rounded-md">
              Create a list to get started.
            </p>
          )}
        </div>
      </div>

      {/* Main Content - Prospects */}
      <div className="flex-1 space-y-4 min-w-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {lists.find(l => l.id === activeListId)?.name || "Prospects"}
            </h1>
            <p className="text-foreground-muted mt-1 text-sm">
              Manage your leads and synchronize them with AI agents.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <Input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileSelect}
            />
            {hasIntegrations === false && (
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard/settings#integrations")}
                className="w-full sm:w-auto border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-900/20 dark:text-purple-300 dark:hover:bg-purple-900/40"
              >
                <Plug className="mr-2 h-4 w-4" />
                Connect Apollo / Instantly
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={!activeListId || uploading}
              className="w-full sm:w-auto text-brand-600 bg-brand-50 border-brand-200 hover:bg-brand-100"
            >
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Import CSV
            </Button>
            <Button disabled={!activeListId} className="w-full sm:w-auto shrink-0" onClick={() => setShowAddLead(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Lead
            </Button>
          </div>
        </div>

        {/* Column Mapping Modal */}
        {showMappingConfig && pendingFile && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm animate-fade-in p-4">
            <div className="w-full max-w-2xl bg-background border border-border rounded-2xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto space-y-5 animate-slide-up">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="font-bold text-foreground text-lg flex items-center gap-2">
                    <Upload className="w-5 h-5 text-brand-500" />
                    Map Spreadsheet Columns
                  </h3>
                  <p className="text-xs text-foreground-muted mt-1">
                    Matching columns for <span className="font-semibold text-foreground">{pendingFile.name}</span>. Confirm or edit column header names.
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-foreground-muted hover:text-foreground" 
                  onClick={() => {
                    setShowMappingConfig(false);
                    setPendingFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="map-email" className="text-xs font-semibold text-foreground-secondary">Email Column *</Label>
                  <SearchableSelect
                    id="map-email"
                    options={fileHeaders}
                    value={headerMappings.email}
                    onChange={(val) => setHeaderMappings({ ...headerMappings, email: val })}
                    placeholder="(Skip / Select a column)"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="map-first" className="text-xs font-semibold text-foreground-secondary">First Name Column</Label>
                  <SearchableSelect
                    id="map-first"
                    options={fileHeaders}
                    value={headerMappings.firstName}
                    onChange={(val) => setHeaderMappings({ ...headerMappings, firstName: val })}
                    placeholder="(Skip column)"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="map-last" className="text-xs font-semibold text-foreground-secondary">Last Name Column</Label>
                  <SearchableSelect
                    id="map-last"
                    options={fileHeaders}
                    value={headerMappings.lastName}
                    onChange={(val) => setHeaderMappings({ ...headerMappings, lastName: val })}
                    placeholder="(Skip column)"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="map-company" className="text-xs font-semibold text-foreground-secondary">Company Column</Label>
                  <SearchableSelect
                    id="map-company"
                    options={fileHeaders}
                    value={headerMappings.companyName}
                    onChange={(val) => setHeaderMappings({ ...headerMappings, companyName: val })}
                    placeholder="(Skip column)"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="map-title" className="text-xs font-semibold text-foreground-secondary">Job Title Column</Label>
                  <SearchableSelect
                    id="map-title"
                    options={fileHeaders}
                    value={headerMappings.jobTitle}
                    onChange={(val) => setHeaderMappings({ ...headerMappings, jobTitle: val })}
                    placeholder="(Skip column)"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="map-linkedin" className="text-xs font-semibold text-foreground-secondary">LinkedIn Column</Label>
                  <SearchableSelect
                    id="map-linkedin"
                    options={fileHeaders}
                    value={headerMappings.linkedinUrl}
                    onChange={(val) => setHeaderMappings({ ...headerMappings, linkedinUrl: val })}
                    placeholder="(Skip column)"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="map-industry" className="text-xs font-semibold text-foreground-secondary">Industry Column</Label>
                  <SearchableSelect
                    id="map-industry"
                    options={fileHeaders}
                    value={headerMappings.industry}
                    onChange={(val) => setHeaderMappings({ ...headerMappings, industry: val })}
                    placeholder="(Skip column)"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="map-location" className="text-xs font-semibold text-foreground-secondary">Location Column</Label>
                  <SearchableSelect
                    id="map-location"
                    options={fileHeaders}
                    value={headerMappings.location}
                    onChange={(val) => setHeaderMappings({ ...headerMappings, location: val })}
                    placeholder="(Skip column)"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="map-seniority" className="text-xs font-semibold text-foreground-secondary">Seniority Column</Label>
                  <SearchableSelect
                    id="map-seniority"
                    options={fileHeaders}
                    value={headerMappings.seniority}
                    onChange={(val) => setHeaderMappings({ ...headerMappings, seniority: val })}
                    placeholder="(Skip column)"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="map-department" className="text-xs font-semibold text-foreground-secondary">Department Column</Label>
                  <SearchableSelect
                    id="map-department"
                    options={fileHeaders}
                    value={headerMappings.department}
                    onChange={(val) => setHeaderMappings({ ...headerMappings, department: val })}
                    placeholder="(Skip column)"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="map-phone" className="text-xs font-semibold text-foreground-secondary">Phone Column</Label>
                  <SearchableSelect
                    id="map-phone"
                    options={fileHeaders}
                    value={headerMappings.phone}
                    onChange={(val) => setHeaderMappings({ ...headerMappings, phone: val })}
                    placeholder="(Skip column)"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="map-website" className="text-xs font-semibold text-foreground-secondary">Website Column</Label>
                  <SearchableSelect
                    id="map-website"
                    options={fileHeaders}
                    value={headerMappings.website}
                    onChange={(val) => setHeaderMappings({ ...headerMappings, website: val })}
                    placeholder="(Skip column)"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="map-timezone" className="text-xs font-semibold text-foreground-secondary">Timezone Column</Label>
                  <SearchableSelect
                    id="map-timezone"
                    options={fileHeaders}
                    value={headerMappings.timezone}
                    onChange={(val) => setHeaderMappings({ ...headerMappings, timezone: val })}
                    placeholder="(Skip column)"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowMappingConfig(false);
                    setPendingFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleConfirmImport} disabled={uploading || !headerMappings.email.trim()}>
                  {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />}
                  Confirm and Import
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Import Results Modal */}
        {importResult && importResult.show && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm animate-fade-in p-4">
            <div className="w-full max-w-md bg-background border border-border rounded-2xl shadow-2xl p-6 relative overflow-hidden space-y-4 animate-slide-up text-center">
              <div className="flex justify-center">
                {importResult.success ? (
                  <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                ) : (
                  <div className="h-12 w-12 rounded-full bg-red-500/10 border border-red-500/25 flex items-center justify-center text-red-400">
                    <Ban className="h-6 w-6" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="font-bold text-foreground text-lg">
                  {importResult.success ? "Import Completed Successfully" : "Import Failed"}
                </h3>
                {importResult.success ? (
                  <div className="text-sm text-foreground-muted space-y-1">
                    <p>
                      We processed your spreadsheet file and updated your list.
                    </p>
                    <div className="mt-4 p-3 bg-background-tertiary rounded-lg border border-border text-left space-y-1.5 font-medium text-xs">
                      <div className="flex justify-between">
                        <span className="text-foreground-secondary">New Prospects Added:</span>
                        <span className="text-emerald-400 font-bold">{importResult.imported}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-foreground-secondary">Rows Skipped (Empty/Invalid):</span>
                        <span className="text-foreground-muted">{importResult.skipped}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-red-400">
                    {importResult.error || "An unexpected error occurred while processing the file."}
                  </p>
                )}
              </div>

              <div className="pt-2">
                <Button 
                  onClick={() => setImportResult(null)}
                  className="w-full"
                  variant={importResult.success ? "default" : "outline"}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Add Lead Modal */}
        {showAddLead && (
          <div className="rounded-xl border border-border bg-background shadow-sm animate-slide-up overflow-hidden">
            <div className="border-b border-border p-4 flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Add New Lead</h3>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowAddLead(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form onSubmit={handleAddLead} className="p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="lead-email">Email *</Label>
                  <Input id="lead-email" type="email" required value={newLead.email} onChange={(e) => setNewLead({ ...newLead, email: e.target.value })} placeholder="lead@company.com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lead-first">First Name</Label>
                  <Input id="lead-first" value={newLead.firstName} onChange={(e) => setNewLead({ ...newLead, firstName: e.target.value })} placeholder="John" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lead-last">Last Name</Label>
                  <Input id="lead-last" value={newLead.lastName} onChange={(e) => setNewLead({ ...newLead, lastName: e.target.value })} placeholder="Doe" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lead-company">Company</Label>
                  <Input id="lead-company" value={newLead.companyName} onChange={(e) => setNewLead({ ...newLead, companyName: e.target.value })} placeholder="Acme Inc." />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lead-title">Job Title</Label>
                  <Input id="lead-title" value={newLead.jobTitle} onChange={(e) => setNewLead({ ...newLead, jobTitle: e.target.value })} placeholder="VP of Sales" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lead-linkedin">LinkedIn URL</Label>
                  <Input id="lead-linkedin" type="url" value={newLead.linkedinUrl} onChange={(e) => setNewLead({ ...newLead, linkedinUrl: e.target.value })} placeholder="https://linkedin.com/in/..." />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lead-industry">Industry</Label>
                  <Input id="lead-industry" value={newLead.industry} onChange={(e) => setNewLead({ ...newLead, industry: e.target.value })} placeholder="Information Technology" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lead-location">Location</Label>
                  <Input id="lead-location" value={newLead.location} onChange={(e) => setNewLead({ ...newLead, location: e.target.value })} placeholder="Bangalore, India" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lead-seniority">Seniority</Label>
                  <Input id="lead-seniority" value={newLead.seniority} onChange={(e) => setNewLead({ ...newLead, seniority: e.target.value })} placeholder="Manager" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lead-department">Department</Label>
                  <Input id="lead-department" value={newLead.department} onChange={(e) => setNewLead({ ...newLead, department: e.target.value })} placeholder="HR" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lead-phone">Phone</Label>
                  <Input id="lead-phone" value={newLead.phone} onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })} placeholder="+91 98765 43210" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lead-website">Website</Label>
                  <Input id="lead-website" value={newLead.website} onChange={(e) => setNewLead({ ...newLead, website: e.target.value })} placeholder="https://company.com" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowAddLead(false)}>Cancel</Button>
                <Button type="submit" disabled={savingLead}>
                  {savingLead && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Lead
                </Button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="flex h-[300px] items-center justify-center border border-border rounded-xl">
            <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
          </div>
        ) : prospects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-background/50 p-6 sm:p-12 text-center mt-4">
            <Users className="mx-auto h-12 w-12 text-foreground-muted/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground">No prospects in this list</h3>
            <p className="mt-1 text-sm text-foreground-muted mb-6">
              Import a CSV file containing columns like "Email", "First Name", "Company".
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 w-full max-w-xs mx-auto sm:max-w-none">
              <Button onClick={() => fileInputRef.current?.click()} disabled={!activeListId || uploading} variant="outline" className="w-full sm:w-auto">
                <Upload className="mr-2 h-4 w-4" /> Upload CSV
              </Button>
              <Button onClick={() => setShowAddLead(true)} disabled={!activeListId} className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" /> Add Lead Manually
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-background shadow-sm overflow-hidden mt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-background-tertiary border-b border-border text-foreground-muted font-medium">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Company</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {prospects.map(prospect => (
                    <tr key={prospect.id} className="hover:bg-background-tertiary/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">
                        {prospect.firstName} {prospect.lastName}
                        <div className="text-xs font-normal text-foreground-muted lg:hidden">{prospect.email}</div>
                      </td>
                      <td className="px-4 py-3 text-foreground-muted hidden lg:table-cell">{prospect.email}</td>
                      <td className="px-4 py-3 text-foreground-muted">
                        <div>{prospect.companyName || "-"}</div>
                        {prospect.jobTitle && <div className="text-xs truncate max-w-[150px]">{prospect.jobTitle}</div>}
                      </td>
                      <td className="px-4 py-3">
                         {prospect.isDnc ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-error-500/10 px-2 py-1 text-xs text-error-600">
                               <Ban className="h-3 w-3" /> Do-not-contact
                            </span>
                         ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-border px-2 py-1 text-xs text-foreground-secondary">
                               Active
                            </span>
                         )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => toggleDnc(prospect)}>
                          {prospect.isDnc ? <><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Unblock</> : <><Ban className="h-3.5 w-3.5 mr-1" /> Block</>}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
