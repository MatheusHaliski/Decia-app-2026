"use client";
import { ProfileView } from "@/components/social";
import { pageByRoute } from "@/lib/pages/registry";

const PAGE = pageByRoute("/u/[username]")!;

export function UserProfileClient({ username }: { username: string }) {
  return <ProfileView page={PAGE} username={username} />;
}
