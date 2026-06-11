import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LifeForm } from "../life-form";

export default async function NewLifePostPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-xl font-bold">发布分享</h1>
      <LifeForm />
    </div>
  );
}
