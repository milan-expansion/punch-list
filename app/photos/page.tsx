"use client";

import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Camera,
  CheckCircle2,
  ImageIcon,
  LoaderCircle,
  MapPin,
  Search,
  TriangleAlert,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

type Project = {
  id: string;
  clinic_name: string;
  city: string | null;
  state: string | null;
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
  status: string;
};

type Photo = {
  id: string;
  deficiency_id: string;
  project_id: string;
  storage_path: string;
  photo_type: "Original" | "Correction" | "Verification";
  caption: string | null;
  created_at: string;
  signedUrl?: string;
};

const photoTypes = [
  "All",
  "Original",
  "Correction",
  "Verification",
];

export default function PhotosPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [deficiencies, setDeficiencies] = useState<Deficiency[]>(
    [],
  );
  const [photos, setPhotos] = useState<Photo[]>([]);

  const [search, setSearch] = useState("");
  const [clinicFilter, setClinicFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(
    null,
  );

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadPhotos = useCallback(async () => {
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
        .select("id, clinic_name, city, state")
        .order("clinic_name"),

      supabase
        .from("project_rooms")
        .select("id, project_id, room_name"),

      supabase
        .from("deficiencies")
        .select(
          "id, project_id, room_id, description, trade, status",
        ),

      supabase
        .from("deficiency_photos")
        .select(
          "id, deficiency_id, project_id, storage_path, photo_type, caption, created_at",
        )
        .order("created_at", { ascending: false }),
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
          "Unable to load the photo gallery.",
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
    void loadPhotos();
  }, [loadPhotos]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedPhoto(null);
      }
    }

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

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

  const deficiencyById = useMemo(
    () =>
      new Map(
        deficiencies.map((deficiency) => [
          deficiency.id,
          deficiency,
        ]),
      ),
    [deficiencies],
  );

  const filteredPhotos = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return photos.filter((photo) => {
      const project = projectById.get(photo.project_id);
      const deficiency = deficiencyById.get(
        photo.deficiency_id,
      );

      const room = deficiency?.room_id
        ? roomById.get(deficiency.room_id)
        : null;

      const matchesSearch =
        !normalizedSearch ||
        project?.clinic_name
          .toLowerCase()
          .includes(normalizedSearch) ||
        deficiency?.description
          .toLowerCase()
          .includes(normalizedSearch) ||
        room?.room_name
          .toLowerCase()
          .includes(normalizedSearch) ||
        deficiency?.trade
          ?.toLowerCase()
          .includes(normalizedSearch) ||
        photo.caption
          ?.toLowerCase()
          .includes(normalizedSearch);

      const matchesClinic =
        clinicFilter === "All" ||
        photo.project_id === clinicFilter;

      const matchesType =
        typeFilter === "All" ||
        photo.photo_type === typeFilter;

      return matchesSearch && matchesClinic && matchesType;
    });
  }, [
    clinicFilter,
    deficiencyById,
    photos,
    projectById,
    roomById,
    search,
    typeFilter,
  ]);

  const originalCount = photos.filter(
    (photo) => photo.photo_type === "Original",
  ).length;

  const correctionCount = photos.filter(
    (photo) => photo.photo_type === "Correction",
  ).length;

  const verificationCount = photos.filter(
    (photo) => photo.photo_type === "Verification",
  ).length;

  return (
    <AppShell>
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-[#238bac]">
          Construction documentation
        </p>

        <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#374151]">
          Photo Gallery
        </h1>

        <p className="mt-2 text-slate-600">
          Review original, correction, and verification photos from
          every clinic.
        </p>
      </div>

      <section className="mt-7 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <SummaryCard
          label="All Photos"
          value={photos.length}
          icon={Camera}
          color="bg-[#238bac]"
        />

        <SummaryCard
          label="Original"
          value={originalCount}
          icon={TriangleAlert}
          color="bg-[#f04c37]"
        />

        <SummaryCard
          label="Correction"
          value={correctionCount}
          icon={ImageIcon}
          color="bg-amber-500"
        />

        <SummaryCard
          label="Verification"
          value={verificationCount}
          icon={CheckCircle2}
          color="bg-[#04b0b9]"
        />
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-[1fr_240px_220px]">
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
                placeholder="Search clinic, room, trade, or deficiency"
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-[#238bac]"
              />
            </div>
          </div>

          <div>
            <FilterLabel>Clinic</FilterLabel>

            <select
              value={clinicFilter}
              onChange={(event) =>
                setClinicFilter(event.target.value)
              }
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#238bac]"
            >
              <option value="All">All Clinics</option>

              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.clinic_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <FilterLabel>Photo Type</FilterLabel>

            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(event.target.value)
              }
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#238bac]"
            >
              {photoTypes.map((type) => (
                <option key={type} value={type}>
                  {type === "All" ? "All Photo Types" : type}
                </option>
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
      ) : filteredPhotos.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <ImageIcon
            className="mx-auto text-slate-400"
            size={40}
          />

          <h2 className="mt-4 text-lg font-bold text-[#374151]">
            No photos found
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            No photos match the selected filters.
          </p>
        </div>
      ) : (
        <section className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredPhotos.map((photo) => {
            const project = projectById.get(photo.project_id);
            const deficiency = deficiencyById.get(
              photo.deficiency_id,
            );

            const room = deficiency?.room_id
              ? roomById.get(deficiency.room_id)
              : null;

            return (
              <article
                key={photo.id}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => setSelectedPhoto(photo)}
                  className="relative block aspect-[4/3] w-full overflow-hidden bg-slate-100"
                >
                  {photo.signedUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photo.signedUrl}
                      alt={
                        photo.caption ||
                        deficiency?.description ||
                        "Construction photo"
                      }
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-400">
                      <ImageIcon size={34} />
                    </div>
                  )}

                  <span
                    className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold shadow-sm ${photoTypeStyle(
                      photo.photo_type,
                    )}`}
                  >
                    {photo.photo_type}
                  </span>
                </button>

                <div className="p-4">
                  <h2 className="line-clamp-2 font-bold leading-6 text-[#374151]">
                    {deficiency?.description ||
                      "Construction photo"}
                  </h2>

                  <div className="mt-3 space-y-2 text-sm text-slate-500">
                    <div className="flex items-center gap-2">
                      <Building2
                        className="shrink-0 text-[#238bac]"
                        size={16}
                      />

                      <span className="truncate font-semibold">
                        {project?.clinic_name ||
                          "Unknown clinic"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin
                        className="shrink-0 text-[#238bac]"
                        size={16}
                      />

                      <span className="truncate">
                        {room?.room_name || "No room assigned"}
                      </span>
                    </div>
                  </div>

                  {photo.caption && (
                    <p className="mt-3 line-clamp-2 text-sm leading-5 text-slate-500">
                      {photo.caption}
                    </p>
                  )}

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-xs text-slate-400">
                      {formatDate(photo.created_at)}
                    </span>

                    <Link
                      href={`/projects/${photo.project_id}/deficiencies`}
                      className="inline-flex items-center gap-1 text-sm font-bold text-[#238bac]"
                    >
                      Deficiency
                      <ArrowRight size={15} />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {selectedPhoto && (
        <PhotoModal
          photo={selectedPhoto}
          project={projectById.get(selectedPhoto.project_id)}
          deficiency={deficiencyById.get(
            selectedPhoto.deficiency_id,
          )}
          room={
            deficiencyById.get(selectedPhoto.deficiency_id)
              ?.room_id
              ? roomById.get(
                  deficiencyById.get(
                    selectedPhoto.deficiency_id,
                  )!.room_id!,
                )
              : undefined
          }
          onClose={() => setSelectedPhoto(null)}
        />
      )}
    </AppShell>
  );
}

type PhotoModalProps = {
  photo: Photo;
  project?: Project;
  deficiency?: Deficiency;
  room?: Room;
  onClose: () => void;
};

function PhotoModal({
  photo,
  project,
  deficiency,
  room,
  onClose,
}: PhotoModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[95vh] w-full max-w-5xl overflow-auto rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-4">
          <div>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${photoTypeStyle(
                photo.photo_type,
              )}`}
            >
              {photo.photo_type}
            </span>

            <h2 className="mt-2 font-bold text-[#374151]">
              {deficiency?.description || "Construction photo"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {project?.clinic_name}
              {room?.room_name ? ` · ${room.room_name}` : ""}
            </p>
          </div>

          <button
            type="button"
            aria-label="Close photo"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
          >
            <X size={20} />
          </button>
        </div>

        <div className="bg-slate-950 p-4">
          {photo.signedUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo.signedUrl}
              alt={
                photo.caption ||
                deficiency?.description ||
                "Construction photo"
              }
              className="mx-auto max-h-[70vh] w-auto max-w-full object-contain"
            />
          ) : (
            <div className="flex min-h-80 items-center justify-center text-slate-400">
              <ImageIcon size={40} />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {photo.caption && (
              <p className="text-sm text-slate-600">
                {photo.caption}
              </p>
            )}

            <p className="mt-1 text-xs text-slate-400">
              Uploaded {formatDate(photo.created_at)}
            </p>
          </div>

          <Link
            href={`/projects/${photo.project_id}/deficiencies`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#238bac] px-4 text-sm font-bold text-white"
          >
            Open Deficiency Log
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function photoTypeStyle(photoType: Photo["photo_type"]) {
  const styles = {
    Original: "bg-red-100 text-red-700",
    Correction: "bg-amber-100 text-amber-800",
    Verification: "bg-emerald-100 text-emerald-700",
  };

  return styles[photoType];
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