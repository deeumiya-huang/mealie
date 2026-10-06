import { Outlet } from "react-router";

// Port of pages/admin.vue: a Nuxt parent page that only renders its child (`<NuxtPage />`). Its
// middleware ["auth", "admin-only"] is the loader guard of the `admin` route in routes/admin.tsx.
export default function AdminPage() {
  return <Outlet />;
}
