import React from "react";
import { describe, beforeEach, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DatastreamModal from "./DatastreamModal";

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
jest.mock("./DatastreamUploadModalContent", () => () => "DatastreamUploadModalContent");
jest.mock("./DatastreamDeleteModalContent", () => () => "DatastreamDeleteModalContent");

describe("DatastreamModal", () => {
    let editorValues;
    let globalValues;
    beforeEach(() => {
        editorValues = {
            state: {
                datastreamModalState: "",
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

    it("toggles the datastreamModal", async () => {
        render(<DatastreamModal />);
        await userEvent.setup().click(screen.getByRole("button"));
        expect(globalValues.action.isModalOpen).toHaveBeenCalledWith("datastream");
        expect(globalValues.action.closeModal).toHaveBeenCalledWith("datastream");
    });

    it("switches to the delete modal content", () => {
        editorValues.state.datastreamModalState = "Delete";

        render(<DatastreamModal />);
        expect(screen.queryAllByText("DatastreamDeleteModalContent")).toHaveLength(1);
        expect(globalValues.action.isModalOpen).toHaveBeenCalledWith("datastream");
    });

    it("switches to the upload modal content", () => {
        editorValues.state.datastreamModalState = "Upload";

        render(<DatastreamModal />);
        expect(screen.queryAllByText("DatastreamUploadModalContent")).toHaveLength(1);
        expect(globalValues.action.isModalOpen).toHaveBeenCalledWith("datastream");
    });
});
