import { redirect } from "next/navigation";

export default async function LogPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  redirect(date ? `/log/search?date=${date}` : "/log/search");
}
