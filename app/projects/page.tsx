"use client";

import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  CirclePlus,
  ClipboardList,
  LoaderCircle,
  Search,
  TriangleAlert,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

type Project = {
  id: string;
  clinic_name: string;
  clinic_number: string | null;
  city: string | null;
  state: string | null;
  status: string;
  walkthrough_date: string | null;
  created_at: string;
};

type ChecklistItem = {
  project_id: string;
  status: string;
};

type Deficiency = {
  project_id: string;
  status: string;
};

type CloseoutItem = {
  project_id: string;
  status: string;
};

const statusOptions = [
  "All",
  "Active",
  "Setup",
  "Ready for Walk",
  "Punch in Progress",
  "Corrections in Progress",
  "Verification",
  "Completed",
  "Archived",
];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [checklistItems, setChecklistItems] = useState<
    ChecklistItem[]
  >([]);
  const [deficiencies, setDeficiencies] = useState<Deficiency[]>([]);
  const [closeoutItems, setCloseoutItems] = useState<
    CloseoutItem[]
  >([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Active");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    const [
      { data: projectData, error: projectError },
      { data: checklistData, error: checklistError },
      { data: deficiencyData, error: deficiencyError },
      { data: closeoutData, error: closeoutError },
    ] = await Promise.all([
      supabase
        .from("projects")
        .select(
          "id, clinic_name, clinic_number, city, state, status, walkthrough_date, created_at",
        )
        .order("created_at", { ascending: false }),

      supabase
        .from("project_checklist_items")
        .select("project_id, status"),

      supabase
        .from("deficiencies")
        .select("project_id, status"),

      supabase
        .from("project_closeout_items")
        .select("project_id, status"),
    ]);

    if (
      projectError ||
      checklistError ||
      deficiencyError ||
      closeoutError
    ) {
      setErrorMessage(
        projectError?.message ||
          checklistError?.message ||
          deficiencyError?.message ||
          closeoutError?.message ||
          "Unable to load clinic projects.",
      );
      setIsLoading(false);
      return;
    }

    setProjects((projectData ?? []) as Project[]);
    setChecklistItems((checklistData ?? []) as ChecklistItem[]);
    setDeficiencies((deficiencyData ?? []) as Deficiency[]);
    setCloseoutItems((closeoutData ?? []) as CloseoutItem[]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const filteredProjects = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesSearch =
        !normalizedSearch ||
        project.clinic_name
          .toLowerCase()
          .includes(normalizedSearch) ||
        project.clinic_number
          ?.toLowerCase()
          .includes(normalizedSearch) ||
        project.city?.toLowerCase().includes(normalizedSearch) ||
        project.state?.toLowerCase().includes(normalizedSearch);

      let matchesStatus = true;

      if (statusFilter === "Active") {
        matchesStatus =
          project.status !== "Completed" &&
          project.status !== "Archived";
      } else if (statusFilter !== "All") {
        matchesStatus = project.status === statusFilter;
      }

      return matchesSearch && matchesStatus;
    });
  }, [projects, search, statusFilter]);

  const activeCount = projects.filter(
    (project) =>
      project.status !== "Completed" &&
      project.status !== "Archived",
  ).length;

  const completedCount = projects.filter(
    (project) => project.status === "Completed",
  ).length;

  const archivedCount = projects.filter(
    (project) => project.status === "Archived",
  ).length;

  return (
    <AppShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-[#238bac]">
            Project portfolio
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#374151]">
            Clinics
          </h1>

          <p className="mt-2 text-slate-600">
            View and manage every clinic construction punch list.
          </p>
        </div>

        <Link
          href="/projects/new"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#238bac] px-5 font-bold text-white hover:bg-[#0086aa]"
        >
          <CirclePlus size={20} />
          New Clinic
        </Link>
      </div>

      <section className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <CountCard label="All Clinics" value={projects.length} />
        <CountCard label="Active" value={activeCount} />
        <CountCard label="Completed" value={completedCount} />
        <CountCard label="Archived" value={archivedCount} />
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-[1fr_240px]">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Search
            </label>

            <div className="relative">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search clinic, number, city, or state"
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-sm outline-none focus:border-[#238bac]"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Status
            </label>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold outline-none focus:border-[#238bac]"
            >
              {statusOptions.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {errorMessage && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <div className="flex min-h-80 items-center justify-center">
          <LoaderCircle
            className="animate-spin text-[#238bac]"
            size={34}
          />
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <ClipboardList
            className="mx-auto text-slate-400"
            size={38}
          />

          <h2 className="mt-4 text-lg font-bold text-[#374151]">
            No clinics found
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Try changing the search or status filter.
          </p>
        </div>
      ) : (
        <section className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((project) => {
            const projectChecklist = checklistItems.filter(
              (item) => item.project_id === project.id,
            );

            const reviewedItems = projectChecklist.filter(
              (item) => item.status !== "Not Reviewed",
            ).length;

            const walkthroughProgress =
              projectChecklist.length > 0
                ? Math.round(
                    (reviewedItems / projectChecklist.length) *
                      100,
                  )
                : 0;

            const projectOpenDeficiencies =
              deficiencies.filter(
                (item) =>
                  item.project_id === project.id &&
                  item.status !== "Closed",
              ).length;

            const projectCloseout = closeoutItems.filter(
              (item) => item.project_id === project.id,
            );

            const completedCloseout = projectCloseout.filter(
              (item) => item.status !== "Missing",
            ).length;

            const closeoutProgress =
              projectCloseout.length > 0
                ? Math.round(
                    (completedCloseout / projectCloseout.length) *
                      100,
                  )
                : 0;

            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-[#238bac]/40 hover:shadow-md"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#238bac]/10 text-[#238bac]">
                      <Building2 size={22} />
                    </div>

                    <StatusBadge status={project.status} />
                  </div>

                  <h2 className="mt-5 text-lg font-bold text-[#374151] group-hover:text-[#238bac]">
                    {project.clinic_name}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {[project.city, project.state]
                      .filter(Boolean)
                      .join(", ") || "Location not entered"}
                  </p>

                  {project.clinic_number && (
                    <p className="mt-1 text-xs text-slate-400">
                      Clinic #{project.clinic_number}
                    </p>
                  )}

                  <div className="mt-5 space-y-4 border-t border-slate-100 pt-4">
                    <ProgressRow
                      label="Walkthrough"
                      progress={walkthroughProgress}
                      color="bg-[#238bac]"
                    />

                    <ProgressRow
                      label="Closeout"
                      progress={closeoutProgress}
                      color="bg-[#04b0b9]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-5 py-3">
                  <div
                    className={`flex items-center gap-2 text-sm font-semibold ${
                      projectOpenDeficiencies > 0
                        ? "text-[#f04c37]"
                        : "text-emerald-700"
                    }`}
                  >
                    {projectOpenDeficiencies > 0 ? (
                      <TriangleAlert size={16} />
                    ) : (
                      <CheckCircle2 size={16} />
                    )}

                    {projectOpenDeficiencies === 1
                      ? "1 open deficiency"
                      : `${projectOpenDeficiencies} open deficiencies`}
                  </div>

                  <ArrowRight
                    className="text-slate-400 group-hover:text-[#238bac]"
                    size={18}
                  />
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </AppShell>
  );
}

function CountCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[#374151]">
        {value}
      </p>
    </div>
  );
}

function ProgressRow({
  label,
  progress,
  color,
}: {
  label: string;
  progress: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-500">
          {label}
        </span>

        <span className="font-bold text-slate-700">
          {progress}%
        </span>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Setup: "bg-slate-100 text-slate-700",
    "Ready for Walk": "bg-blue-50 text-blue-700",
    "Punch in Progress": "bg-amber-50 text-amber-700",
    "Corrections in Progress": "bg-orange-50 text-orange-700",
    Verification: "bg-purple-50 text-purple-700",
    Completed: "bg-emerald-50 text-emerald-700",
    Archived: "bg-slate-200 text-slate-600",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold ${
        styles[status] || "bg-slate-100 text-slate-700"
      }`}
    >
      {status}
    </span>
  );
}