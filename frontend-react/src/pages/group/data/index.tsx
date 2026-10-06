import { Navigate } from "react-router";

// Port of pages/group/data/index.vue: the Nuxt page pushed "/group/data/foods" on mount (force redirect to
// the first valid page); the final URL is the same.
export default function GroupDataIndexPage() {
  return <Navigate to="/group/data/foods" replace />;
}
