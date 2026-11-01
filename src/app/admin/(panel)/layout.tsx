import { AdminNav, type NavGroup } from "@/components/admin/nav";
import { db } from "@/lib/admin/db";
import { can, requireUser } from "@/lib/admin/guards";
import { signOut } from "../(auth)/actions";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireUser();
  const r = user.role;
  const [newEnquiries, newBookings] = can(r, "sales")
    ? await Promise.all([db.enquiry.count({ where: { status: "new" } }), db.booking.count({ where: { status: { in: ["requested", "awaiting_payment"] } } })])
    : [0, 0];

  const groups: NavGroup[] = [
    { label: "Overview", items: [{ href: "/", label: "Dashboard", icon: "LayoutDashboard" as const }] },
    ...(can(r, "sales")
      ? [{
          label: "Customers",
          items: [
            { href: "/bookings", label: "Bookings", icon: "CalendarCheck" as const, badge: newBookings },
            { href: "/enquiries", label: "Enquiries", icon: "Inbox" as const, badge: newEnquiries },
            { href: "/discounts", label: "Discount codes", icon: "Percent" as const },
            { href: "/subscribers", label: "Newsletter", icon: "Mail" as const },
          ],
        }]
      : []),
    ...(can(r, "content")
      ? [{
          label: "Website",
          items: [
            { href: "/c/trips", label: "Trips", icon: "Mountain" as const },
            { href: "/c/posts", label: "Blog", icon: "BookOpen" as const },
            { href: "/c/pages", label: "Pages", icon: "FileText" as const },
            { href: "/c/destinations", label: "Destinations", icon: "MapPinned" as const },
            { href: "/c/activities", label: "Activities", icon: "Waypoints" as const },
            { href: "/c/offers", label: "Offers", icon: "Sparkles" as const },
            { href: "/reviews", label: "Reviews & videos", icon: "Star" as const },
            { href: "/c/team", label: "Team", icon: "Users" as const },
            { href: "/more", label: "More content", icon: "Tag" as const },
            { href: "/media", label: "Media library", icon: "ImageIcon" as const },
          ],
        }]
      : []),
    {
      label: "Growth",
      items: [
        ...(can(r, "content") ? [{ href: "/seo", label: "SEO health", icon: "Search" as const }, { href: "/redirects", label: "Redirects", icon: "Waypoints" as const }] : []),
        ...(can(r, "email") ? [{ href: "/emails", label: "Email templates", icon: "Mail" as const }] : []),
      ],
    },
    ...(can(r, "settings")
      ? [{
          label: "System",
          items: [
            { href: "/settings", label: "Settings", icon: "Settings" as const },
            ...(can(r, "users") ? [{ href: "/users", label: "Team accounts", icon: "Shield" as const }] : []),
            { href: "/activity", label: "Activity log", icon: "BarChart3" as const },
          ],
        }]
      : []),
  ].filter((g) => g.items.length);

  return (
    <div className="min-h-dvh">
      <AdminNav groups={groups} user={{ name: user.name, email: user.email, role: user.role }} signOut={signOut} />
      <div className="lg:pl-64">
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
