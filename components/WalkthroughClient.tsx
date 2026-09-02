"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  LoaderCircle,
  Minus,
  Save,
  TriangleAlert,
  Camera,
ImagePlus,
X,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

type WalkthroughClientProps = {
  projectId: string;
  initialRoomId: string | null;
};

type Project = {
  id: string;
  clinic_name: string;
};

type Room = {
  id: string;
  room_name: string;
  room_type: string;
  sort_order: number;
};

type ChecklistItem = {
  id: string;
  room_id: string;
  item_title: string;
  measurable_standard: string | null;
  default_trade: string | null;
  status: "Not Reviewed" | "Passed" | "Deficiency" | "N/A";
  notes: string | null;
  photo_required: boolean;
  sort_order: number;
};

type DeficiencyForm = {
  description: string;
  trade: string;
  priority: "Low" | "Normal" | "High" | "Critical";
  due_date: string;
};

type PendingPhoto = {
  id: string;
  file: File;
  previewUrl: string;
};

const emptyDeficiency: DeficiencyForm = {
  description: "",
  trade: "",
  priority: "Normal",
  due_date: "",
};

export default function WalkthroughClient({
  projectId,
  initialRoomId,
}: WalkthroughClientProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState(
    initialRoomId ?? "",
  );

  const [expandedItemId, setExpandedItemId] = useState<string | null>(
    null,
  );

  const [deficiencyItemId, setDeficiencyItemId] = useState<
    string | null
  >(null);

  const [deficiencyForm, setDeficiencyForm] =
    useState<DeficiencyForm>(emptyDeficiency);

  const [isLoading, setIsLoading] = useState(true);
  const [savingItemId, setSavingItemId] = useState<string | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState("");

  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>(
  [],
);

  const loadWalkthrough = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    const [
      { data: projectData, error: projectError },
      { data: roomData, error: roomError },
      { data: itemData, error: itemError },
    ] = await Promise.all([
      supabase
        .from("projects")
        .select("id, clinic_name")
        .eq("id", projectId)
        .single(),

      supabase
        .from("project_rooms")
        .select("id, room_name, room_type, sort_order")
        .eq("project_id", projectId)
        .order("sort_order"),

      supabase
        .from("project_checklist_items")
        .select(
          "id, room_id, item_title, measurable_standard, default_trade, status, notes, photo_required, sort_order",
        )
        .eq("project_id", projectId)
        .order("sort_order"),
    ]);

    if (projectError || roomError || itemError) {
      setErrorMessage(
        projectError?.message ||
          roomError?.message ||
          itemError?.message ||
          "Unable to load the walkthrough.",
      );
      setIsLoading(false);
      return;
    }

    const loadedRooms = (roomData ?? []) as Room[];

    setProject(projectData as Project);
    setRooms(loadedRooms);
    setItems((itemData ?? []) as ChecklistItem[]);

    setSelectedRoomId((current) => {
      if (
        current &&
        loadedRooms.some((room) => room.id === current)
      ) {
        return current;
      }

      return loadedRooms[0]?.id ?? "";
    });

    setIsLoading(false);
  }, [projectId]);

  useEffect(() => {
    void loadWalkthrough();
  }, [loadWalkthrough]);

  const selectedRoom = rooms.find(
    (room) => room.id === selectedRoomId,
  );

  const selectedItems = useMemo(
    () =>
      items.filter((item) => item.room_id === selectedRoomId),
    [items, selectedRoomId],
  );

  const reviewedCount = selectedItems.filter(
    (item) => item.status !== "Not Reviewed",
  ).length;

  const passedCount = selectedItems.filter(
    (item) => item.status === "Passed",
  ).length;

  const deficiencyCount = selectedItems.filter(
    (item) => item.status === "Deficiency",
  ).length;

  const roomProgress =
    selectedItems.length > 0
      ? Math.round((reviewedCount / selectedItems.length) * 100)
      : 0;

  async function updateItemStatus(
    itemId: string,
    status: "Passed" | "N/A",
  ) {
    setSavingItemId(itemId);
    setErrorMessage("");

    const { error } = await supabase
      .from("project_checklist_items")
      .update({
        status,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", itemId);

    if (error) {
      setErrorMessage(error.message);
      setSavingItemId(null);
      return;
    }

    setItems((current) =>
      current.map((item) =>
        item.id === itemId ? { ...item, status } : item,
      ),
    );

    setDeficiencyItemId(null);
    setSavingItemId(null);
  }

  function addPhotos(files: FileList | null) {
  if (!files) return;

  const newPhotos: PendingPhoto[] = [];

  for (const file of Array.from(files)) {
    if (
      file.type &&
      !file.type.startsWith("image/")
    ) {
      setErrorMessage(`${file.name} is not an image.`);
      continue;
    }

    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage(
        `${file.name} is larger than the 15 MB photo limit.`,
      );
      continue;
    }

    newPhotos.push({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    });
  }

  setPendingPhotos((current) => [...current, ...newPhotos]);
}

function removePendingPhoto(photoId: string) {
  setPendingPhotos((current) => {
    const photo = current.find((item) => item.id === photoId);

    if (photo) {
      URL.revokeObjectURL(photo.previewUrl);
    }

    return current.filter((item) => item.id !== photoId);
  });
}

function clearPendingPhotos() {
  pendingPhotos.forEach((photo) => {
    URL.revokeObjectURL(photo.previewUrl);
  });

  setPendingPhotos([]);
}

 function openDeficiency(item: ChecklistItem) {
  clearPendingPhotos();
  setDeficiencyItemId(item.id);
    setExpandedItemId(item.id);

    setDeficiencyForm({
      description: item.notes || item.item_title,
      trade: item.default_trade || "General Contractor",
      priority: "Normal",
      due_date: "",
    });
  }

  async function saveDeficiency(
  event: FormEvent<HTMLFormElement>,
  item: ChecklistItem,
) {
  event.preventDefault();

  if (!deficiencyForm.description.trim()) {
    setErrorMessage("Enter a description for the deficiency.");
    return;
  }

  setSavingItemId(item.id);
  setErrorMessage("");

  const { data: deficiency, error: deficiencyError } =
    await supabase
      .from("deficiencies")
      .insert({
        project_id: projectId,
        room_id: item.room_id,
        checklist_item_id: item.id,
        description: deficiencyForm.description.trim(),
        trade:
          deficiencyForm.trade.trim() || "General Contractor",
        priority: deficiencyForm.priority,
        status: "Open",
        due_date: deficiencyForm.due_date || null,
      })
      .select("id")
      .single();

  if (deficiencyError || !deficiency) {
    setErrorMessage(
      deficiencyError?.message ||
        "Unable to create the deficiency.",
    );
    setSavingItemId(null);
    return;
  }

  const uploadedPaths: string[] = [];
  const photoRecords: {
    deficiency_id: string;
    project_id: string;
    storage_path: string;
    photo_type: string;
    caption: string;
  }[] = [];

  for (const photo of pendingPhotos) {
    const safeFileName = photo.file.name
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .toLowerCase();

    const storagePath =
      `${projectId}/${deficiency.id}/` +
      `${crypto.randomUUID()}-${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from("punch-photos")
      .upload(storagePath, photo.file, {
        cacheControl: "3600",
        contentType: photo.file.type || undefined,
        upsert: false,
      });

    if (uploadError) {
      if (uploadedPaths.length > 0) {
        await supabase.storage
          .from("punch-photos")
          .remove(uploadedPaths);
      }

      await supabase
        .from("deficiencies")
        .delete()
        .eq("id", deficiency.id);

      setErrorMessage(
        `Photo upload failed: ${uploadError.message}`,
      );
      setSavingItemId(null);
      return;
    }

    uploadedPaths.push(storagePath);

    photoRecords.push({
      deficiency_id: deficiency.id,
      project_id: projectId,
      storage_path: storagePath,
      photo_type: "Original",
      caption: deficiencyForm.description.trim(),
    });
  }

  if (photoRecords.length > 0) {
    const { error: photoRecordError } = await supabase
      .from("deficiency_photos")
      .insert(photoRecords);

    if (photoRecordError) {
      await supabase.storage
        .from("punch-photos")
        .remove(uploadedPaths);

      await supabase
        .from("deficiencies")
        .delete()
        .eq("id", deficiency.id);

      setErrorMessage(
        `Photo record failed: ${photoRecordError.message}`,
      );
      setSavingItemId(null);
      return;
    }
  }

  const { error: checklistError } = await supabase
    .from("project_checklist_items")
    .update({
      status: "Deficiency",
      notes: deficiencyForm.description.trim(),
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", item.id);

  if (checklistError) {
    setErrorMessage(checklistError.message);
    setSavingItemId(null);
    return;
  }

  setItems((current) =>
    current.map((currentItem) =>
      currentItem.id === item.id
        ? {
            ...currentItem,
            status: "Deficiency",
            notes: deficiencyForm.description.trim(),
          }
        : currentItem,
    ),
  );

  clearPendingPhotos();
  setDeficiencyItemId(null);
  setDeficiencyForm(emptyDeficiency);
  setSavingItemId(null);
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

        <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-[#238bac]">
              Field walkthrough
            </p>

            <h1 className="mt-1 text-3xl font-bold text-[#374151]">
              {project?.clinic_name}
            </h1>

            <p className="mt-2 text-slate-600">
              Review each requirement and record any deficiencies.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between gap-8 text-sm">
              <span className="font-medium text-slate-500">
                Overall room progress
              </span>
              <span className="font-bold text-[#238bac]">
                {roomProgress}%
              </span>
            </div>

            <div className="mt-2 h-2 w-full min-w-52 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[#04b0b9] transition-all"
                style={{ width: `${roomProgress}%` }}
              />
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="mt-7 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside>
            <label className="mb-2 block text-sm font-bold text-slate-700 lg:hidden">
              Walkthrough Area
            </label>

            <select
              value={selectedRoomId}
              onChange={(event) => {
                setSelectedRoomId(event.target.value);
                setDeficiencyItemId(null);
                setExpandedItemId(null);
              }}
              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold outline-none focus:border-[#238bac] lg:hidden"
            >
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.room_name}
                </option>
              ))}
            </select>

            <div className="hidden space-y-2 lg:block">
              {rooms.map((room) => {
                const roomItems = items.filter(
                  (item) => item.room_id === room.id,
                );

                const completed = roomItems.filter(
                  (item) => item.status !== "Not Reviewed",
                ).length;

                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => {
                      setSelectedRoomId(room.id);
                      setDeficiencyItemId(null);
                      setExpandedItemId(null);
                    }}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                      selectedRoomId === room.id
                        ? "border-[#238bac] bg-[#238bac] text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-[#238bac]/40"
                    }`}
                  >
                    <p className="text-sm font-bold">
                      {room.room_name}
                    </p>

                    <p
                      className={`mt-1 text-xs ${
                        selectedRoomId === room.id
                          ? "text-white/75"
                          : "text-slate-400"
                      }`}
                    >
                      {completed} of {roomItems.length} reviewed
                    </p>
                  </button>
                );
              })}
            </div>
          </aside>

          <section>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-[#374151]">
                    {selectedRoom?.room_name}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {reviewedCount} of {selectedItems.length} reviewed
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 text-xs font-bold">
                  <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">
                    {passedCount} Passed
                  </span>

                  <span className="rounded-full bg-red-50 px-3 py-1.5 text-[#f04c37]">
                    {deficiencyCount} Deficiencies
                  </span>

                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-600">
                    {selectedItems.length - reviewedCount} Remaining
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {selectedItems.map((item, index) => {
                const expanded = expandedItemId === item.id;
                const creatingDeficiency =
                  deficiencyItemId === item.id;
                const isSaving = savingItemId === item.id;

                return (
                  <article
                    key={item.id}
                    className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${
                      item.status === "Passed"
                        ? "border-emerald-200"
                        : item.status === "Deficiency"
                          ? "border-red-200"
                          : item.status === "N/A"
                            ? "border-slate-300"
                            : "border-slate-200"
                    }`}
                  >
                    <div className="p-5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                          {index + 1}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <h3 className="font-bold leading-6 text-[#374151]">
                              {item.item_title}
                            </h3>

                            <StatusBadge status={item.status} />
                          </div>

                          {item.measurable_standard && (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedItemId(
                                  expanded ? null : item.id,
                                )
                              }
                              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#238bac]"
                            >
                              {expanded ? (
                                <>
                                  Hide Standard
                                  <ChevronUp size={16} />
                                </>
                              ) : (
                                <>
                                  View Standard
                                  <ChevronDown size={16} />
                                </>
                              )}
                            </button>
                          )}

                          {expanded && item.measurable_standard && (
                            <div className="mt-3 rounded-xl border border-[#238bac]/15 bg-[#238bac]/5 p-4 text-sm leading-6 text-slate-700">
                              {item.measurable_standard}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() =>
                            void updateItemStatus(item.id, "Passed")
                          }
                          className={`inline-flex min-h-12 items-center justify-center gap-1 rounded-xl border px-2 text-sm font-bold transition ${
                            item.status === "Passed"
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          }`}
                        >
                          <Check size={18} />
                          Pass
                        </button>

                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => openDeficiency(item)}
                          className={`inline-flex min-h-12 items-center justify-center gap-1 rounded-xl border px-2 text-sm font-bold transition ${
                            item.status === "Deficiency"
                              ? "border-[#f04c37] bg-[#f04c37] text-white"
                              : "border-red-200 bg-red-50 text-[#f04c37] hover:bg-red-100"
                          }`}
                        >
                          <TriangleAlert size={17} />
                          Deficiency
                        </button>

                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() =>
                            void updateItemStatus(item.id, "N/A")
                          }
                          className={`inline-flex min-h-12 items-center justify-center gap-1 rounded-xl border px-2 text-sm font-bold transition ${
                            item.status === "N/A"
                              ? "border-slate-600 bg-slate-600 text-white"
                              : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          <Minus size={18} />
                          N/A
                        </button>
                      </div>
                    </div>

                    {creatingDeficiency && (
                      <form
                        onSubmit={(event) =>
                          void saveDeficiency(event, item)
                        }
                        className="border-t border-red-100 bg-red-50/50 p-5"
                      >
                        <div className="flex items-center gap-2 text-[#f04c37]">
                          <CircleAlert size={19} />
                          <h4 className="font-bold">
                            Record Deficiency
                          </h4>
                        </div>

                        <div className="mt-4">
                          <label className="mb-2 block text-sm font-semibold text-slate-700">
                            Description
                          </label>

                          <textarea
                            required
                            rows={3}
                            value={deficiencyForm.description}
                            onChange={(event) =>
                              setDeficiencyForm((current) => ({
                                ...current,
                                description: event.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-[#238bac]"
                          />
                        </div>

<div className="mt-4">
  <label className="mb-2 block text-sm font-semibold text-slate-700">
    Deficiency Photos
  </label>

  <div className="grid gap-3 sm:grid-cols-2">
    <label className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#238bac] px-4 font-bold text-white transition hover:bg-[#0086aa]">
      <Camera size={19} />
      Take Photo

      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          addPhotos(event.target.files);
          event.target.value = "";
        }}
      />
    </label>

    <label className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#238bac] bg-white px-4 font-bold text-[#238bac] transition hover:bg-[#238bac]/5">
      <ImagePlus size={19} />
      Choose Photos

      <input
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          addPhotos(event.target.files);
          event.target.value = "";
        }}
      />
    </label>
  </div>

  {pendingPhotos.length > 0 && (
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {pendingPhotos.map((photo) => (
        <div
          key={photo.id}
          className="relative overflow-hidden rounded-xl border border-slate-200 bg-white"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.previewUrl}
            alt="Deficiency preview"
            className="aspect-square w-full object-cover"
          />

          <button
            type="button"
            aria-label="Remove photo"
            onClick={() => removePendingPhoto(photo.id)}
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/75 text-white"
          >
            <X size={16} />
          </button>

          <p className="truncate px-2 py-2 text-xs text-slate-500">
            {photo.file.name}
          </p>
        </div>
      ))}
    </div>
  )}

  <p className="mt-2 text-xs text-slate-500">
    Photos are optional. Each image may be up to 15 MB.
  </p>
</div>

                        <div className="mt-4 grid gap-4 sm:grid-cols-3">
                          <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">
                              Trade
                            </label>

                            <input
                              value={deficiencyForm.trade}
                              onChange={(event) =>
                                setDeficiencyForm((current) => ({
                                  ...current,
                                  trade: event.target.value,
                                }))
                              }
                              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-[#238bac]"
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">
                              Priority
                            </label>

                            <select
                              value={deficiencyForm.priority}
                              onChange={(event) =>
                                setDeficiencyForm((current) => ({
                                  ...current,
                                  priority: event.target
                                    .value as DeficiencyForm["priority"],
                                }))
                              }
                              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-[#238bac]"
                            >
                              <option>Low</option>
                              <option>Normal</option>
                              <option>High</option>
                              <option>Critical</option>
                            </select>
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">
                              Due Date
                            </label>

                            <input
                              type="date"
                              value={deficiencyForm.due_date}
                              onChange={(event) =>
                                setDeficiencyForm((current) => ({
                                  ...current,
                                  due_date: event.target.value,
                                }))
                              }
                              className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-[#238bac]"
                            />
                          </div>
                        </div>

                        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                          <button
                            type="button"
                            onClick={() => {
  clearPendingPhotos();
  setDeficiencyItemId(null);
}}
                            className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700"
                          >
                            Cancel
                          </button>

                          <button
                            type="submit"
                            disabled={isSaving}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#f04c37] px-5 text-sm font-bold text-white disabled:opacity-60"
                          >
                            {isSaving ? (
                              <LoaderCircle
                                className="animate-spin"
                                size={17}
                              />
                            ) : (
                              <Save size={17} />
                            )}
                            Save Deficiency
                          </button>
                        </div>
                      </form>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function StatusBadge({
  status,
}: {
  status: ChecklistItem["status"];
}) {
  if (status === "Passed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
        <CheckCircle2 size={14} />
        Passed
      </span>
    );
  }

  if (status === "Deficiency") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-[#f04c37]">
        <TriangleAlert size={14} />
        Deficiency
      </span>
    );
  }

  if (status === "N/A") {
    return (
      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
        N/A
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
      <CircleAlert size={14} />
      Not Reviewed
    </span>
  );
}