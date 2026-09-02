"use client";

import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  CircleAlert,
  FileCheck2,
  FileText,
  LoaderCircle,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

type Project = {
  id: string;
  clinic_name: string;
  city: string | null;
  state: string | null;
  status: string;
  target_completion_date: string | null;
};

type CloseoutItem = {
  id: string;
  project_id: string;
  category: string;
  item_name: string;
  status: "Missing" | "Received" | "N/A";
};

const progressOptions = [
  {
    value: "All",
    label: "All Closeout Statuses",
  },
  {
    value: "Incomplete",
    label: "Incomplete",
  },
  {
    value: "Complete",
    label: "Complete",
  },
];

export default function CloseoutPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [closeoutItems, setCloseoutItems] = useState<
    CloseoutItem[]
  >([]);

  const [search, setSearch] = useState("");
  const [progressFilter, setProgressFilter] =
    useState("Incomplete");
  const [projectStatusFilter, setProjectStatusFilter] =
    useState("Active");

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadCloseout = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    const [
      { data: projectData, error: projectError },
      { data: closeoutData, error: closeoutError },
    ] = await Promise.all([
      supabase
        .from("projects")
        .select(
          "id, clinic_name, city, state, status, target_completion_date",
        )
        .order("clinic_name"),

      supabase
        .from("project_closeout_items")
        .select(
          "id, project_id, category, item_name, status",
        ),
    ]);

    if (projectError || closeoutError) {
      setErrorMessage(
        projectError?.message ||
          closeoutError?.message ||
          "Unable to load portfolio closeout information.",
      );
      setIsLoading(false);
      return;
    }

    setProjects((projectData ?? []) as Project[]);
    setCloseoutItems((closeoutData ?? []) as CloseoutItem[]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadCloseout();
  }, [loadCloseout]);

  const projectMetrics = useMemo(
    () =>
      projects.map((project) => {
        const items = closeoutItems.filter(
          (item) => item.project_id === project.id,
        );

        const received = items.filter(
          (item) => item.status === "Received",
        ).length;

        const missing = items.filter(
          (item) => item.status === "Missing",
        ).length;

        const notApplicable = items.filter(
          (item) => item.status === "N/A",
        ).length;

        const completed = received + notApplicable;

        const progress =
          items.length > 0
            ? Math.round((completed / items.length) * 100)
            : 0;

        const missingByCategory = Array.from(
          new Set(
            items
              .filter((item) => item.status === "Missing")
              .map((item) => item.category),
          ),
        );

        return {
          project,
          total: items.length,
          received,
          missing,
          notApplicable,
          completed,
          progress,
          missingByCategory,
          isComplete: items.length > 0 && missing === 0,
        };
      }),
    [closeoutItems, projects],
  );

  const filteredProjects = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return projectMetrics.filter((metric) => {
      const { project } = metric;

      const matchesSearch =
        !normalizedSearch ||
        project.clinic_name
          .toLowerCase()
          .includes(normalizedSearch) ||
        project.city?.toLowerCase().includes(normalizedSearch) ||
        project.state
          ?.toLowerCase()
          .includes(normalizedSearch);

      let matchesProgress = true;

      if (progressFilter === "Incomplete") {
        matchesProgress = !metric.isComplete;
      }

      if (progressFilter === "Complete") {
        matchesProgress = metric.isComplete;
      }

      let matchesProjectStatus = true;

      if (projectStatusFilter === "Active") {
        matchesProjectStatus =
          project.status !== "Completed" &&
          project.status !== "Archived";
      } else if (projectStatusFilter !== "All") {
        matchesProjectStatus =
          project.status === projectStatusFilter;
      }

      return (
        matchesSearch &&
        matchesProgress &&
        matchesProjectStatus
      );
    });
  }, [
    progressFilter,
    projectMetrics,
    projectStatusFilter,
    search,
  ]);

  const totalRequirements = closeoutItems.length;

  const totalReceived = closeoutItems.filter(
    (item) => item.status === "Received",
  ).length;

  const totalMissing = closeoutItems.filter(
    (item) => item.status === "Missing",
  ).length;

  const completeClinics = projectMetrics.filter(
    (metric) => metric.isComplete,
  ).length;

  return (
    <AppShell>
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-[#238bac]">
          Portfolio completion
        </p>

        <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#374151]">
          Closeout
        </h1>

        <p className="mt-2 text-slate-600">
          Monitor permits, testing, warranties, and closeout
          documentation across every clinic.
        </p>
      </div>

      <section className="mt-7 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <SummaryCard
          label="Requirements"
          value={totalRequirements}
          icon={FileCheck2}
          color="bg-[#238bac]"
        />

        <SummaryCard
          label="Received"
          value={totalReceived}
          icon={CheckCircle2}
          color="bg-[#04b0b9]"
        />

        <SummaryCard
          label="Missing"
          value={totalMissing}
          icon={CircleAlert}
          color="bg-[#f04c37]"
        />

        <SummaryCard
          label="Clinics Complete"
          value={completeClinics}
          icon={Building2}
          color="bg-emerald-600"
        />
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-[1fr_230px_230px]">
          <div>
            <FilterLabel>Search</FilterLabel>

            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={17}
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search clinic, city, or state"
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-[#238bac]"
              />
            </div>
          </div>

          <div>
            <FilterLabel>Closeout Progress</FilterLabel>

            <select
              value={progressFilter}
              onChange={(event) =>
                setProgressFilter(event.target.value)
              }
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#238bac]"
            >
              {progressOptions.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <FilterLabel>Project Status</FilterLabel>

            <select
              value={projectStatusFilter}
              onChange={(event) =>
                setProjectStatusFilter(event.target.value)
              }
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#238bac]"
            >
              <option value="All">All Project Statuses</option>
              <option value="Active">Active</option>
              <option value="Setup">Setup</option>
              <option value="Ready for Walk">
                Ready for Walk
              </option>
              <option value="Punch in Progress">
                Punch in Progress
              </option>
              <option value="Corrections in Progress">
                Corrections in Progress
              </option>
              <option value="Verification">
                Verification
              </option>
              <option value="Completed">Completed</option>
              <option value="Archived">Archived</option>
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
          <FileText
            className="mx-auto text-slate-400"
            size={40}
          />

          <h2 className="mt-4 text-lg font-bold text-[#374151]">
            No clinics found
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            No clinic closeout records match the selected filters.
          </p>
        </div>
      ) : (
        <section className="mt-6 grid gap-5 xl:grid-cols-2">
          {filteredProjects.map((metric) => {
            const { project } = metric;

            return (
              <article
                key={project.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#238bac]/10 text-[#238bac]">
                        <Building2 size={22} />
                      </div>

                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-bold text-[#374151]">
                          {project.clinic_name}
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                          {[project.city, project.state]
                            .filter(Boolean)
                            .join(", ") ||
                            "Location not entered"}
                        </p>
                      </div>
                    </div>

                    <StatusBadge
                      complete={metric.isComplete}
                    />
                  </div>

                  <div className="mt-5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-slate-500">
                        Closeout Progress
                      </span>

                      <span className="font-bold text-[#238bac]">
                        {metric.progress}%
                      </span>
                    </div>

                    <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[#04b0b9] transition-all"
                        style={{
                          width: `${metric.progress}%`,
                        }}
                      />
                    </div>

                    <p className="mt-2 text-xs text-slate-500">
                      {metric.completed} of {metric.total} requirements
                      complete
                    </p>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <MetricBox
                      label="Received"
                      value={metric.received}
                      color="text-emerald-700"
                    />

                    <MetricBox
                      label="Missing"
                      value={metric.missing}
                      color="text-[#f04c37]"
                    />

                    <MetricBox
                      label="N/A"
                      value={metric.notApplicable}
                      color="text-slate-600"
                    />
                  </div>

                  {metric.missingByCategory.length > 0 && (
                    <div className="mt-5 rounded-xl border border-red-100 bg-red-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-red-700">
                        Outstanding Categories
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {metric.missingByCategory.map(
                          (category) => (
                            <span
                              key={category}
                              className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-red-700"
                            >
                              {category}
                            </span>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Target Completion
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-700">
                        {formatDate(
                          project.target_completion_date,
                        )}
                      </p>
                    </div>

                    <Link
                      href={`/projects/${project.id}/closeout`}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#238bac] px-4 text-sm font-bold text-white hover:bg-[#0086aa]"
                    >
                      Open Tracker
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </AppShell>
  );
}

function formatDate(value: string | null) {
  if (!value) return "Not scheduled";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function FilterLabel({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
      {children}
    </label>
  );
}

function StatusBadge({ complete }: { complete: boolean }) {
  return complete ? (
    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
      Complete
    </span>
  ) : (
    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-[#f04c37]">
      Incomplete
    </span>
  );
}

function MetricBox({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 text-center">
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500">
        {label}
      </p>
    </div>
  );
}

type SummaryCardProps = {
  label: string;
  value: number;
  icon: React.ComponentType<{ size?: number }>;
  color: string;
};

function SummaryCard({
  label,
  value,
  icon: Icon,
  color,
}: SummaryCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-3xl font-bold text-[#374151]">
            {value}
          </p>
        </div>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl text-white ${color}`}
        >
          <Icon size={23} />
        </div>
      </div>
    </div>
  );
}