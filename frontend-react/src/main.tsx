import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import { App } from "~/app/App";
import { bootstrap } from "~/app/bootstrap";

async function main() {
  const { themeConfig } = await bootstrap();
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App themeConfig={themeConfig} />
    </StrictMode>,
  );
}

void main();
