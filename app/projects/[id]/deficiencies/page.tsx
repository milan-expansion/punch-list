import DeficiencyLogClient from "@/components/DeficiencyLogClient";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function DeficiencyLogPage({
  params,
}: PageProps) {
  const { id } = await params;

  return <DeficiencyLogClient projectId={id} />;
}