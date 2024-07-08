import React from "react";
import { describe, expect, it, jest } from "@jest/globals";
import renderer from "react-test-renderer";
import SolrIndexer from "./SolrIndexer";

jest.mock("./SinglePidIndexer", () => () => "SinglePidIndexer");
jest.mock("./PidRangeIndexer", () => () => "PidRangeIndexer");
jest.mock("../shared/BasicBreadcrumbs", () => () => "BasicBreadcrumbs");

const mockUseFetchContext = jest.fn();
jest.mock("../../context/FetchContext", () => ({
    useFetchContext: () => {
        return mockUseFetchContext();
    },
}));

describe("SolrIndexer", () => {
    it("renders", () => {
        const tree = renderer.create(<SolrIndexer />).toJSON();
        expect(tree).toMatchSnapshot();
    });
});
