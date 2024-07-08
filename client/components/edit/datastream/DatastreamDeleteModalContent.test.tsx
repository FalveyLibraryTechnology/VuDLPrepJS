import React from "react";
import { describe, beforeEach, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import renderer from "react-test-renderer";
import DatastreamDeleteModalContent from "./DatastreamDeleteModalContent";

const mockUseGlobalContext = jest.fn();
jest.mock("../../../context/GlobalContext", () => ({
    useGlobalContext: () => {
        return mockUseGlobalContext();
    },
}));
const mockUseDatastreamOperation = jest.fn();
jest.mock("../../../hooks/useDatastreamOperation", () => () => mockUseDatastreamOperation());
describe("DatastreamDeleteModalContent", () => {
    let globalValues;
    let datastreamOperationValues;
    beforeEach(() => {
        globalValues = {
            action: {
                setSnackbarState: jest.fn(),
                closeModal: jest.fn(),
            },
        };
        datastreamOperationValues = {
            deleteDatastream: jest.fn(),
        };
        mockUseGlobalContext.mockReturnValue(globalValues);
        mockUseDatastreamOperation.mockReturnValue(datastreamOperationValues);
    });

    it("renders", () => {
        const tree = renderer.create(<DatastreamDeleteModalContent />).toJSON();
        expect(tree).toMatchSnapshot();
    });

    it("calls deleteDatastream", async () => {
        render(<DatastreamDeleteModalContent />);
        await userEvent.setup().click(screen.getByText("Yes"));
        expect(datastreamOperationValues.deleteDatastream).toHaveBeenCalled();
    });

    it("can be stopped", async () => {
        render(<DatastreamDeleteModalContent />);
        await userEvent.setup().click(screen.getByText("No"));
        expect(globalValues.action.closeModal).toHaveBeenCalledWith("datastream");
    });
});
