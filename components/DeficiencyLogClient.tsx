"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock3,
  Filter,
  ImageIcon,
  LoaderCircle,
  MapPin,
  TriangleAlert,
  UserRound,
  Wrench,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import DeficiencyWorkflow from "@/components/DeficiencyWorkflow";

type DeficiencyLogClientProps = {
  projectId: string;
};

type Project = {
  id: string;
  clinic_name: string;
};

type Room = {
  id: string;
  room_name: string;
};

type Photo = {
  id: string;
  deficiency_id: string;
  storage_path: string;
  photo_type: "Original" | "Correction" | "Verification";
  caption: string | null;
  signedUrl?: string;
};

type Deficiency = {
  id: string;
  project_id: string;
  room_id: string | null;
  checklist_item_id: string | null;
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
  correction_notes: string | null;
  verification_notes: string | null;
  created_at: string;
  updated_at: string;
};

const statuses = [
  "All",
  "Open",
  "Correction Submitted",
  "Milan Verified",
  "Closed",
] as const;

const priorities = [
  "All",
  "Low",
  "Normal",
  "High",
  "Critical",
] as const;

export default function DeficiencyLogClient({
  projectId,
}: DeficiencyLogClientProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [deficiencies, setDeficiencies] = useState<Deficiency[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);

  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [roomFilter, setRoomFilter] = useState("All");
  const [tradeFilter, setTradeFilter] = useState("All");

  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
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
        .select("id, clinic_name")
        .eq("id", projectId)
        .single(),

      supabase
        .from("project_rooms")
        .select("id, room_name")
        .eq("project_id", projectId)
        .order("sort_order"),

      supabase
        .from("deficiencies")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),

      supabase
        .from("deficiency_photos")
        .select(
          "id, deficiency_id, storage_path, photo_type, caption",
        )
        .eq("project_id", projectId)
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
          "Unable to load the deficiency log.",
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

    setProject(projectData as Project);
    setRooms((roomData ?? []) as Room[]);
    setDeficiencies((deficiencyData ?? []) as Deficiency[]);
    setPhotos(photosWithUrls);
    setIsLoading(false);
  }, [projectId]);

  useEffect(() => {
    void loadDeficiencies();
  }, [loadDeficiencies]);

  const roomNameById = useMemo(
    () =>
      new Map(
        rooms.map((room) => [room.id, room.room_name]),
      ),
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

  const filteredDeficiencies = useMemo(
    () =>
      deficiencies.filter((deficiency) => {
        if (
          statusFilter !== "All" &&
          deficiency.status !== statusFilter
        ) {
          return false;
        }

        if (
          priorityFilter !== "All" &&
          deficiency.priority !== priorityFilter
        ) {
          return false;
        }

        if (
          roomFilter !== "All" &&
          deficiency.room_id !== roomFilter
        ) {
          return false;
        }

        if (
          tradeFilter !== "All" &&
          deficiency.trade !== tradeFilter
        ) {
          return false;
        }

        return true;
      }),
    [
      deficiencies,
      priorityFilter,
      roomFilter,
      statusFilter,
      tradeFilter,
    ],
  );

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

  async function updateStatus(
    deficiency: Deficiency,
    status: Deficiency["status"],
  ) {
    setUpdatingId(deficiency.id);
    setErrorMessage("");

    const updateValues: Record<string, string | null> = {
      status,
    };

    if (status === "Milan Verified") {
      updateValues.verified_at = new Date().toISOString();
    }

    if (status === "Closed") {
      updateValues.closed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("deficiencies")
      .update(updateValues)
      .eq("id", deficiency.id);

    if (error) {
      setErrorMessage(error.message);
      setUpdatingId(null);
      return;
    }

    setDeficiencies((current) =>
      current.map((item) =>
        item.id === deficiency.id
          ? { ...item, status }
          : item,
      ),
    );

    setUpdatingId(null);
  }

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <LoaderCircle
            className="animate-spin text-[#238bac]"
            size={34}
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl">
        <Link
          href={`/projects/${projectId}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#238bac]"
        >
          <ArrowLeft size={17} />
          Back to clinic
        </Link>

        <div className="mt-5">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#238bac]">
            Construction corrections
          </p>

          <h1 className="mt-1 text-3xl font-bold text-[#374151]">
            Deficiency Log
          </h1>

          <p className="mt-2 text-slate-600">
            {project?.clinic_name}
          </p>
        </div>

        {errorMessage && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {errorMessage}
          </div>
        )}

        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Open"
            value={openCount}
            icon={TriangleAlert}
            color="bg-[#f04c37]"
          />

          <SummaryCard
            label="Correction Submitted"
            value={correctionCount}
            icon={Clock3}
            color="bg-amber-500"
          />

          <SummaryCard
            label="Milan Verified"
            value={verifiedCount}
            icon={CheckCircle2}
            color="bg-[#238bac]"
          />

          <SummaryCard
            label="Closed"
            value={closedCount}
            icon={CheckCircle2}
            color="bg-[#04b0b9]"
          />
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Filter size={19} className="text-[#238bac]" />
            <h2 className="font-bold text-[#374151]">
              Filter Deficiencies
            </h2>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <FilterSelect
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[...statuses]}
            />

            <FilterSelect
              label="Room"
              value={roomFilter}
              onChange={setRoomFilter}
              options={[
                { value: "All", label: "All Rooms" },
                ...rooms.map((room) => ({
                  value: room.id,
                  label: room.room_name,
                })),
              ]}
            />

            <FilterSelect
              label="Trade"
              value={tradeFilter}
              onChange={setTradeFilter}
              options={["All", ...trades]}
            />

            <FilterSelect
              label="Priority"
              value={priorityFilter}
              onChange={setPriorityFilter}
              options={[...priorities]}
            />
          </div>
        </section>

        <div className="mt-6 space-y-5">
          {filteredDeficiencies.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <CheckCircle2
                className="mx-auto text-[#04b0b9]"
                size={38}
              />

              <h2 className="mt-4 text-lg font-bold text-[#374151]">
                No deficiencies found
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                No items match the selected filters.
              </p>
            </div>
          ) : (
            filteredDeficiencies.map((deficiency, index) => {
              const deficiencyPhotos = photos.filter(
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
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-slate-400">
                            #{index + 1}
                          </span>

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

                      <select
                        value={deficiency.status}
                        disabled={updatingId === deficiency.id}
                        onChange={(event) =>
                          void updateStatus(
                            deficiency,
                            event.target
                              .value as Deficiency["status"],
                          )
                        }
                        className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold outline-none focus:border-[#238bac]"
                      >
                        <option>Open</option>
                        <option>Correction Submitted</option>
                        <option>Milan Verified</option>
                        <option>Closed</option>
                      </select>
                    </div>

                    <div className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
                      <Detail
                        icon={MapPin}
                        label="Room"
                        value={
                          deficiency.room_id
                            ? roomNameById.get(
                                deficiency.room_id,
                              ) || "Unknown room"
                            : "No room"
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

                      <Detail
                        icon={UserRound}
                        label="Assigned To"
                        value={
                          deficiency.assigned_to ||
                          "Not assigned"
                        }
                      />
                    </div>

                    {deficiencyPhotos.length > 0 && (
                      <div className="mt-5 border-t border-slate-100 pt-5">
                        <div className="flex items-center gap-2">
                          <Camera
                            size={18}
                            className="text-[#238bac]"
                          />

                          <h3 className="text-sm font-bold text-[#374151]">
                            Photos ({deficiencyPhotos.length})
                          </h3>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                          {deficiencyPhotos.map((photo) => (
                            <a
                              key={photo.id}
                              href={photo.signedUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                            >
                              {photo.signedUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={photo.signedUrl}
                                  alt={
                                    photo.caption ||
                                    "Deficiency photo"
                                  }
                                  className="aspect-square w-full object-cover"
                                />
                              ) : (
                                <div className="flex aspect-square items-center justify-center">
                                  <ImageIcon
                                    size={28}
                                    className="text-slate-400"
                                  />
                                </div>
                              )}

                              <p className="px-2 py-2 text-center text-xs font-semibold text-slate-600">
                                {photo.photo_type}
                              </p>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                                    </div>

                  <DeficiencyWorkflow
                    deficiencyId={deficiency.id}
                    projectId={projectId}
                    status={deficiency.status}
                    onComplete={loadDeficiencies}
                  />
                </article>
              );
            })
          )}
        </div>
      </div>
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

type FilterSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options:
    | string[]
    | {
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
      <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#238bac]"
      >
        {options.map((option) => {
          const value =
            typeof option === "string"
              ? option
              : option.value;

          const pluralLabels: Record<string, string> = {
  Status: "Statuses",
  Priority: "Priorities",
  Trade: "Trades",
  Room: "Rooms",
};

const optionLabel =
  typeof option === "string"
    ? option === "All"
      ? `All ${pluralLabels[label] || label}`
      : option
    : option.label;

          return (
            <option key={value} value={value}>
              {optionLabel}
            </option>
          );
        })}
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
  icon: React.ComponentType<{
  size?: number;
  className?: string;
}>;
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
      <Icon
        className="mt-0.5 shrink-0 text-[#238bac]"
        size={17}
      />

      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
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