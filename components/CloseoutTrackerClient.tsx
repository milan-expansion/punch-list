"use client";

import Link from "next/link";
import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileCheck2,
  FileText,
  LoaderCircle,
  Paperclip,
  Save,
  Upload,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

type CloseoutTrackerClientProps = {
  projectId: string;
};

type Project = {
  id: string;
  clinic_name: string;
};

type CloseoutItem = {
  id: string;
  project_id: string;
  category: string;
  item_name: string;
  description: string | null;
  status: "Missing" | "Received" | "N/A";
  notes: string | null;
  received_by: string | null;
  received_at: string | null;
  sort_order: number;
};

type ProjectDocument = {
  id: string;
  closeout_item_id: string | null;
  document_name: string;
  document_type: string | null;
  storage_path: string;
  created_at: string;
  signedUrl?: string;
};

export default function CloseoutTrackerClient({
  projectId,
}: CloseoutTrackerClientProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [items, setItems] = useState<CloseoutItem[]>([]);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadCloseout = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    const [
      { data: projectData, error: projectError },
      { data: itemData, error: itemError },
      { data: documentData, error: documentError },
    ] = await Promise.all([
      supabase
        .from("projects")
        .select("id, clinic_name")
        .eq("id", projectId)
        .single(),

      supabase
        .from("project_closeout_items")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order"),

      supabase
        .from("project_documents")
        .select(
          "id, closeout_item_id, document_name, document_type, storage_path, created_at",
        )
        .eq("project_id", projectId)
        .order("created_at"),
    ]);

    if (projectError || itemError || documentError) {
      setErrorMessage(
        projectError?.message ||
          itemError?.message ||
          documentError?.message ||
          "Unable to load closeout requirements.",
      );
      setIsLoading(false);
      return;
    }

    const loadedDocuments =
      (documentData ?? []) as ProjectDocument[];

    const documentsWithUrls = await Promise.all(
      loadedDocuments.map(async (document) => {
        const { data } = await supabase.storage
          .from("project-documents")
          .createSignedUrl(document.storage_path, 3600);

        return {
          ...document,
          signedUrl: data?.signedUrl,
        };
      }),
    );

    setProject(projectData as Project);
    setItems((itemData ?? []) as CloseoutItem[]);
    setDocuments(documentsWithUrls);
    setIsLoading(false);
  }, [projectId]);

  useEffect(() => {
    void loadCloseout();
  }, [loadCloseout]);

  const categories = useMemo(
    () => Array.from(new Set(items.map((item) => item.category))),
    [items],
  );

  const receivedCount = items.filter(
    (item) => item.status === "Received",
  ).length;

  const missingCount = items.filter(
    (item) => item.status === "Missing",
  ).length;

  const notApplicableCount = items.filter(
    (item) => item.status === "N/A",
  ).length;

  const completedCount = receivedCount + notApplicableCount;

  const progress =
    items.length > 0
      ? Math.round((completedCount / items.length) * 100)
      : 0;

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

        <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-[#238bac]">
              Project completion
            </p>

            <h1 className="mt-1 text-3xl font-bold text-[#374151]">
              Closeout Documents
            </h1>

            <p className="mt-2 text-slate-600">
              {project?.clinic_name}
            </p>
          </div>

          <div className="min-w-64 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-500">
                Closeout Progress
              </span>

              <span className="text-lg font-bold text-[#238bac]">
                {progress}%
              </span>
            </div>

            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[#04b0b9] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>

            <p className="mt-2 text-xs text-slate-500">
              {completedCount} of {items.length} requirements complete
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {errorMessage}
          </div>
        )}

        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Requirements"
            value={items.length}
            icon={FileCheck2}
            color="bg-[#238bac]"
          />

          <SummaryCard
            label="Received"
            value={receivedCount}
            icon={CheckCircle2}
            color="bg-[#04b0b9]"
          />

          <SummaryCard
            label="Missing"
            value={missingCount}
            icon={Clock3}
            color="bg-[#f04c37]"
          />

          <SummaryCard
            label="Not Applicable"
            value={notApplicableCount}
            icon={FileText}
            color="bg-slate-500"
          />
        </section>

        <div className="mt-7 space-y-7">
          {categories.map((category) => {
            const categoryItems = items.filter(
              (item) => item.category === category,
            );

            const categoryComplete = categoryItems.filter(
              (item) => item.status !== "Missing",
            ).length;

            return (
              <section
                key={category}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="flex flex-col gap-2 border-b border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-[#374151]">
                      {category}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      {categoryComplete} of {categoryItems.length} complete
                    </p>
                  </div>

                  <span className="text-sm font-bold text-[#238bac]">
                    {categoryItems.length > 0
                      ? Math.round(
                          (categoryComplete /
                            categoryItems.length) *
                            100,
                        )
                      : 0}
                    %
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {categoryItems.map((item) => (
                    <CloseoutItemCard
                      key={item.id}
                      item={item}
                      projectId={projectId}
                      documents={documents.filter(
                        (document) =>
                          document.closeout_item_id === item.id,
                      )}
                      onComplete={loadCloseout}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}

type CloseoutItemCardProps = {
  item: CloseoutItem;
  projectId: string;
  documents: ProjectDocument[];
  onComplete: () => Promise<void> | void;
};

function CloseoutItemCard({
  item,
  projectId,
  documents,
  onComplete,
}: CloseoutItemCardProps) {
  const [status, setStatus] = useState(item.status);
  const [notes, setNotes] = useState(item.notes ?? "");
  const [selectedFile, setSelectedFile] = useState<File | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function saveStatusAndNotes() {
    setIsSaving(true);
    setErrorMessage("");

    const { error } = await supabase
      .from("project_closeout_items")
      .update({
        status,
        notes: notes.trim() || null,
        received_at:
          status === "Received"
            ? item.received_at || new Date().toISOString()
            : null,
      })
      .eq("id", item.id);

    if (error) {
      setErrorMessage(error.message);
      setIsSaving(false);
      return;
    }

    await onComplete();
    setIsSaving(false);
  }

  function selectDocument(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0] ?? null;

    if (file && file.size > 25 * 1024 * 1024) {
      setErrorMessage(
        `${file.name} is larger than the 25 MB limit.`,
      );
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
    setErrorMessage("");
  }

  async function uploadDocument() {
    if (!selectedFile) {
      setErrorMessage("Choose a document to upload.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    const safeFileName = selectedFile.name
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .toLowerCase();

    const storagePath =
      `${projectId}/${item.id}/` +
      `${crypto.randomUUID()}-${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from("project-documents")
      .upload(storagePath, selectedFile, {
        cacheControl: "3600",
        contentType: selectedFile.type || undefined,
        upsert: false,
      });

    if (uploadError) {
      setErrorMessage(uploadError.message);
      setIsSaving(false);
      return;
    }

    const { error: documentError } = await supabase
      .from("project_documents")
      .insert({
        project_id: projectId,
        closeout_item_id: item.id,
        document_name: selectedFile.name,
        document_type: selectedFile.type || null,
        storage_path: storagePath,
      });

    if (documentError) {
      await supabase.storage
        .from("project-documents")
        .remove([storagePath]);

      setErrorMessage(documentError.message);
      setIsSaving(false);
      return;
    }

    const { error: statusError } = await supabase
      .from("project_closeout_items")
      .update({
        status: "Received",
        notes: notes.trim() || null,
        received_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    if (statusError) {
      setErrorMessage(statusError.message);
      setIsSaving(false);
      return;
    }

    setSelectedFile(null);
    setStatus("Received");
    await onComplete();
    setIsSaving(false);
  }

  return (
    <article className="p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold leading-6 text-[#374151]">
              {item.item_name}
            </h3>

            <StatusBadge status={item.status} />
          </div>

          {item.description && (
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {item.description}
            </p>
          )}

          {documents.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {documents.map((document) => (
                <a
                  key={document.id}
                  href={document.signedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-[#238bac] hover:border-[#238bac]/40"
                >
                  <Paperclip size={14} />
                  <span className="max-w-52 truncate">
                    {document.document_name}
                  </span>
                  <ExternalLink size={13} />
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="w-full xl:w-72">
          <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
            Status
          </label>

          <select
            value={status}
            onChange={(event) =>
              setStatus(
                event.target.value as CloseoutItem["status"],
              )
            }
            className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold outline-none focus:border-[#238bac]"
          >
            <option>Missing</option>
            <option>Received</option>
            <option>N/A</option>
          </select>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto]">
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
            Notes
          </label>

          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={2}
            placeholder="Add closeout notes."
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-[#238bac]"
          />
        </div>

        <button
          type="button"
          disabled={isSaving}
          onClick={() => void saveStatusAndNotes()}
          className="inline-flex min-h-11 items-center justify-center gap-2 self-end rounded-xl border border-[#238bac] bg-white px-4 text-sm font-bold text-[#238bac] disabled:opacity-60"
        >
          {isSaving ? (
            <LoaderCircle className="animate-spin" size={17} />
          ) : (
            <Save size={17} />
          )}
          Save
        </button>
      </div>

      <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-400">
          Upload Document
        </label>

        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex min-h-11 flex-1 cursor-pointer items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-600">
            <FileText size={18} className="shrink-0 text-[#238bac]" />

            <span className="truncate">
              {selectedFile?.name || "Choose a document"}
            </span>

            <input
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
              onChange={selectDocument}
              className="hidden"
            />
          </label>

          <button
            type="button"
            disabled={!selectedFile || isSaving}
            onClick={() => void uploadDocument()}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#238bac] px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? (
              <LoaderCircle className="animate-spin" size={17} />
            ) : (
              <Upload size={17} />
            )}
            Upload
          </button>
        </div>

        <p className="mt-2 text-xs text-slate-500">
          PDF, Word, Excel, or image files up to 25 MB.
        </p>
      </div>

      {errorMessage && (
        <p className="mt-3 text-sm font-medium text-red-600">
          {errorMessage}
        </p>
      )}
    </article>
  );
}

function StatusBadge({
  status,
}: {
  status: CloseoutItem["status"];
}) {
  const styles = {
    Missing: "bg-red-50 text-[#f04c37]",
    Received: "bg-emerald-50 text-emerald-700",
    "N/A": "bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-bold ${styles[status]}`}
    >
      {status}
    </span>
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