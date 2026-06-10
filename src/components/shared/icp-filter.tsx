"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";

export interface IcpFilters {
  jobTitles: string[];
  seniorities: string[];
  departments: string[];
  industries: string[];
  locations: string[];
  headcount: string[];
  keywords: string[];
  technologies: string[];
  employeeMin?: number;
  employeeMax?: number;
}

export const emptyIcpFilters: IcpFilters = {
  jobTitles: [],
  seniorities: [],
  departments: [],
  industries: [],
  locations: [],
  headcount: [],
  keywords: [],
  technologies: [],
};

// Instantly / Apollo style preset buckets.
const SENIORITIES = ["C-Level", "VP", "Director", "Manager", "Senior", "Entry", "Owner", "Partner", "Founder"];
const DEPARTMENTS = ["Engineering", "Sales", "Marketing", "Finance", "Operations", "HR", "Product", "IT", "Legal", "Executive"];
const HEADCOUNT = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5001-10000", "10000+"];

function ChipMultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  function toggle(opt: string) {
    onChange(selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt]);
  }
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground-secondary">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                active
                  ? "bg-brand-500 text-white border-brand-500"
                  : "bg-background border-border text-foreground-muted hover:border-brand-300"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TagInput({
  label,
  placeholder,
  tags,
  onChange,
}: {
  label: string;
  placeholder: string;
  tags: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  function add() {
    const v = draft.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setDraft("");
  }
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground-secondary">{label}</p>
      <div className="flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="button"
          onClick={add}
          className="h-10 w-10 shrink-0 flex items-center justify-center rounded-md border border-border hover:bg-background-tertiary"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
              {t}
              <button type="button" onClick={() => onChange(tags.filter((x) => x !== t))}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function IcpFilterBuilder({ value, onChange }: { value: IcpFilters; onChange: (next: IcpFilters) => void }) {
  const v = { ...emptyIcpFilters, ...value };
  const set = (patch: Partial<IcpFilters>) => onChange({ ...v, ...patch });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <TagInput label="Job Titles" placeholder="e.g. VP of Sales — press Enter" tags={v.jobTitles} onChange={(jobTitles) => set({ jobTitles })} />
        <TagInput label="Industries" placeholder="e.g. SaaS, Healthcare" tags={v.industries} onChange={(industries) => set({ industries })} />
        <TagInput label="Locations" placeholder="e.g. United States, London" tags={v.locations} onChange={(locations) => set({ locations })} />
        <TagInput label="Keywords" placeholder="e.g. fintech, B2B" tags={v.keywords} onChange={(keywords) => set({ keywords })} />
        <TagInput label="Technologies" placeholder="e.g. Salesforce, AWS" tags={v.technologies} onChange={(technologies) => set({ technologies })} />
      </div>

      <ChipMultiSelect label="Seniority" options={SENIORITIES} selected={v.seniorities} onChange={(seniorities) => set({ seniorities })} />
      <ChipMultiSelect label="Department" options={DEPARTMENTS} selected={v.departments} onChange={(departments) => set({ departments })} />
      <ChipMultiSelect label="Company Headcount" options={HEADCOUNT} selected={v.headcount} onChange={(headcount) => set({ headcount })} />
    </div>
  );
}
