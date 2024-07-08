import React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import renderer from "react-test-renderer";
import { SelectableChildProps, SelectableChild } from "./SelectableChild";

jest.mock("./ChildList", () => () => "ChildList");
jest.mock("../ObjectThumbnail", () => () => "ObjectThumbnail");
const mockUseEditorContext = jest.fn();
jest.mock("../../../context/EditorContext", () => ({
    useEditorContext: () => {
        return mockUseEditorContext();
    },
}));

describe("SelectableChild", () => {
    let editorValues;
    let props: SelectableChildProps;

    beforeEach(() => {
        props = { pid: "foo:123", initialTitle: "initial title", selectCallback: jest.fn() };
        editorValues = {
            state: { objectDetailsStorage: {} },
        };
        mockUseEditorContext.mockReturnValue(editorValues);
    });

    function checkSnapshot() {
        const tree = renderer.create(<SelectableChild {...props} />).toJSON();
        expect(tree).toMatchSnapshot();
    }

    it("renders using provided default data", async () => {
        checkSnapshot();
    });

    it("renders thumbnails", async () => {
        props.thumbnail = true;
        checkSnapshot();
    });

    it("renders using object details storage data", async () => {
        editorValues.state.objectDetailsStorage["foo:123"] = { metadata: { "dc:title": ["loaded title"] } };
        checkSnapshot();
    });

    it("handles missing object details storage title metadata correctly", async () => {
        editorValues.state.objectDetailsStorage["foo:123"] = { metadata: {} };
        checkSnapshot();
    });

    it("handles empty initial titles appropriately", async () => {
        props.initialTitle = "";
        checkSnapshot();
    });

    it("allows pids to be selected", async () => {
        render(<SelectableChild {...props} />);
        await userEvent.setup().click(screen.getByRole("button"));
        expect(props.selectCallback).toHaveBeenCalledWith("foo:123");
    });

    it("can be expanded to show children", async () => {
        render(<SelectableChild {...props} />);
        //  Before click, we have an Expand Tree button and no children:
        const expandIcon = screen.getByText("Expand Tree");
        expect(screen.queryAllByText("ChildList")).toHaveLength(0);
        expect(screen.queryAllByText("Collapse Tree")).toHaveLength(0);
        await userEvent.setup().click(expandIcon);
        // After click we have a Collapse Tree button and children:
        expect(screen.queryAllByText("ChildList")).toHaveLength(1);
        expect(screen.queryAllByText("Collapse Tree")).toHaveLength(1);
        expect(screen.queryAllByText("Expand Tree")).toHaveLength(0);
    });
});
