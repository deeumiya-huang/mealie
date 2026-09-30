import { useMealieAuth } from "~/hooks/use-mealie-auth";
import type { AnnouncementMeta } from "~/hooks/use-announcements";
import { AnnouncementBody, AnnouncementLink } from "./_shared";

export const meta: AnnouncementMeta = {
  title: "Better recipe imports, with proxy and FlareSolverr support",
};

export default function Announcement() {
  const { user } = useMealieAuth();
  return (
    <AnnouncementBody>
      <p>
        Importing recipes from a URL is now more reliable. Mealie does a better job of looking like a real
        browser, rotates between several browser signatures, and retries more intelligently when a site
        pushes back. This works out of the box, with no configuration.
      </p>
      <p>
        Some sites sit behind bot protection (such as Cloudflare) that blocks requests made by a server, no
        matter how they're made. For those, Mealie can now optionally fall back to two extra layers.
      </p>
      <div style={{ marginBottom: 8 }}>
        <ul>
          <li>
            <strong>Proxy support</strong>, which routes recipe and image requests through a proxy. This
            helps with sites that block your server's IP address.
          </li>
          <li>
            <strong>FlareSolverr support</strong>, which hands the page to a real headless browser as a last
            resort. This helps with challenges that Mealie can't get past on its own.
          </li>
        </ul>
      </div>
      {user?.admin
        ? (
            <div>
              <hr />
              <p>
                Both are optional and off by default, so nothing changes unless you configure them. Mealie
                escalates only as far as it needs to for each import: a direct fetch first, then the proxy (if
                set), then FlareSolverr (if set, and only when the page is still blocked).
              </p>
              <p>
                Both are enabled with environment variables. Mealie does not ship or manage either one. You supply
                the proxy, and host FlareSolverr yourself (it runs nicely as a sidecar container). See the
                configuration docs for the settings, setup details, and an example compose file:
                <br />
                <AnnouncementLink href="https://docs.mealie.io/documentation/getting-started/installation/backend-config/#recipe-scraper">Backend Configuration</AnnouncementLink>
              </p>
            </div>
          )
        : (
            <div>
              <p>
                If a recipe URL still refuses to import, let your server admin know. They can enable these extra
                options on the server.
              </p>
            </div>
          )}
    </AnnouncementBody>
  );
}
