import React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import renderer from "react-test-renderer";
import LogoutButton from "./LogoutButton";

describe("LogoutButton", () => {
    beforeEach(() => {
        Object.defineProperty(window, "sessionStorage", {
            value: {
                getItem: jest.fn(() => null),
                removeItem: jest.fn(() => null),
            },
            writable: true,
        });
    });

    it("renders", () => {
        const tree = renderer.create(<LogoutButton />).toJSON();
        expect(tree).toMatchSnapshot();
    });

    it("clears the token", async () => {
        render(<LogoutButton />);

        // Clicking a link will trigger a console error about navigation not being
        // implemented -- but that doesn't hurt the test, so let's suppress it by
        // mocking the error method.
        // TODO: figure out why and come up with a better solution than hiding the errors.
        jest.spyOn(console, "error").mockImplementation(jest.fn());

        expect(sessionStorage.removeItem).not.toHaveBeenCalledWith("token");

        await userEvent.setup().click(screen.getByText("Log Out"));

        expect(sessionStorage.removeItem).toHaveBeenCalledWith("token");
    });
});
