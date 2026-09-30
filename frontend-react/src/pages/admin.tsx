import { Outlet } from "react-router";

/**
 * /admin itself (frontend/app/pages/admin.vue). The Vue page was an empty parent whose only job
 * was the ["auth", "admin-only"] middleware; the admin pages are separate routes here, each guarded.
 */
export default function AdminPage() {
  return <Outlet />;
}
