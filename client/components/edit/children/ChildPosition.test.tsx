import React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act } from "react-dom/test-utils";
import { fireEvent, render, screen } from "@testing-library/react";
import renderer from "react-test-renderer";
import ChildPosition from "./ChildPosition";

const mockUseEditorContext = jest.fn();
jest.mock("../../../context/EditorContext", () => ({
    useEditorContext: () => {
        return mockUseEditorContext();
    },
}));

const mockUseFetchContext = jest.fn();
jest.mock("../../../context/FetchContext", () => ({
    useFetchContext: () => {
        return mockUseFetchContext();
    },
}));

describe("ChildPosition", () => {
    let editorValues;
    let fetchContextValues;
    const pid = "foo:123";
    const parentPid = "foo:122";
    beforeEach(() => {
        editorValues = {
            state: {
                objectDetailsStorage: {},
            },
            action: {
                clearPidFromChildListStorage: jest.fn(),
                removeFromObjectDetailsStorage: jest.fn(),
            },
        };
        mockUseEditorContext.mockReturnValue(editorValues);
        fetchContextValues = {
            action: {
                fetchText: jest.fn(),
            },
        };
        mockUseFetchContext.mockReturnValue(fetchContextValues);
    });

    it("renders correctly when no sort or sequence exists", () => {
        editorValues.state.objectDetailsStorage[pid] = { pid };
        editorValues.state.objectDetailsStorage[parentPid] = { pid: parentPid };
        const tree = renderer.create(<ChildPosition pid={pid} parentPid={parentPid} />).toJSON();
        expect(tree).toBeNull();
    });

    it("renders correctly when a sequence exists and parent is not custom sorted", () => {
        const sequences = [`${parentPid}#73`];
        editorValues.state.objectDetailsStorage[pid] = { pid, sequences };
        editorValues.state.objectDetailsStorage[parentPid] = { pid: parentPid, sortOn: "title" };
        const tree = renderer.create(<ChildPosition pid={pid} parentPid={parentPid} />).toJSON();
        expect(tree).toBeNull();
    });

    it("renders correctly when a sequence exists and parent is custom sorted", () => {
        const sequences = [`${parentPid}#73`];
        editorValues.state.objectDetailsStorage[pid] = { pid, sequences };
        editorValues.state.objectDetailsStorage[parentPid] = { pid: parentPid, sortOn: "custom" };
        const tree = renderer.create(<ChildPosition pid={pid} parentPid={parentPid} />).toJSON();
        expect(tree).toMatchSnapshot();
    });

    it("saves changes when the input is changed", async () => {
        const sequences = [`${parentPid}#73`];
        editorValues.state.objectDetailsStorage[pid] = { pid, sequences };
        editorValues.state.objectDetailsStorage[parentPid] = { pid: parentPid, sortOn: "custom" };
        fetchContextValues.action.fetchText.mockResolvedValue("ok");
        render(<ChildPosition pid={pid} parentPid={parentPid} />);
        await act(async () => {
            const textField = screen.getByRole("textbox");
            fireEvent.blur(textField, { target: { value: "66" } });
        });
        expect(fetchContextValues.action.fetchText).toHaveBeenCalledWith(
            "http://localhost:9000/api/edit/object/foo%3A123/positionInParent/foo%3A122",
            { body: 66, method: "PUT" },
        );
        expect(editorValues.action.clearPidFromChildListStorage).toHaveBeenCalledWith(parentPid);
        expect(editorValues.action.removeFromObjectDetailsStorage).toHaveBeenCalledWith(pid);
    });

    it("doesn't save changes when the input is unchanged", async () => {
        const sequences = [`${parentPid}#73`];
        editorValues.state.objectDetailsStorage[pid] = { pid, sequences };
        editorValues.state.objectDetailsStorage[parentPid] = { pid: parentPid, sortOn: "custom" };
        render(<ChildPosition pid={pid} parentPid={parentPid} />);
        const textField = screen.getByRole("textbox");
        fireEvent.blur(textField, { target: { value: "73" } });
        expect(fetchContextValues.action.fetchText).not.toHaveBeenCalled();
        expect(editorValues.action.clearPidFromChildListStorage).not.toHaveBeenCalled();
        expect(editorValues.action.removeFromObjectDetailsStorage).not.toHaveBeenCalled();
    });
});
