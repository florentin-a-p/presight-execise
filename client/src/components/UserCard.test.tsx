import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { User } from "../lib/api";
import { renderWithProviders } from "../test/render";
import { UserCard } from "./UserCard";

const user = (hobbies: string[]): User => ({
  id: 1,
  avatar: "https://example.com/a.svg",
  first_name: "Ada",
  last_name: "Lovelace",
  age: 36,
  nationality: "British",
  hobbies,
});

describe("UserCard", () => {
  it("shows name, nationality and age", () => {
    renderWithProviders(<UserCard user={user([])} />);
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("British")).toBeInTheDocument();
    expect(screen.getByLabelText("Age 36")).toHaveTextContent("36");
    expect(screen.getByText("No hobbies")).toBeInTheDocument();
  });

  it("shows up to two hobbies and the remaining count as +n", () => {
    renderWithProviders(<UserCard user={user(["Chess", "Cooking", "Hiking", "Reading", "Yoga"])} />);
    const hobbies = within(screen.getByTestId("hobbies"));
    expect(hobbies.getByText("Chess")).toBeInTheDocument();
    expect(hobbies.getByText("Cooking")).toBeInTheDocument();
    expect(hobbies.queryByText("Hiking")).not.toBeInTheDocument();
    expect(hobbies.getByText("+3")).toBeInTheDocument();
  });

  it("omits +n when there are two or fewer hobbies", () => {
    renderWithProviders(<UserCard user={user(["Chess", "Cooking"])} />);
    expect(screen.queryByText(/^\+\d/)).not.toBeInTheDocument();
  });

  it("puts hobbies used as filters first", () => {
    renderWithProviders(<UserCard user={user(["Chess", "Cooking", "Yoga"])} highlight={["Yoga"]} />);
    const hobbies = within(screen.getByTestId("hobbies"));
    expect(hobbies.getByText("Yoga")).toBeInTheDocument();
    expect(hobbies.getByText("Chess")).toBeInTheDocument();
    expect(hobbies.queryByText("Cooking")).not.toBeInTheDocument();
  });
});
