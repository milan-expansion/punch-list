"use client";

import { useRef, useState } from "react";
import {
  Check,
  Eraser,
  LoaderCircle,
  PenLine,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type SignoffType = "General Contractor" | "Milan CPM";

type SignaturePadProps = {
  projectId: string;
  signoffType: SignoffType;
  onSaved: () => Promise<void> | void;
};

export default function SignaturePad({
  projectId,
  signoffType,
  onSaved,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  const [printedName, setPrintedName] = useState("");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState(
    signoffType === "Milan CPM"
      ? "Milan Laser Hair Removal"
      : "",
  );

  const [hasSignature, setHasSignature] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function getPosition(
    event: React.PointerEvent<HTMLCanvasElement>,
  ) {
    const canvas = canvasRef.current;

    if (!canvas) {
      return { x: 0, y: 0 };
    }

    const rectangle = canvas.getBoundingClientRect();

    return {
      x:
        (event.clientX - rectangle.left) *
        (canvas.width / rectangle.width),
      y:
        (event.clientY - rectangle.top) *
        (canvas.height / rectangle.height),
    };
  }

  function startDrawing(
    event: React.PointerEvent<HTMLCanvasElement>,
  ) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    canvas.setPointerCapture(event.pointerId);
    isDrawing.current = true;

    const position = getPosition(event);

    context.beginPath();
    context.moveTo(position.x, position.y);
    context.lineWidth = 4;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#374151";

    setHasSignature(true);
  }

  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing.current) return;

    const context = canvasRef.current?.getContext("2d");

    if (!context) return;

    const position = getPosition(event);

    context.lineTo(position.x, position.y);
    context.stroke();
  }

  function stopDrawing(
    event: React.PointerEvent<HTMLCanvasElement>,
  ) {
    if (canvasRef.current?.hasPointerCapture(event.pointerId)) {
      canvasRef.current.releasePointerCapture(event.pointerId);
    }

    isDrawing.current = false;
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  }

  async function saveSignature() {
    if (!printedName.trim()) {
      setErrorMessage("Enter the signer's printed name.");
      return;
    }

    if (!hasSignature) {
      setErrorMessage("A signature is required.");
      return;
    }

    const canvas = canvasRef.current;

    if (!canvas) return;

    setIsSaving(true);
    setErrorMessage("");

    const signatureBlob = await new Promise<Blob | null>(
      (resolve) => canvas.toBlob(resolve, "image/png"),
    );

    if (!signatureBlob) {
      setErrorMessage("Unable to prepare the signature.");
      setIsSaving(false);
      return;
    }

    const safeType = signoffType
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");

    const storagePath =
      `${projectId}/signatures/` +
      `${safeType}-${crypto.randomUUID()}.png`;

    const { error: uploadError } = await supabase.storage
      .from("project-documents")
      .upload(storagePath, signatureBlob, {
        cacheControl: "3600",
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError) {
      setErrorMessage(uploadError.message);
      setIsSaving(false);
      return;
    }

    const { error: signoffError } = await supabase
      .from("project_signoffs")
      .upsert(
        {
          project_id: projectId,
          signoff_type: signoffType,
          printed_name: printedName.trim(),
          title: title.trim() || null,
          company: company.trim() || null,
          signature_storage_path: storagePath,
          signed_at: new Date().toISOString(),
        },
        {
          onConflict: "project_id,signoff_type",
        },
      );

    if (signoffError) {
      await supabase.storage
        .from("project-documents")
        .remove([storagePath]);

      setErrorMessage(signoffError.message);
      setIsSaving(false);
      return;
    }

    await onSaved();
    setIsSaving(false);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#238bac]/10 text-[#238bac]">
          <PenLine size={20} />
        </div>

        <div>
          <h3 className="font-bold text-[#374151]">
            {signoffType}
          </h3>

          <p className="text-sm text-slate-500">
            Printed name and signature required
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field
          label="Printed Name"
          required
          value={printedName}
          onChange={setPrintedName}
        />

        <Field
          label="Title"
          value={title}
          onChange={setTitle}
        />

        <div className="sm:col-span-2">
          <Field
            label="Company"
            value={company}
            onChange={setCompany}
          />
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-semibold text-slate-700">
            Signature
          </label>

          <button
            type="button"
            onClick={clearSignature}
            className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-[#f04c37]"
          >
            <Eraser size={16} />
            Clear
          </button>
        </div>

        <canvas
          ref={canvasRef}
          width={900}
          height={260}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
          className="h-40 w-full touch-none rounded-xl border border-dashed border-slate-300 bg-slate-50"
        />

        <p className="mt-2 text-xs text-slate-500">
          Sign above using a finger, stylus, mouse, or trackpad.
        </p>
      </div>

      {errorMessage && (
        <p className="mt-3 text-sm font-medium text-red-600">
          {errorMessage}
        </p>
      )}

      <button
        type="button"
        disabled={isSaving}
        onClick={() => void saveSignature()}
        className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#238bac] px-5 font-bold text-white disabled:opacity-60"
      >
        {isSaving ? (
          <LoaderCircle className="animate-spin" size={19} />
        ) : (
          <Check size={19} />
        )}
        Save {signoffType} Signoff
      </button>
    </div>
  );
}

type FieldProps = {
  label: string;
  value: string;
  required?: boolean;
  onChange: (value: string) => void;
};

function Field({
  label,
  value,
  required,
  onChange,
}: FieldProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="ml-1 text-[#f04c37]">*</span>}
      </label>

      <input
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-[#238bac]"
      />
    </div>
  );
}