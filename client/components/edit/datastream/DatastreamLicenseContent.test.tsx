import React from "react";
import { describe, beforeEach, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import renderer from "react-test-renderer";
import { act } from "react-dom/test-utils";
import DatastreamLicenseContent from "./DatastreamLicenseContent";

jest.mock("@mui/material/RadioGroup", () => () => "RadioGroup");
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
const mockUseDatastreamOperation = jest.fn();
jest.mock("../../../hooks/useDatastreamOperation", () => () => {
    return mockUseDatastreamOperation();
});

describe("DatastreamLicenseContent", () => {
    let editorValues;
    let globalValues;
    let datastreamOperationValues;
    beforeEach(() => {
        editorValues = {
            state: {
                licensesCatalog: {
                    testLicenseKey: {
                        name: "testLicense",
                    },
                },
            },
        };
        globalValues = {
            action: {
                closeModal: jest.fn(),
            },
        };
        datastreamOperationValues = {
            uploadLicense: jest.fn(),
            getLicenseKey: jest.fn(),
        };
        mockUseEditorContext.mockReturnValue(editorValues);
        mockUseGlobalContext.mockReturnValue(globalValues);
        mockUseDatastreamOperation.mockReturnValue(datastreamOperationValues);
    });

    it("renders", () => {
        const tree = renderer.create(<DatastreamLicenseContent />).toJSON();
        expect(tree).toMatchSnapshot();
    });

    it("calls uploadLicense on click", async () => {
        datastreamOperationValues.uploadLicense.mockResolvedValue("upload worked");
        await act(async () => {
            await render(<DatastreamLicenseContent />);
            await fireEvent.click(screen.getByRole("button", { name: "Save" }));
        });
        expect(datastreamOperationValues.getLicenseKey).toHaveBeenCalled();
        expect(datastreamOperationValues.uploadLicense).toHaveBeenCalled();
    });

    it("can be canceled", async () => {
        await act(async () => {
            await render(<DatastreamLicenseContent />);
        });
        await fireEvent.click(screen.getByText("Cancel"));
        expect(datastreamOperationValues.uploadLicense).not.toHaveBeenCalled();
        expect(globalValues.action.closeModal).toHaveBeenCalledWith("datastream");
    });
});
