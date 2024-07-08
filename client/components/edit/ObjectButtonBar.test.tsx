import React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { waitFor } from "@testing-library/react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import renderer from "react-test-renderer";
import * as EditorContextModule from "../../context/EditorContext";
import ObjectButtonBar from "./ObjectButtonBar";

jest.mock("./EditParentsButton", () => () => "EditParentsButton");
jest.mock("./ObjectPreviewButton", () => () => "ObjectPreviewButton");
jest.mock("./ObjectStatus", () => () => "ObjectStatus");
jest.mock(
    "@mui/icons-material/Refresh",
    () =>
        ({ titleAccess }: { titleAccess: string }) =>
            titleAccess,
);

describe("ObjectButtonBar", () => {
    let pid: string;
    let mockContext;

    beforeEach(() => {
        pid = "foo:123";
        mockContext = {
            state: { objectDetailsStorage: {}, vufindUrl: "" },
            action: {
                clearPidFromChildListStorage: jest.fn(),
            },
        };
        jest.spyOn(EditorContextModule, "useEditorContext").mockReturnValue(mockContext);
    });

    it("renders correctly", async () => {
        const tree = renderer.create(<ObjectButtonBar pid={pid} />).toJSON();
        expect(tree).toMatchSnapshot();
    });

    it("can refresh a list of children", async () => {
        render(<ObjectButtonBar pid={pid} />);
        const refreshIcon = screen.getByRole("button");
        expect(refreshIcon.textContent).toEqual("Refresh children");
        await userEvent.setup().click(refreshIcon);
        await waitFor(() => expect(mockContext.action.clearPidFromChildListStorage).toHaveBeenCalledTimes(1));
        expect(mockContext.action.clearPidFromChildListStorage).toHaveBeenCalledWith(pid);
    });
});
