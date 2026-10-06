import { useState } from "react";
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { fieldTypes } from "@/hooks/forms";
import { icons } from "@/lib/icons";
import { renderWithProviders, stubI18n } from "@/test/utils";
import type { AutoFormItems } from "@/types/auto-forms";
import { GroupDataPage } from "./GroupDataPage";

const { t } = stubI18n();

interface Item {
  id: string;
  name: string;
}

const formItems: AutoFormItems = [
  { label: "Name", varName: "name", type: fieldTypes.TEXT },
];

function Harness({ onCreateOne, onEditOne, onDeleteOne }: {
  onCreateOne: (data: Item) => void;
  onEditOne: (data: Item) => void;
  onDeleteOne: (id: string) => void;
}) {
  const [createData, setCreateData] = useState<Item>({ id: "", name: "" });
  const [editData, setEditData] = useState<Item>({ id: "", name: "" });

  return (
    <GroupDataPage<Item, Item>
      icon={icons.tags}
      title="Tag Data"
      createTitle="New Tag"
      editTitle="Edit Tag"
      tableHeaders={[{ text: "Name", value: "name", show: true, sortable: true }]}
      data={[{ id: "1", name: "alpha" }, { id: "2", name: "beta" }]}
      bulkActions={[{ icon: icons.delete, text: t("general.delete"), event: "delete-selected" }]}
      createForm={{ items: formItems, data: createData }}
      onCreateFormChange={form => setCreateData(form.data)}
      editForm={{ items: formItems, data: editData }}
      onEditFormChange={form => setEditData(form.data)}
      onCreateOne={onCreateOne}
      onEditOne={onEditOne}
      onDeleteOne={onDeleteOne}
    />
  );
}

function setup() {
  const handlers = { onCreateOne: vi.fn(), onEditOne: vi.fn(), onDeleteOne: vi.fn() };
  renderWithProviders(<Harness {...handlers} />);
  return handlers;
}

describe("GroupDataPage", () => {
  afterEach(() => {
    cleanup();
  });

  test("creating an item reports the typed form data", async () => {
    const { onCreateOne } = setup();

    await userEvent.click(screen.getByRole("button", { name: t("general.create") }));
    const dialog = await screen.findByRole("dialog", { name: "New Tag" });
    await userEvent.type(within(dialog).getByRole("textbox", { name: "Name" }), "gamma");
    await userEvent.click(within(dialog).getByRole("button", { name: t("general.confirm") }));

    expect(onCreateOne).toHaveBeenCalledWith({ id: "", name: "gamma" });
  });

  test("editing an item opens the form with its data and reports the change", async () => {
    const { onEditOne } = setup();

    const row = screen.getByRole("row", { name: /alpha/ });
    await userEvent.click(within(row).getByRole("button", { name: t("general.edit") }));
    const dialog = await screen.findByRole("dialog", { name: "Edit Tag" });
    const name = within(dialog).getByRole("textbox", { name: "Name" });
    expect(name).toHaveValue("alpha");

    await userEvent.type(name, "2");
    await userEvent.click(within(dialog).getByRole("button", { name: t("general.confirm") }));

    expect(onEditOne).toHaveBeenCalledWith({ id: "1", name: "alpha2" });
  });

  test("deleting an item asks for confirmation and names the item", async () => {
    const { onDeleteOne } = setup();

    const row = screen.getByRole("row", { name: /beta/ });
    await userEvent.click(within(row).getByRole("button", { name: t("general.delete") }));
    const dialog = await screen.findByRole("dialog", { name: t("general.confirm") });
    expect(within(dialog).getByText(t("general.confirm-delete-generic"), { exact: false })).toBeInTheDocument();
    expect(within(dialog).getByText("beta")).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole("button", { name: t("general.confirm") }));

    expect(onDeleteOne).toHaveBeenCalledWith("2");
  });
});
