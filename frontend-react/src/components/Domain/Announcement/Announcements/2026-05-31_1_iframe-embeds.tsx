import Button from "@mui/material/Button";
import type { AnnouncementMeta } from "@/hooks/use-announcements";
import { useMealieAuth } from "@/hooks/use-mealie-auth";

// eslint-disable-next-line react-refresh/only-export-components -- metadata sits next to the component, as in the Vue files
export const meta: AnnouncementMeta = {
  title: "Recipe embeds restricted to trusted hosts",
};

export default function IframeEmbedsAnnouncement() {
  const { user } = useMealieAuth();

  return (
    <div>
      <p>
        To harden Mealie against malicious content,
        {" "}
        <code>&lt;iframe&gt;</code>
        {" "}
        embeds in recipe
        instructions, notes, and descriptions are now restricted to a trusted set of hosts.
      </p>
      <div className="mb-2">
        By default, embeds are allowed only from well-known video providers:
        <ul className="ml-6">
          <li>YouTube</li>
          <li>Vimeo</li>
        </ul>
      </div>
      <p>
        Existing recipes that embed content from
        {" "}
        <strong>other</strong>
        {" "}
        hosts will no longer render
        those embeds. The rest of the recipe is unaffected.
      </p>
      {user?.admin && (
        <div>
          <hr className="mt-2 mb-4" />
          <p>
            As an admin, you can allow additional hosts with the
            {" "}
            <code>ALLOWED_IFRAME_HOSTS</code>
            {" "}
            environment variable (comma-separated). It extends the built-in defaults, and only
            {" "}
            <code>https</code>
            {" "}
            sources are permitted. See the configuration docs for details:
            <br />
            <Button
              className="mt-2"
              variant="contained"
              color="primary"
              href="https://docs.mealie.io/documentation/getting-started/installation/backend-config/"
              target="_blank"
            >
              Backend Configuration
            </Button>
          </p>
        </div>
      )}
    </div>
  );
}
