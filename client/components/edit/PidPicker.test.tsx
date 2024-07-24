import React from "react";
import { describe, beforeEach, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import renderer from "react-test-renderer";
import PidPicker from "./PidPicker";
import { Parent } from "./PidPicker";
import { getRecentPidsCatalog } from "../../util/RecentPidsCatalog";

const mockUseEditorContext = jest.fn();
jest.mock("../../context/EditorContext", () => ({
    useEditorContext: () => {
        return mockUseEditorContext();
    },
}));
jest.mock("./children/ChildList", () => () => "ChildList");
jest.mock("@mui/material/AccordionSummary", () => (props) => "AccordionSummary: " + JSON.stringify(props.children));
jest.mock("@mui/icons-material/ExpandMore", () => () => "Icon");
jest.mock("../../util/RecentPidsCatalog");

describe("PidPicker", () => {
    let callback: () => void;
    let editorValues;
    let favoritePidsCatalog: Record<string, string>;

    const getPicker = (selected = "", parents: Array<Parent> = []) => {
        return <PidPicker selected={selected} parents={parents} setSelected={callback} />;
    };

    const checkSnapshot = (selected = "", parents: Array<Parent> = []) => {
        const tree = renderer.create(getPicker(selected, parents)).toJSON();
        expect(tree).toMatchSnapshot();
    };

    beforeEach(() => {
        getRecentPidsCatalog.mockReturnValue({});
        callback = jest.fn();
        favoritePidsCatalog = { "foo:123": "first test", "foo:124": "second test" };
        editorValues = {
            state: { favoritePidsCatalog },
        };
        mockUseEditorContext.mockReturnValue(editorValues);
    });

    it("renders correctly with favorite PIDs", () => {
        checkSnapshot();
    });

    it("sets selected PID when you click a favorite button", async () => {
        render(getPicker());
        await userEvent.setup().click(screen.getByText("first test"));

        expect(callback).toHaveBeenCalledWith("foo:123");
    });

    it("sets selected PID when you click a recent button", async () => {
        getRecentPidsCatalog.mockReturnValue({ "foo:125": "recent test" });
        render(getPicker());
        await userEvent.setup().click(screen.getByText("recent test"));

        expect(callback).toHaveBeenCalledWith("foo:125");
    });

    it("sets selected PID when you use manual entry", async () => {
        render(getPicker());
        fireEvent.change(screen.getByRole("textbox", { hidden: true }), { target: { value: "bar" } });
        await userEvent.setup().click(screen.getByText("Set"));

        expect(callback).toHaveBeenCalledWith("bar");
    });

    it("renders correctly with a selected PID", () => {
        checkSnapshot("selected:123");
    });

    it("renders correctly with parents", () => {
        const parents = [
            { pid: "foo", title: "Foo" },
            { pid: "bar", title: "Bar" },
        ];
        checkSnapshot("", parents);
    });

    it("allows you to clear a selected PID", async () => {
        render(getPicker("selected:123"));
        await userEvent.setup().click(screen.getByText("Clear"));

        expect(callback).toHaveBeenCalledWith("");
    });

    it("renders correctly with recent PIDs", () => {
        getRecentPidsCatalog.mockReturnValue(editorValues.state.favoritePidsCatalog);
        checkSnapshot();
    });

    it("renders correctly without favorite PIDs", () => {
        editorValues.state.favoritePidsCatalog = [];
        checkSnapshot();
    });
});
