import { useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { useMealieAuth } from "~/hooks/use-mealie-auth";

export default function RecipeCreateImagePage() {
  const params = useParams();
  const navigate = useNavigate();
  const auth = useMealieAuth();

  useEffect(() => {
    // The image importer was folded into the AI importer, which takes images alongside other content.
    // Kept as a redirect so existing links and bookmarks still land somewhere useful.
    const groupSlug = params.groupSlug || auth.user?.groupSlug || "";
    void navigate(`/g/${groupSlug}/r/create/ai`, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- redirect once on mount
  }, []);

  return <div />;
}
