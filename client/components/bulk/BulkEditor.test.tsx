import React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act } from "react-dom/test-utils";
import { fireEvent, render, screen } from "@testing-library/react";
import renderer from "react-test-renderer";
import BulkEditor from "./BulkEditor";

const mockUseEditorContext = jest.fn();
jest.mock("../../context/EditorContext", () => ({
    useEditorContext: () => {
        return mockUseEditorContext();
    },
}));

const mockUseFetchContext = jest.fn();
jest.mock("../../context/FetchContext", () => ({
    useFetchContext: () => {
        return mockUseFetchContext();
    },
}));
jest.mock("../shared/BasicBreadcrumbs", () => () => "BasicBreadcrumbs");

describe("BulkEditor", () => {
    let editorValues;
    let fetchContextValues;
    beforeEach(() => {
        editorValues = {
            state: {
                licensesCatalog: {
                    testLicenseKey: {
                        name: "testLicense",
                    },
                },
            },
            action: {
                initializeCatalog: jest.fn(),
            },
        };
        fetchContextValues = {
            action: {
                fetchText: jest.fn(),
            },
        };
        mockUseEditorContext.mockReturnValue(editorValues);
        mockUseFetchContext.mockReturnValue(fetchContextValues);
    });

    it("renders", () => {
        const tree = renderer.create(<BulkEditor />).toJSON();
        expect(tree).toMatchSnapshot();
    });

    it("reports failure if it receives bad JSON", async () => {
        render(<BulkEditor />);
        const input = screen.getByLabelText("Search Query");
        fireEvent.blur(input, {
            target: {
                value: "*:*",
            },
        });
        const fetchButton = screen.getByText("Fetch Records");
        fetchContextValues.action.fetchText.mockResolvedValueOnce("invalid JSON");
        await act(async () => {
            fireEvent.click(fetchButton);
        });
        expect(fetchContextValues.action.fetchText).toHaveBeenCalledWith(
            "http://localhost:9000/api/edit/query/solr",
            { body: '{"query":"*:*","rows":50}', method: "POST" },
            { "Content-Type": "application/json" },
        );
        const resultList = screen.getByTitle("Selected Records");
        expect(resultList.innerHTML).toEqual("Unexpected token i in JSON at position 0");
    });

    it("changes nothing if you submit without making selections", async () => {
        render(<BulkEditor />);
        const applyButton = screen.getByText("Apply Changes");
        await act(async () => {
            fireEvent.click(applyButton);
        });
        const resultList = screen.getByTitle("Bulk Edit Results");
        expect(resultList.innerHTML).toEqual("No change requested.");
    });

    it("reports empty Solr results and takes no action if they are submitted", async () => {
        render(<BulkEditor />);
        const input = screen.getByLabelText("Search Query");
        fireEvent.blur(input, {
            target: {
                value: "*:*",
            },
        });
        const fetchButton = screen.getByText("Fetch Records");
        fetchContextValues.action.fetchText.mockResolvedValueOnce('{"numFound": 0, "docs": []}');
        await act(async () => {
            fireEvent.click(fetchButton);
        });
        expect(fetchContextValues.action.fetchText).toHaveBeenCalledWith(
            "http://localhost:9000/api/edit/query/solr",
            { body: '{"query":"*:*","rows":50}', method: "POST" },
            { "Content-Type": "application/json" },
        );
        const recordList = screen.getByTitle("Selected Records");
        expect(recordList.innerHTML).toEqual("No results found.");
        const licenseControl = screen.getByRole("combobox");
        await act(async () => {
            fireEvent.mouseDown(licenseControl);
        });
        await act(async () => {
            fireEvent.click(screen.getByText("testLicense"));
        });
        const applyButton = screen.getByText("Apply Changes");
        await act(async () => {
            fireEvent.click(applyButton);
        });
        const resultList = screen.getByTitle("Bulk Edit Results");
        expect(resultList.innerHTML).toEqual("No records selected.");
    });

    it("performs a Solr search and changes a license", async () => {
        render(<BulkEditor />);
        const input = screen.getByLabelText("Search Query");
        fireEvent.blur(input, {
            target: {
                value: "*:*",
            },
        });
        const fetchButton = screen.getByText("Fetch Records");
        fetchContextValues.action.fetchText.mockResolvedValueOnce(
            '{"numFound": 2, "docs": [{"id": "foo", "title": "Foo"}, {"id": "bar", "title": "Bar"}]}',
        );
        await act(async () => {
            fireEvent.click(fetchButton);
        });
        expect(fetchContextValues.action.fetchText).toHaveBeenCalledWith(
            "http://localhost:9000/api/edit/query/solr",
            { body: '{"query":"*:*","rows":50}', method: "POST" },
            { "Content-Type": "application/json" },
        );
        const recordList = screen.getByTitle("Selected Records");
        expect(recordList.innerHTML).toEqual("foo:\tFoo\nbar:\tBar\n");

        const licenseControl = screen.getByRole("combobox");
        await act(async () => {
            fireEvent.mouseDown(licenseControl);
        });
        await act(async () => {
            fireEvent.click(screen.getByText("testLicense"));
        });
        const applyButton = screen.getByText("Apply Changes");
        fetchContextValues.action.fetchText.mockResolvedValueOnce("success");
        fetchContextValues.action.fetchText.mockResolvedValueOnce("failure");
        await act(async () => {
            fireEvent.click(applyButton);
        });
        expect(fetchContextValues.action.fetchText).toHaveBeenCalledWith(
            "http://localhost:9000/api/edit/object/foo/datastream/LICENSE/license",
            { body: '{"licenseKey":"testLicenseKey"}', method: "POST" },
            { "Content-Type": "application/json" },
        );
        expect(fetchContextValues.action.fetchText).toHaveBeenCalledWith(
            "http://localhost:9000/api/edit/object/bar/datastream/LICENSE/license",
            { body: '{"licenseKey":"testLicenseKey"}', method: "POST" },
            { "Content-Type": "application/json" },
        );
        const resultList = screen.getByTitle("Bulk Edit Results");
        expect(resultList.innerHTML).toEqual("(1/2) foo: success\n(2/2) bar: failure\n");
    });

    it("handles errors during license updates", async () => {
        render(<BulkEditor />);
        const input = screen.getByLabelText("Search Query");
        fireEvent.blur(input, {
            target: {
                value: "*:*",
            },
        });
        const fetchButton = screen.getByText("Fetch Records");
        fetchContextValues.action.fetchText.mockResolvedValueOnce(
            '{"numFound": 2, "docs": [{"id": "foo", "title": "Foo"}, {"id": "bar", "title": "Bar"}]}',
        );
        await act(async () => {
            fireEvent.click(fetchButton);
        });
        expect(fetchContextValues.action.fetchText).toHaveBeenCalledWith(
            "http://localhost:9000/api/edit/query/solr",
            { body: '{"query":"*:*","rows":50}', method: "POST" },
            { "Content-Type": "application/json" },
        );
        const recordList = screen.getByTitle("Selected Records");
        expect(recordList.innerHTML).toEqual("foo:\tFoo\nbar:\tBar\n");

        const licenseControl = screen.getByRole("combobox");
        await act(async () => {
            fireEvent.mouseDown(licenseControl);
        });
        await act(async () => {
            fireEvent.click(screen.getByText("testLicense"));
        });
        const applyButton = screen.getByText("Apply Changes");
        fetchContextValues.action.fetchText.mockResolvedValueOnce("success");
        fetchContextValues.action.fetchText.mockRejectedValue(new Error("kaboom"));
        await act(async () => {
            fireEvent.click(applyButton);
        });
        expect(fetchContextValues.action.fetchText).toHaveBeenCalledWith(
            "http://localhost:9000/api/edit/object/foo/datastream/LICENSE/license",
            { body: '{"licenseKey":"testLicenseKey"}', method: "POST" },
            { "Content-Type": "application/json" },
        );
        expect(fetchContextValues.action.fetchText).toHaveBeenCalledWith(
            "http://localhost:9000/api/edit/object/bar/datastream/LICENSE/license",
            { body: '{"licenseKey":"testLicenseKey"}', method: "POST" },
            { "Content-Type": "application/json" },
        );
        const resultList = screen.getByTitle("Bulk Edit Results");
        expect(resultList.innerHTML).toEqual("kaboom");
    });
});
