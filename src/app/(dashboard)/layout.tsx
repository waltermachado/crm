import { redirect } from "next/navigation";

import { CrmShell } from "@/components/layout/crm-shell";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function createUserLabel(email: string | undefined) {
  if (!email) {
    return {
      initials: "AX",
      label: "Axe CRM User",
    };
  }

  const segments = email.split("@")[0]?.split(/[._-]/g).filter(Boolean) ?? [];

  return {
    initials: segments
      .slice(0, 2)
      .map((segment) => segment.charAt(0).toUpperCase())
      .join("")
      .slice(0, 2) || email.slice(0, 2).toUpperCase(),
    label: email,
  };
}

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const userProfile = createUserLabel(user.email);

  return (
    <CrmShell
      user={{
        email: user.email ?? "",
        label: userProfile.label,
        initials: userProfile.initials,
      }}
    >
      {children}
    </CrmShell>
  );
}
