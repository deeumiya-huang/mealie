import { useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { useMealieAuth } from "~/hooks/use-mealie-auth";

export default function RecipeCreateIndexPage() {
  const params = useParams();
  const navigate = useNavigate();
  const auth = useMealieAuth();

  useEffect(() => {
    // Force redirect to first valid page
    const groupSlug = params.groupSlug || auth.user?.groupSlug || "";
    void navigate(`/g/${groupSlug}/r/create/url`, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- redirect once on mount
  }, []);

  return <div />;
}
