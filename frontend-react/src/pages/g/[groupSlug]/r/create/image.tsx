import { Navigate, useParams } from "react-router";
import { useMealieAuth } from "@/hooks/use-mealie-auth";

// Port of pages/g/[groupSlug]/r/create/image.vue: the image importer was folded into the AI importer, which takes
// images alongside other content. Kept as a redirect so existing links and bookmarks still land somewhere useful.
export default function RecipeCreateImagePage() {
  const params = useParams();
  const auth = useMealieAuth();
  const groupSlug = params.groupSlug || auth.user?.groupSlug || "";

  return <Navigate to={`/g/${groupSlug}/r/create/ai`} replace />;
}
