import WalkthroughClient from "@/components/WalkthroughClient";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    room?: string;
  }>;
};

export default async function WalkthroughPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const { room } = await searchParams;

  return (
    <WalkthroughClient
      projectId={id}
      initialRoomId={room ?? null}
    />
  );
}