"use client";

import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock3,
  Filter,
  ImageIcon,
  LoaderCircle,
  MapPin,
  Search,
  TriangleAlert,
  Wrench,
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
};

type Room = {
  id: string;
  project_id: string;
  room_name: string;
};

type Deficiency = {
  id: string;
  project_id: string;
  room_id: string | null;
  description: string;
  trade: string | null;
  assigned_to: string | null;
  priority: "Low" | "Normal" | "High" | "Critical";
  status:
    | "Open"
    | "Correction Submitted"
    | "Milan Verified"
    | "Closed";
  due_date: string | null;
  created_at: string;
};

type Photo = {
  id: string;
  deficiency_id: string;
  storage_path: string;
  photo_type: string;
  signedUrl?: string;
};

const statusOptions = [
  "All",
  "Open",
  "Correction Submitted",
  "Milan Verified",
  "Closed",
];

const priorityOptions = [
  "All",
  "Low",
  "Normal",
  "High",
  "Critical",
];

export default function DeficienciesPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [deficiencies, setDeficiencies] = useState<Deficiency[]>(
    [],
  );
  const [photos, setPhotos] = useState<Photo[]>([]);

  const [search, setSearch] = useState("");
  const [clinicFilter, setClinicFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [tradeFilter, setTradeFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadDeficiencies = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    const [
      { data: projectData, error: projectError },
      { data: roomData, error: roomError },
      { data: deficiencyData, error: deficiencyError },
      { data: photoData, error: photoError },
    ] = await Promise.all([
      supabase
        .from("projects")
        .select("id, clinic_name, city, state, status")
        .order("clinic_name"),

      supabase
        .from("project_rooms")
        .select("id, project_id, room_name"),

      supabase
        .from("deficiencies")
        .select(
          "id, project_id, room_id, description, trade, assigned_to, priority, status, due_date, created_at",
        )
        .order("created_at", { ascending: false }),

      supabase
        .from("deficiency_photos")
        .select(
          "id, deficiency_id, storage_path, photo_type",
        )
        .eq("photo_type", "Original")
        .order("created_at"),
    ]);

    if (
      projectError ||
      roomError ||
      deficiencyError ||
      photoError
    ) {
      setErrorMessage(
        projectError?.message ||
          roomError?.message ||
          deficiencyError?.message ||
          photoError?.message ||
          "Unable to load deficiencies.",
      );
      setIsLoading(false);
      return;
    }

    const loadedPhotos = (photoData ?? []) as Photo[];

    const photosWithUrls = await Promise.all(
      loadedPhotos.map(async (photo) => {
        const { data } = await supabase.storage
          .from("punch-photos")
          .createSignedUrl(photo.storage_path, 3600);

        return {
          ...photo,
          signedUrl: data?.signedUrl,
        };
      }),
    );

    setProjects((projectData ?? []) as Project[]);
    setRooms((roomData ?? []) as Room[]);
    setDeficiencies((deficiencyData ?? []) as Deficiency[]);
    setPhotos(photosWithUrls);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadDeficiencies();
  }, [loadDeficiencies]);

  const projectById = useMemo(
    () =>
      new Map(
        projects.map((project) => [project.id, project]),
      ),
    [projects],
  );

  const roomById = useMemo(
    () => new Map(rooms.map((room) => [room.id, room])),
    [rooms],
  );

  const trades = useMemo(
    () =>
      Array.from(
        new Set(
          deficiencies
            .map((item) => item.trade)
            .filter((trade): trade is string => Boolean(trade)),
        ),
      ).sort(),
    [deficiencies],
  );

  const filteredDeficiencies = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return deficiencies.filter((deficiency) => {
      const project = projectById.get(deficiency.project_id);
      const room = deficiency.room_id
        ? roomById.get(deficiency.room_id)
        : null;

      const matchesSearch =
        !normalizedSearch ||
        deficiency.description
          .toLowerCase()
          .includes(normalizedSearch) ||
        project?.clinic_name
          .toLowerCase()
          .includes(normalizedSearch) ||
        room?.room_name
          .toLowerCase()
          .includes(normalizedSearch) ||
        deficiency.trade
          ?.toLowerCase()
          .includes(normalizedSearch);

      const matchesClinic =
        clinicFilter === "All" ||
        deficiency.project_id === clinicFilter;

      const matchesStatus =
        statusFilter === "All" ||
        deficiency.status === statusFilter;

      const matchesTrade =
        tradeFilter === "All" ||
        deficiency.trade === tradeFilter;

      const matchesPriority =
        priorityFilter === "All" ||
        deficiency.priority === priorityFilter;

      return (
        matchesSearch &&
        matchesClinic &&
        matchesStatus &&
        matchesTrade &&
        matchesPriority
      );
    });
  }, [
    clinicFilter,
    deficiencies,
    priorityFilter,
    projectById,
    roomById,
    search,
    statusFilter,
    tradeFilter,
  ]);

  const openCount = deficiencies.filter(
    (item) => item.status === "Open",
  ).length;

  const correctionCount = deficiencies.filter(
    (item) => item.status === "Correction Submitted",
  ).length;

  const verifiedCount = deficiencies.filter(
    (item) => item.status === "Milan Verified",
  ).length;

  const closedCount = deficiencies.filter(
    (item) => item.status === "Closed",
  ).length;

  return (
    <AppShell>
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-[#238bac]">
          Portfolio corrections
        </p>

        <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#374151]">
          Deficiencies
        </h1>

        <p className="mt-2 text-slate-600">
          Track construction deficiencies across every clinic.
        </p>
      </div>

      <section className="mt-7 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <SummaryCard
          label="Open"
          value={openCount}
          color="bg-[#f04c37]"
          icon={TriangleAlert}
        />

        <SummaryCard
          label="Correction Submitted"
          value={correctionCount}
          color="bg-amber-500"
          icon={Clock3}
        />

        <SummaryCard
          label="Milan Verified"
          value={verifiedCount}
          color="bg-[#238bac]"
          icon={CheckCircle2}
        />

        <SummaryCard
          label="Closed"
          value={closedCount}
          color="bg-[#04b0b9]"
          icon={CheckCircle2}
        />
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Filter size={19} className="text-[#238bac]" />

          <h2 className="font-bold text-[#374151]">
            Search and Filter
          </h2>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
                placeholder="Search deficiencies"
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-[#238bac]"
              />
            </div>
          </div>

          <FilterSelect
            label="Clinic"
            value={clinicFilter}
            onChange={setClinicFilter}
            options={[
              { value: "All", label: "All Clinics" },
              ...projects.map((project) => ({
                value: project.id,
                label: project.clinic_name,
              })),
            ]}
          />

          <FilterSelect
            label="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={statusOptions.map((status) => ({
              value: status,
              label:
                status === "All" ? "All Statuses" : status,
            }))}
          />

          <FilterSelect
            label="Trade"
            value={tradeFilter}
            onChange={setTradeFilter}
            options={[
              { value: "All", label: "All Trades" },
              ...trades.map((trade) => ({
                value: trade,
                label: trade,
              })),
            ]}
          />

          <FilterSelect
            label="Priority"
            value={priorityFilter}
            onChange={setPriorityFilter}
            options={priorityOptions.map((priority) => ({
              value: priority,
              label:
                priority === "All"
                  ? "All Priorities"
                  : priority,
            }))}
          />
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
      ) : filteredDeficiencies.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <CheckCircle2
            className="mx-auto text-[#04b0b9]"
            size={40}
          />

          <h2 className="mt-4 text-lg font-bold text-[#374151]">
            No deficiencies found
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            No deficiencies match the selected filters.
          </p>
        </div>
      ) : (
        <section className="mt-6 space-y-5">
          {filteredDeficiencies.map((deficiency) => {
            const project = projectById.get(
              deficiency.project_id,
            );

            const room = deficiency.room_id
              ? roomById.get(deficiency.room_id)
              : null;

            const originalPhoto = photos.find(
              (photo) =>
                photo.deficiency_id === deficiency.id,
            );

            const isOverdue =
              deficiency.due_date &&
              deficiency.status !== "Closed" &&
              deficiency.due_date <
                new Date().toISOString().slice(0, 10);

            return (
              <article
                key={deficiency.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="grid lg:grid-cols-[180px_1fr]">
                  <div className="min-h-44 bg-slate-100">
                    {originalPhoto?.signedUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={originalPhoto.signedUrl}
                        alt="Original deficiency"
                        className="h-full min-h-44 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full min-h-44 items-center justify-center text-slate-400">
                        <div className="text-center">
                          <ImageIcon
                            className="mx-auto"
                            size={30}
                          />
                          <p className="mt-2 text-xs font-semibold">
                            No photo
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge
                            status={deficiency.status}
                          />

                          <PriorityBadge
                            priority={deficiency.priority}
                          />

                          {isOverdue && (
                            <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
                              Overdue
                            </span>
                          )}
                        </div>

                        <h2 className="mt-3 text-lg font-bold leading-7 text-[#374151]">
                          {deficiency.description}
                        </h2>
                      </div>

                      <Link
                        href={`/projects/${deficiency.project_id}/deficiencies`}
                        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#238bac] px-4 text-sm font-bold text-[#238bac] hover:bg-[#238bac]/5"
                      >
                        Open Deficiency Log
                        <ArrowRight size={16} />
                      </Link>
                    </div>

                    <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                      <Detail
                        icon={Building2}
                        label="Clinic"
                        value={
                          project?.clinic_name ||
                          "Unknown clinic"
                        }
                      />

                      <Detail
                        icon={MapPin}
                        label="Room"
                        value={
                          room?.room_name || "Not assigned"
                        }
                      />

                      <Detail
                        icon={Wrench}
                        label="Trade"
                        value={
                          deficiency.trade ||
                          "General Contractor"
                        }
                      />

                      <Detail
                        icon={CalendarDays}
                        label="Due Date"
                        value={formatDate(deficiency.due_date)}
                      />
                    </div>

                    {originalPhoto?.signedUrl && (
                      <a
                        href={originalPhoto.signedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#238bac]"
                      >
                        <Camera size={16} />
                        View Original Photo
                      </a>
                    )}
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
  if (!value) return "Not set";

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

type FilterSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: {
    value: string;
    label: string;
  }[];
};

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: FilterSelectProps) {
  return (
    <div>
      <FilterLabel>{label}</FilterLabel>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#238bac]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: Deficiency["status"];
}) {
  const styles = {
    Open: "bg-red-50 text-[#f04c37]",
    "Correction Submitted": "bg-amber-50 text-amber-700",
    "Milan Verified": "bg-blue-50 text-[#238bac]",
    Closed: "bg-emerald-50 text-emerald-700",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-bold ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function PriorityBadge({
  priority,
}: {
  priority: Deficiency["priority"];
}) {
  const styles = {
    Low: "bg-slate-100 text-slate-600",
    Normal: "bg-blue-50 text-blue-700",
    High: "bg-orange-50 text-orange-700",
    Critical: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-bold ${styles[priority]}`}
    >
      {priority}
    </span>
  );
}

type DetailProps = {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  value: string;
};

function Detail({
  icon: Icon,
  label,
  value,
}: DetailProps) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-3">
      <span className="mt-0.5 shrink-0 text-[#238bac]">
  <Icon size={17} />
</span>

      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
          {label}
        </p>

        <p className="mt-1 truncate font-semibold text-slate-700">
          {value}
        </p>
      </div>
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