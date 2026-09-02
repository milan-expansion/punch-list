import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  MapPin,
  TriangleAlert,
  Users,
  PenLine,
  Pencil,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type Project = {
  id: string;
  clinic_name: string;
  clinic_number: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  status: string;
  walkthrough_date: string | null;
  target_completion_date: string | null;
  general_contractor: string | null;
  superintendent_name: string | null;
  milan_cpm_name: string | null;
  drawing_set: string | null;
  drawing_revision: string | null;
  laser_room_count: number;
};

type Room = {
  id: string;
  room_type: string;
  room_name: string;
  sort_order: number;
};

type ChecklistItem = {
  id: string;
  room_id: string;
  status: string;
};

type Deficiency = {
  id: string;
  room_id: string | null;
  status: string;
};

function formatDate(value: string | null) {
  if (!value) return "Not scheduled";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { id } = await params;
const supabase = await createSupabaseServerClient();
  const [
    { data: project, error: projectError },
    { data: rooms },
    { data: checklistItems },
    { data: deficiencies },
  ] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).single(),
    supabase
      .from("project_rooms")
      .select("id, room_type, room_name, sort_order")
      .eq("project_id", id)
      .order("sort_order"),
    supabase
      .from("project_checklist_items")
      .select("id, room_id, status")
      .eq("project_id", id),
    supabase
      .from("deficiencies")
      .select("id, room_id, status")
      .eq("project_id", id),
  ]);

  if (projectError || !project) {
    notFound();
  }

  const typedProject = project as Project;
  const typedRooms = (rooms ?? []) as Room[];
  const typedItems = (checklistItems ?? []) as ChecklistItem[];
  const typedDeficiencies = (deficiencies ?? []) as Deficiency[];

  const reviewedItems = typedItems.filter(
    (item) => item.status !== "Not Reviewed",
  ).length;

  const passedItems = typedItems.filter(
    (item) => item.status === "Passed",
  ).length;

  const openDeficiencies = typedDeficiencies.filter(
    (item) => item.status !== "Closed",
  ).length;

  const awaitingVerification = typedDeficiencies.filter(
    (item) => item.status === "Correction Submitted",
  ).length;

  const progress =
    typedItems.length > 0
      ? Math.round((reviewedItems / typedItems.length) * 100)
      : 0;

  const address = [
    typedProject.address,
    [typedProject.city, typedProject.state].filter(Boolean).join(", "),
    typedProject.zip_code,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <AppShell>
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#238bac]"
      >
        <ArrowLeft size={17} />
        Back to dashboard
      </Link>

     <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
  <div className="border-b border-slate-100 p-5 sm:p-7">
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#238bac] text-white">
          <Building2 size={28} />
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-[#374151] sm:text-3xl">
              {typedProject.clinic_name}
            </h1>

            <span className="rounded-full bg-[#238bac]/10 px-3 py-1 text-xs font-bold text-[#238bac]">
              {typedProject.status}
            </span>
          </div>

          <div className="mt-2 flex items-start gap-2 text-sm text-slate-500">
            <MapPin className="mt-0.5 shrink-0" size={16} />
            <span>{address || "No address entered"}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href={`/projects/${id}/edit`}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#238bac] bg-white px-5 py-3 font-semibold text-[#238bac] transition hover:bg-[#238bac]/5"
        >
          <Pencil size={19} />
          Edit Clinic
        </Link>

        <Link
          href={`/projects/${id}/walkthrough`}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#238bac] px-5 py-3 font-semibold text-white transition hover:bg-[#0086aa]"
        >
          <ClipboardCheck size={20} />
          Start Walkthrough
        </Link>
      </div>
    </div>
  </div>

  <div className="grid divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
    <ProjectDetail
      icon={CalendarDays}
      label="Final Walkthrough"
      value={formatDate(typedProject.walkthrough_date)}
    />

    <ProjectDetail
      icon={Clock3}
      label="Target Completion"
      value={formatDate(typedProject.target_completion_date)}
    />

    <ProjectDetail
      icon={Users}
      label="General Contractor"
      value={typedProject.general_contractor || "Not entered"}
    />

    <ProjectDetail
      icon={Users}
      label="Milan CPM"
      value={typedProject.milan_cpm_name || "Not entered"}
    />
  </div>
</section>
      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Walkthrough Progress"
          value={`${progress}%`}
          icon={ClipboardCheck}
          color="bg-[#238bac]"
        />

        <SummaryCard
          label="Items Passed"
          value={passedItems}
          icon={CheckCircle2}
          color="bg-[#04b0b9]"
        />

        <SummaryCard
          label="Open Deficiencies"
          value={openDeficiencies}
          icon={TriangleAlert}
          color="bg-[#f04c37]"
        />

        <SummaryCard
          label="Awaiting Verification"
          value={awaitingVerification}
          icon={Clock3}
          color="bg-amber-500"
        />
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#374151]">
              Walkthrough Areas
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Review the clinic room by room using the Milan standard.
            </p>
          </div>

          <span className="text-sm font-semibold text-slate-500">
            {typedRooms.length} areas
          </span>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {typedRooms.map((room) => {
            const roomItems = typedItems.filter(
              (item) => item.room_id === room.id,
            );

            const roomReviewed = roomItems.filter(
              (item) => item.status !== "Not Reviewed",
            ).length;

            const roomDeficiencies = typedDeficiencies.filter(
              (item) =>
                item.room_id === room.id && item.status !== "Closed",
            ).length;

            const roomProgress =
              roomItems.length > 0
                ? Math.round(
                    (roomReviewed / roomItems.length) * 100,
                  )
                : 0;

            return (
              <Link
                key={room.id}
                href={`/projects/${id}/walkthrough?room=${room.id}`}
                className="group rounded-xl border border-slate-200 p-4 transition hover:border-[#238bac]/50 hover:shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-bold text-[#374151] group-hover:text-[#238bac]">
                      {room.room_name}
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      {roomItems.length === 0
                        ? "Checklist not generated yet"
                        : `${roomReviewed} of ${roomItems.length} reviewed`}
                    </p>
                  </div>

                  <ArrowRight
                    className="shrink-0 text-slate-400 group-hover:text-[#238bac]"
                    size={19}
                  />
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[#04b0b9] transition-all"
                    style={{ width: `${roomProgress}%` }}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-500">
                    {roomProgress}% complete
                  </span>

                  {roomDeficiencies > 0 && (
                    <span className="font-bold text-[#f04c37]">
                      {roomDeficiencies} open
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-6 grid items-stretch gap-5 lg:grid-cols-3">
        <Link
          href={`/projects/${id}/deficiencies`}
          className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#f04c37]/40"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f04c37]/10 text-[#f04c37]">
              <TriangleAlert size={22} />
            </div>

            <div>
              <h2 className="font-bold text-[#374151]">
                Deficiency Log
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Review corrections and Milan verification.
              </p>
            </div>
          </div>

          <ArrowRight
            className="text-slate-400 group-hover:text-[#f04c37]"
            size={20}
          />
        </Link>

        <Link
          href={`/projects/${id}/closeout`}
          className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#04b0b9]/40"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#04b0b9]/10 text-[#04b0b9]">
              <FileCheck2 size={22} />
            </div>

            <div>
              <h2 className="font-bold text-[#374151]">
                Closeout Documents
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Track permits, warranties, testing, and as-builts.
              </p>
            </div>
          </div>

          <ArrowRight
            className="text-slate-400 group-hover:text-[#04b0b9]"
            size={20}
          />
        </Link>

                 
  <Link
    href={`/projects/${id}/acceptance`}
    className="group flex h-full min-h-[120px] items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#238bac]/40"
  >
    <div className="flex items-center gap-4">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#238bac]/10 text-[#238bac]">
        <PenLine size={22} />
      </div>

      <div>
        <h2 className="font-bold text-[#374151]">
          Completion + Final Acceptance
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Review project completion and collect required signatures.
        </p>
      </div>
    </div>

    <ArrowRight
      className="text-slate-400 group-hover:text-[#238bac]"
      size={22}
    />
  </Link>
</section>
     
    </AppShell>
  );
}

type ProjectDetailProps = {
icon: React.ComponentType<{
  size?: number;
  className?: string;
}>;  label: string;
  value: string;
};

function ProjectDetail({
  icon: Icon,
  label,
  value,
}: ProjectDetailProps) {
  return (
    <div className="flex items-start gap-3 p-5">
      <Icon className="mt-0.5 shrink-0 text-[#238bac]" size={19} />

      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p className="mt-1 truncate text-sm font-semibold text-slate-700">
          {value}
        </p>
      </div>
    </div>
  );
}

type SummaryCardProps = {
  label: string;
  value: number | string;
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
          <p className="text-sm font-medium text-slate-500">{label}</p>
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