import { useMealieAuth } from "~/hooks/use-mealie-auth";
import type { AnnouncementMeta } from "~/hooks/use-announcements";
import { AnnouncementBody, AnnouncementLink } from "./_shared";

export const meta: AnnouncementMeta = {
  title: "Recipe embeds restricted to trusted hosts",
};

export default function Announcement() {
  const { user } = useMealieAuth();
  return (
    <AnnouncementBody>
      <p>
        To harden Mealie against malicious content, <code>&lt;iframe&gt;</code> embeds in recipe
        instructions, notes, and descriptions are now restricted to a trusted set of hosts.
      </p>
      <div style={{ marginBottom: 8 }}>
        By default, embeds are allowed only from well-known video providers:
        <ul>
          <li>YouTube</li>
          <li>Vimeo</li>
        </ul>
      </div>
      <p>
        Existing recipes that embed content from <strong>other</strong> hosts will no longer render
        those embeds. The rest of the recipe is unaffected.
      </p>
      {user?.admin && (
        <div>
          <hr />
          <p>
            As an admin, you can allow additional hosts with the <code>ALLOWED_IFRAME_HOSTS</code>
            {" "}environment variable (comma-separated). It extends the built-in defaults, and only
            {" "}<code>https</code> sources are permitted. See the configuration docs for details:
            <br />
            <AnnouncementLink href="https://docs.mealie.io/documentation/getting-started/installation/backend-config/">Backend Configuration</AnnouncementLink>
          </p>
        </div>
      )}
    </AnnouncementBody>
  );
}
