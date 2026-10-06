import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { renderWithProviders } from "@/test/utils";
import { UserProfileLinkCard } from "./UserProfileLinkCard";

describe("UserProfileLinkCard", () => {
  afterEach(cleanup);

  test("renders the title, description and a real link to the target", () => {
    renderWithProviders(
      <UserProfileLinkCard link={{ text: "Manage Profile", to: "/user/profile/edit" }} image="/svgs/manage-profile.svg" title="User Settings">
        Settings description
      </UserProfileLinkCard>,
    );

    expect(screen.getByText("User Settings")).toBeTruthy();
    expect(screen.getByText("Settings description")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Manage Profile" }).getAttribute("href")).toBe("/user/profile/edit");
  });
});
