import React from "react";
import renderer from "react-test-renderer";
import CopyPidButton from "./CopyPidButton";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";

jest.mock(
    "@mui/icons-material/ContentCopy",
    () =>
        ({ titleAccess }: { titleAccess: string }) =>
            titleAccess,
);

describe("CopyPidButton", () => {
    it("renders", async () => {
        const tree = renderer.create(<CopyPidButton pid="foo" />);
        expect(tree.toJSON()).toMatchSnapshot();
    });

    it("copies text to clipboard", async () => {
        const user = userEvent.setup();
        render(<CopyPidButton pid="foo" />);
        const button = screen.getByText("Copy PID (foo) to clipboard");
        await user.click(button);
        expect(await navigator.clipboard.readText()).toEqual("foo");
    });
});
