import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  CirclePlus,
  ClipboardList,
  Clock3,
  FileCheck2,
  TriangleAlert,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type Project = {
  id: string;
  clinic_name: string;
  city: string | null;
  state: string | null;
  status: string;
  walkthrough_date: string | null;
  target_completion_date: string | null;
};

type ChecklistItem = {
  id: string;
  project_id: string;
  status: string;
};

type Deficiency = {
  id: string;
  project_id: string;
  status: string;
};

type CloseoutItem = {
  id: string;
  project_id: string;
  status: string;
};

type DashboardData = {
  projects: Project[];
  checklistItems: ChecklistItem[];
  deficiencies: Deficiency[];
  closeoutItems: CloseoutItem[];
};

async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createSupabaseServerClient();
  const [
    { data: projects, error: projectError },
    { data: checklistItems, error: checklistError },
    { data: deficiencies, error: deficiencyError },
    { data: closeoutItems, error: closeoutError },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "id, clinic_name, city, state, status, walkthrough_date, target_completion_date",
      )
      .neq("status", "Archived")
      .order("created_at", { ascending: false }),

    supabase
      .from("project_checklist_items")
      .select("id, project_id, status"),

    supabase
      .from("deficiencies")
      .select("id, project_id, status"),

    supabase
      .from("project_closeout_items")
      .select("id, project_id, status"),
  ]);

  if (
    projectError ||
    checklistError ||
    deficiencyError ||
    closeoutError
  ) {
    console.error(
      "Unable to load dashboard:",
      projectError?.message ||
        checklistError?.message ||
        deficiencyError?.message ||
        closeoutError?.message,
    );
  }

  return {
    projects: (projects ?? []) as Project[],
    checklistItems: (checklistItems ?? []) as ChecklistItem[],
    deficiencies: (deficiencies ?? []) as Deficiency[],
    closeoutItems: (closeoutItems ?? []) as CloseoutItem[],
  };
}

function formatDate(dateValue: string | null) {
  if (!dateValue) return "Not scheduled";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dateValue}T00:00:00Z`));
}

export default async function DashboardPage() {
  const {
    projects,
    checklistItems,
    deficiencies,
    closeoutItems,
  } = await getDashboardData();

  const activeProjects = projects.filter(
    (project) =>
      project.status !== "Completed" &&
      project.status !== "Archived",
  ).length;

  const completedProjects = projects.filter(
    (project) => project.status === "Completed",
  ).length;

  const openDeficiencies = deficiencies.filter(
    (deficiency) => deficiency.status !== "Closed",
  ).length;

  const awaitingVerification = deficiencies.filter(
    (deficiency) =>
      deficiency.status === "Correction Submitted",
  ).length;

  return (
    <AppShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-[#238bac]">
            Construction closeout
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#374151]">
            Punch List Dashboard
          </h1>

          <p className="mt-2 text-slate-600">
            Track final walkthroughs, deficiencies, photos, and closeout
            requirements.
          </p>
        </div>

        <Link
          href="/projects/new"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#238bac] px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-[#0086aa]"
        >
          <CirclePlus size={20} />
          New Clinic
        </Link>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard
          label="Active Clinics"
          value={activeProjects}
          icon={Building2}
          iconColor="bg-[#238bac]"
        />

        <DashboardCard
          label="Open Deficiencies"
          value={openDeficiencies}
          icon={TriangleAlert}
          iconColor="bg-[#f04c37]"
        />

        <DashboardCard
          label="Awaiting Verification"
          value={awaitingVerification}
          icon={Clock3}
          iconColor="bg-amber-500"
        />

        <DashboardCard
          label="Completed Clinics"
          value={completedProjects}
          icon={CheckCircle2}
          iconColor="bg-[#04b0b9]"
        />
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#374151]">
              Clinic Projects
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Select a clinic to continue its walkthrough.
            </p>
          </div>

          {projects.length > 0 && (
            <Link
              href="/projects"
              className="hidden items-center gap-1 text-sm font-semibold text-[#238bac] hover:text-[#0086aa] sm:flex"
            >
              View all
              <ArrowRight size={16} />
            </Link>
          )}
        </div>

        {projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#238bac]/10 text-[#238bac]">
              <ClipboardList size={28} />
            </div>

            <h3 className="mt-4 text-lg font-bold text-[#374151]">
              No clinic projects yet
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Create your first clinic to generate its rooms, punch list,
              photo log, deficiency tracker, and closeout checklist.
            </p>

            <Link
              href="/projects/new"
              className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#238bac] px-5 py-3 font-semibold text-white transition hover:bg-[#0086aa]"
            >
              <CirclePlus size={19} />
              Create First Clinic
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => {
              const projectChecklist = checklistItems.filter(
                (item) => item.project_id === project.id,
              );

              const reviewedItems = projectChecklist.filter(
                (item) => item.status !== "Not Reviewed",
              ).length;

              const walkthroughProgress =
                projectChecklist.length > 0
                  ? Math.round(
                      (reviewedItems / projectChecklist.length) * 100,
                    )
                  : 0;

              const projectDeficiencies = deficiencies.filter(
                (item) => item.project_id === project.id,
              );

              const projectOpenDeficiencies =
                projectDeficiencies.filter(
                  (item) => item.status !== "Closed",
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

                    <h3 className="mt-5 text-lg font-bold text-[#374151] group-hover:text-[#238bac]">
                      {project.clinic_name}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      {[project.city, project.state]
                        .filter(Boolean)
                        .join(", ") || "Location not entered"}
                    </p>

                    <div className="mt-5 border-t border-slate-100 pt-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Final walkthrough
                      </p>

                      <p className="mt-1 text-sm font-medium text-slate-700">
                        {formatDate(project.walkthrough_date)}
                      </p>
                    </div>

                    <div className="mt-5 space-y-4">
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
          </div>
        )}
      </section>
    </AppShell>
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
          className={`h-full rounded-full transition-all ${color}`}
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

type DashboardCardProps = {
  label: string;
  value: number;
  icon: React.ComponentType<{
  size?: number;
  className?: string;
}>;
  iconColor: string;
};

function DashboardCard({
  label,
  value,
  icon: Icon,
  iconColor,
}: DashboardCardProps) {
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
          className={`flex h-12 w-12 items-center justify-center rounded-xl text-white ${iconColor}`}
        >
          <Icon size={23} />
        </div>
      </div>
    </div>
  );
}