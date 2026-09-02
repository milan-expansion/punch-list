import FinalAcceptanceClient from "@/components/FinalAcceptanceClient";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AcceptancePage({
  params,
}: PageProps) {
  const { id } = await params;

  return <FinalAcceptanceClient projectId={id} />;
}