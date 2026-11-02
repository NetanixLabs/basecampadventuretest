/** Every permission the owner can give or take away, with plain wording. Safe in the browser. */
export const PERMISSIONS = [
  { key: "content", label: "Website content", help: "Trips, blog, pages, team, reviews, gallery" },
  { key: "publish", label: "Publish changes", help: "Make edits live on the website" },
  { key: "media", label: "Photos and files", help: "Upload and manage the media library" },
  { key: "sales", label: "Bookings and enquiries", help: "See and handle bookings, enquiries, discount codes, newsletter" },
  { key: "customers", label: "Customers", help: "Customer list and their details" },
  { key: "receipts", label: "Receipts and bills", help: "Create, send and cancel receipts and bills" },
  { key: "operations", label: "Departures and field team", help: "Departures, guides and porters, agents, departure lists" },
  { key: "reports", label: "Sales dashboard", help: "Money received, best trips, where customers come from" },
  { key: "email", label: "Email templates", help: "Wording of automatic emails" },
  { key: "settings", label: "Settings and keys", help: "Company details, features, payment and email keys" },
  { key: "users", label: "Team accounts", help: "Invite people and change their permissions" },
] as const;

export type Permission = (typeof PERMISSIONS)[number]["key"];
