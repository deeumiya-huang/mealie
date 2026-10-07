import { Navigate, useParams } from "react-router";
import { useMealieAuth } from "@/hooks/use-mealie-auth";

// Port of pages/g/[groupSlug]/r/create/index.vue: the Nuxt page replaced the route on mount (force redirect to the
// first valid page); the final URL is the same.
export default function RecipeCreateIndexPage() {
  const params = useParams();
  const auth = useMealieAuth();
  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";

  return <Navigate to={`/g/${groupSlug}/r/create/url`} replace />;
}
