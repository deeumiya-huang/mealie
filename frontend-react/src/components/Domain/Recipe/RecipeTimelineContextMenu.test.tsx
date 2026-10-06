import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { RecipeTimelineEventOut } from "@/lib/api/types/recipe";
import { renderWithProviders, stubI18n } from "@/test/utils";
import { RecipeTimelineContextMenu } from "./RecipeTimelineContextMenu";

const { t } = stubI18n();

const event = {
  id: "e1",
  subject: "Made it",
  eventMessage: "Tasty",
  eventType: "comment",
  userId: "u1",
  recipeId: "r1",
} as RecipeTimelineEventOut;

describe("RecipeTimelineContextMenu", () => {
  afterEach(() => {
    cleanup();
  });

  test("edit opens a dialog and saving reports the changed event", async () => {
    const onUpdate = vi.fn();
    renderWithProviders(<RecipeTimelineContextMenu event={event} onUpdate={onUpdate} />);

    await userEvent.click(screen.getByRole("button"));
    await userEvent.click(await screen.findByRole("menuitem", { name: t("general.edit") }));

    const dialog = await screen.findByRole("dialog");
    const subject = within(dialog).getByLabelText(t("general.subject"));
    expect(subject).toHaveValue("Made it");
    expect(within(dialog).getByLabelText(t("general.message"))).toHaveValue("Tasty");

    await userEvent.clear(subject);
    await userEvent.type(subject, "Made it again");
    await userEvent.click(within(dialog).getByRole("button", { name: t("general.save") }));

    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ subject: "Made it again", eventMessage: "Tasty" }));
  });

  test("delete asks for confirmation first", async () => {
    const onDelete = vi.fn();
    renderWithProviders(<RecipeTimelineContextMenu event={event} onDelete={onDelete} />);

    await userEvent.click(screen.getByRole("button"));
    await userEvent.click(await screen.findByRole("menuitem", { name: t("general.delete") }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(t("events.event-delete-confirmation"))).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole("button", { name: t("general.confirm") }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  test("useItems limits the menu", async () => {
    renderWithProviders(<RecipeTimelineContextMenu event={event} useItems={{ edit: true, delete: false }} />);

    await userEvent.click(screen.getByRole("button"));

    expect(await screen.findByRole("menuitem", { name: t("general.edit") })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: t("general.delete") })).not.toBeInTheDocument();
  });
});
