import { useParams } from "react-router";
import { CookbookPage } from "~/components/Domain/Cookbook/CookbookPage";

export default function CookbookSlugPage() {
  const { slug } = useParams();
  // Keyed so navigating between cookbooks (or to a renamed slug) reloads the page state
  return <CookbookPage key={slug} />;
}
