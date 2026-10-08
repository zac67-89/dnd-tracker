import type { Metadata } from "next";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "DND Tracker",
  description: "Notes, lore, and equipment tracker for tabletop campaigns",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <html lang="en">
      <body>
        <header className="border-b border-white/10">
          <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
            <Link href="/" className="text-lg font-bold text-amber-500">
              ⚔️ DND Tracker
            </Link>
            {session?.user && (
              <div className="ml-auto flex items-center gap-3 text-sm">
                <span className="text-neutral-400">{session.user.name || session.user.email}</span>
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/" });
                  }}
                >
                  <button className="btn btn-ghost text-xs">Sign out</button>
                </form>
              </div>
            )}
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
