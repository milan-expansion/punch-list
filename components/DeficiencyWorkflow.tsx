"use client";

import { FormEvent, useState } from "react";
import {
  Camera,
  CheckCircle2,
  ImagePlus,
  LoaderCircle,
  RotateCcw,
  Send,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type DeficiencyStatus =
  | "Open"
  | "Correction Submitted"
  | "Milan Verified"
  | "Closed";

type DeficiencyWorkflowProps = {
  deficiencyId: string;
  projectId: string;
  status: DeficiencyStatus;
  onComplete: () => Promise<void> | void;
};

type PendingPhoto = {
  id: string;
  file: File;
  previewUrl: string;
};

export default function DeficiencyWorkflow({
  deficiencyId,
  projectId,
  status,
  onComplete,
}: DeficiencyWorkflowProps) {
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [notes, setNotes] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const isCorrection = status === "Open";
  const isVerification = status === "Correction Submitted";

  function addPhotos(files: FileList | null) {
    if (!files) return;

    const newPhotos: PendingPhoto[] = [];

    for (const file of Array.from(files)) {
      if (file.type && !file.type.startsWith("image/")) {
        setErrorMessage(`${file.name} is not an image.`);
        continue;
      }

      if (file.size > 15 * 1024 * 1024) {
        setErrorMessage(
          `${file.name} is larger than the 15 MB limit.`,
        );
        continue;
      }

      newPhotos.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    setPhotos((current) => [...current, ...newPhotos]);
  }

  function removePhoto(photoId: string) {
    setPhotos((current) => {
      const selectedPhoto = current.find(
        (photo) => photo.id === photoId,
      );

      if (selectedPhoto) {
        URL.revokeObjectURL(selectedPhoto.previewUrl);
      }

      return current.filter((photo) => photo.id !== photoId);
    });
  }

  function clearForm() {
    photos.forEach((photo) =>
      URL.revokeObjectURL(photo.previewUrl),
    );

    setPhotos([]);
    setNotes("");
    setIsOpen(false);
    setErrorMessage("");
  }

  async function uploadWorkflowPhotos(
    photoType: "Correction" | "Verification",
  ) {
    const uploadedPaths: string[] = [];

    for (const photo of photos) {
      const safeFileName = photo.file.name
        .replace(/[^a-zA-Z0-9._-]/g, "-")
        .toLowerCase();

      const storagePath =
        `${projectId}/${deficiencyId}/` +
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

        throw new Error(uploadError.message);
      }

      uploadedPaths.push(storagePath);
    }

    const photoRecords = uploadedPaths.map((storagePath) => ({
      deficiency_id: deficiencyId,
      project_id: projectId,
      storage_path: storagePath,
      photo_type: photoType,
      caption: notes.trim() || null,
    }));

    const { error: recordError } = await supabase
      .from("deficiency_photos")
      .insert(photoRecords);

    if (recordError) {
      await supabase.storage
        .from("punch-photos")
        .remove(uploadedPaths);

      throw new Error(recordError.message);
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (photos.length === 0) {
      setErrorMessage(
        isCorrection
          ? "Add at least one correction photo."
          : "Add at least one verification photo.",
      );
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      if (isCorrection) {
        await uploadWorkflowPhotos("Correction");

        const { error } = await supabase
          .from("deficiencies")
          .update({
            status: "Correction Submitted",
            correction_notes: notes.trim() || null,
          })
          .eq("id", deficiencyId);

        if (error) throw new Error(error.message);
      }

      if (isVerification) {
        await uploadWorkflowPhotos("Verification");

        const { error } = await supabase
          .from("deficiencies")
          .update({
            status: "Milan Verified",
            verification_notes: notes.trim() || null,
            verified_at: new Date().toISOString(),
          })
          .eq("id", deficiencyId);

        if (error) throw new Error(error.message);
      }

      clearForm();
      await onComplete();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to update the deficiency.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function updateStatus(
    newStatus: "Open" | "Closed",
  ) {
    setIsSaving(true);
    setErrorMessage("");

    const { error } = await supabase
      .from("deficiencies")
      .update({
        status: newStatus,
        closed_at:
          newStatus === "Closed"
            ? new Date().toISOString()
            : null,
      })
      .eq("id", deficiencyId);

    if (error) {
      setErrorMessage(error.message);
      setIsSaving(false);
      return;
    }

    await onComplete();
    setIsSaving(false);
  }

  if (status === "Milan Verified") {
    return (
      <div className="border-t border-slate-100 p-5">
        <button
          type="button"
          disabled={isSaving}
          onClick={() => void updateStatus("Closed")}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#04b0b9] px-5 text-sm font-bold text-white disabled:opacity-60"
        >
          {isSaving ? (
            <LoaderCircle className="animate-spin" size={18} />
          ) : (
            <CheckCircle2 size={18} />
          )}
          Close Deficiency
        </button>

        {errorMessage && (
          <p className="mt-2 text-sm font-medium text-red-600">
            {errorMessage}
          </p>
        )}
      </div>
    );
  }

  if (status === "Closed") {
    return (
      <div className="border-t border-slate-100 p-5">
        <button
          type="button"
          disabled={isSaving}
          onClick={() => void updateStatus("Open")}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 disabled:opacity-60"
        >
          {isSaving ? (
            <LoaderCircle className="animate-spin" size={18} />
          ) : (
            <RotateCcw size={18} />
          )}
          Reopen Deficiency
        </button>

        {errorMessage && (
          <p className="mt-2 text-sm font-medium text-red-600">
            {errorMessage}
          </p>
        )}
      </div>
    );
  }

  if (!isOpen) {
    return (
      <div className="border-t border-slate-100 p-5">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold text-white ${
            isCorrection ? "bg-amber-500" : "bg-[#238bac]"
          }`}
        >
          {isCorrection ? (
            <>
              <Send size={18} />
              Submit Correction
            </>
          ) : (
            <>
              <CheckCircle2 size={18} />
              Verify Correction
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-slate-100 bg-slate-50 p-5"
    >
      <h3 className="font-bold text-[#374151]">
        {isCorrection
          ? "Submit Correction"
          : "Verify Correction"}
      </h3>

      <p className="mt-1 text-sm text-slate-500">
        {isCorrection
          ? "Upload photos showing the completed correction."
          : "Upload photos confirming Milan’s verification."}
      </p>

      {errorMessage && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#238bac] px-4 text-sm font-bold text-white">
          <Camera size={18} />
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

        <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#238bac] bg-white px-4 text-sm font-bold text-[#238bac]">
          <ImagePlus size={18} />
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

      {photos.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative overflow-hidden rounded-xl border border-slate-200 bg-white"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.previewUrl}
                alt="Upload preview"
                className="aspect-square w-full object-cover"
              />

              <button
                type="button"
                aria-label="Remove photo"
                onClick={() => removePhoto(photo.id)}
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/75 text-white"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Notes
        </label>

        <textarea
          rows={3}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder={
            isCorrection
              ? "Describe the completed correction."
              : "Enter Milan verification notes."
          }
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-[#238bac]"
        />
      </div>

      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          disabled={isSaving}
          onClick={clearForm}
          className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#238bac] px-5 text-sm font-bold text-white disabled:opacity-60"
        >
          {isSaving ? (
            <LoaderCircle className="animate-spin" size={18} />
          ) : (
            <Send size={18} />
          )}

          {isCorrection
            ? "Submit Correction"
            : "Complete Verification"}
        </button>
      </div>
    </form>
  );
}