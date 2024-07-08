import React from "react";
import { describe, afterEach, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import renderer from "react-test-renderer";
import DatastreamProcessMetadataTask from "./DatastreamProcessMetadataTask";
import { ProcessMetadataTask } from "../../../context/ProcessMetadataContext";

const mockUseEditorContext = jest.fn();
jest.mock("../../../context/EditorContext", () => ({
    useEditorContext: () => {
        return mockUseEditorContext();
    },
}));
let mockBlurSavingSetters: Array<(val: string) => void> = [];
jest.mock("../../shared/BlurSavingTextField", () => (props) => {
    mockBlurSavingSetters.push(props.setValue);
    return `BlurSavingTextField: ${JSON.stringify(props)}`;
});
jest.mock("@mui/material/Grid", () => (props) => props.children);
jest.mock("@mui/icons-material/AddCircle", () => (props) => props.titleAccess);
jest.mock("@mui/icons-material/Delete", () => (props) => props.titleAccess);

describe("DatastreamProcessMetadataTask", () => {
    let editorValues;
    let task: ProcessMetadataTask;

    beforeEach(() => {
        mockBlurSavingSetters = [];
        editorValues = {
            state: {
                toolPresets: [],
            },
        };
        task = {
            sequence: "seq",
            label: "lab",
            description: "des",
            individual: "ind",
            toolLabel: "tool-lab",
            toolDescription: "tool-des",
            toolMake: "tool-mak",
            toolVersion: "tool-ver",
            toolSerialNumber: "tool-ser",
        };
        mockUseEditorContext.mockReturnValue(editorValues);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("renders without tool presets", () => {
        const tree = renderer
            .create(
                <DatastreamProcessMetadataTask
                    task={task}
                    deleteTask={jest.fn()}
                    addBelow={jest.fn()}
                    setAttributes={jest.fn()}
                />,
            )
            .toJSON();

        expect(tree).toMatchSnapshot();
    });

    it("renders with tool presets", () => {
        editorValues.state.toolPresets.push({ label: "My Tool" });
        const tree = renderer
            .create(
                <DatastreamProcessMetadataTask
                    task={task}
                    deleteTask={jest.fn()}
                    addBelow={jest.fn()}
                    setAttributes={jest.fn()}
                />,
            )
            .toJSON();

        expect(tree).toMatchSnapshot();
    });

    it("applies tool presets", async () => {
        editorValues.state.toolPresets.push({ label: "Tool 1" });
        editorValues.state.toolPresets.push({ label: "Tool 2", serialNumber: "1234", version: "1" });
        const setAttributes = jest.fn();
        render(
            <DatastreamProcessMetadataTask
                task={{}}
                deleteTask={jest.fn()}
                addBelow={jest.fn()}
                setAttributes={setAttributes}
            />,
        );

        const select = screen.getByRole("combobox");
        fireEvent.change(select, { target: { value: "1" } });
        await userEvent.setup().click(screen.getByText("Apply Preset"));

        expect(setAttributes).toHaveBeenCalledWith(
            {
                toolDescription: "",
                toolLabel: "Tool 2",
                toolMake: "",
                toolSerialNumber: "1234",
                toolVersion: "1",
            },
            true,
        );
    });

    it("saves values", () => {
        const setAttributes = jest.fn();
        render(
            <DatastreamProcessMetadataTask
                task={task}
                deleteTask={jest.fn()}
                addBelow={jest.fn()}
                setAttributes={setAttributes}
            />,
        );

        const attributes = [
            "sequence",
            "label",
            "description",
            "individual",
            "toolLabel",
            "toolDescription",
            "toolMake",
            "toolVersion",
            "toolSerialNumber",
        ];
        attributes.forEach((value, index) => {
            mockBlurSavingSetters[index](value + "foo");
            expect(setAttributes).toHaveBeenNthCalledWith(index + 1, { [value]: `${value}foo` });
        });
    });

    it("deletes tasks", async () => {
        const deleteTask = jest.fn();
        render(
            <DatastreamProcessMetadataTask
                task={task}
                deleteTask={deleteTask}
                addBelow={jest.fn()}
                setAttributes={jest.fn()}
            />,
        );

        await userEvent.setup().click(screen.getByText("Delete Task"));
        expect(deleteTask).toHaveBeenCalled();
    });

    it("inserts values below", async () => {
        const addBelow = jest.fn();
        render(
            <DatastreamProcessMetadataTask
                task={task}
                deleteTask={jest.fn()}
                addBelow={addBelow}
                setAttributes={jest.fn()}
            />,
        );

        await userEvent.setup().click(screen.getByText("Add Below"));
        expect(addBelow).toHaveBeenCalled();
    });
});
