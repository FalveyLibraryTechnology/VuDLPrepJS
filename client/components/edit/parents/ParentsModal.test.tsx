import React from "react";
import { describe, beforeEach, expect, it, jest } from "@jest/globals";
import renderer from "react-test-renderer";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ParentsModal from "./ParentsModal";

const mockUseEditorContext = jest.fn();
jest.mock("../../../context/EditorContext", () => ({
    useEditorContext: () => {
        return mockUseEditorContext();
    },
}));
const mockUseGlobalContext = jest.fn();
jest.mock("../../../context/GlobalContext", () => ({
    useGlobalContext: () => {
        return mockUseGlobalContext();
    },
}));
jest.mock("@mui/material/Dialog", () => (props) => props.children);
jest.mock("@mui/material/DialogContent", () => (props) => props.children);
jest.mock("@mui/material/DialogTitle", () => (props) => props.children);
jest.mock("@mui/material/Grid", () => (props) => props.children);
jest.mock("../ObjectLoader", () => (props) => "ObjectLoader: " + JSON.stringify(props));
jest.mock("./ParentList", () => (props) => "ParentList: " + JSON.stringify(props));
jest.mock("./ParentPicker", () => (props) => "ParentPicker: " + JSON.stringify(props));

describe("ParentsModal", () => {
    let editorValues;
    let globalValues;
    let pid: string;
    beforeEach(() => {
        pid = "foo:123";
        editorValues = {
            state: {
                objectDetailsStorage: {},
                isParentsModalOpen: true,
                parentsModalActivePid: pid,
            },
        };
        mockUseEditorContext.mockReturnValue(editorValues);
        globalValues = {
            action: {
                closeModal: jest.fn(),
                isModalOpen: jest.fn(),
            },
        };
        mockUseGlobalContext.mockReturnValue(globalValues);
        globalValues.action.isModalOpen.mockReturnValue(true);
    });

    it("renders correctly for a non-loaded PID", () => {
        const tree = renderer.create(<ParentsModal />).toJSON();
        expect(tree).toMatchSnapshot();
        expect(globalValues.action.isModalOpen).toHaveBeenCalledWith("parents");
    });

    it("renders correctly for a loaded PID", () => {
        editorValues.state.objectDetailsStorage[pid] = { pid };
        const tree = renderer.create(<ParentsModal />).toJSON();
        expect(tree).toMatchSnapshot();
        expect(globalValues.action.isModalOpen).toHaveBeenCalledWith("parents");
    });

    it("renders correctly when PID is unset", () => {
        editorValues.state.parentsModalActivePid = null;
        const tree = renderer.create(<ParentsModal />).toJSON();
        expect(tree).toMatchSnapshot();
        expect(globalValues.action.isModalOpen).toHaveBeenCalledWith("parents");
    });

    it("toggles the modal", async () => {
        render(<ParentsModal />);
        await userEvent.setup().click(screen.getByRole("button"));
        expect(globalValues.action.closeModal).toHaveBeenCalledWith("parents");
    });
});
