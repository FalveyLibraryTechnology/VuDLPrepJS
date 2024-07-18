import React from "react";
import renderer from "react-test-renderer";
import CopyPidButton from "./CopyPidButton";

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
});
