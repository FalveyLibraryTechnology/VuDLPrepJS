import React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { waitFor } from "@testing-library/react";
import renderer from "react-test-renderer";
import { ChildListProps, ChildList } from "./ChildList";
import { EditorContextProvider } from "../../../context/EditorContext";
import { FetchContextProvider } from "../../../context/FetchContext";

jest.mock("@mui/material/Pagination", () => () => "Pagination");
jest.mock("./Child", () => () => "Child");
jest.mock("./SelectableChild", () => () => "SelectableChild");

function getMountedChildListComponent(props: ChildListProps) {
    return renderer.create(
        <FetchContextProvider>
            <EditorContextProvider>
                <ChildList {...props} />
            </EditorContextProvider>
        </FetchContextProvider>,
    );
}

describe("ChildList", () => {
    let props: ChildListProps;
    let lastRequestUrl: string;
    let response;

    beforeEach(() => {
        props = { pid: "", pageSize: 10 };
        response = { numFound: 1, start: 0, docs: [{ id: "foo:124", title: "hello" }] };
        global.fetch = jest.fn((url) => {
            lastRequestUrl = url as string;
            return {
                ok: true,
                status: 200,
                json: async function () {
                    return response;
                },
            };
        });
    });

    it("renders using ajax-loaded root data", async () => {
        let tree;
        await renderer.act(async () => {
            tree = getMountedChildListComponent(props);
            await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
        });
        expect(lastRequestUrl).toEqual("http://localhost:9000/api/edit/topLevelObjects?start=0&rows=10");
        expect(tree.toJSON()).toMatchSnapshot();
    });

    it("allows thumbnails to be toggled on", async () => {
        let tree;
        await renderer.act(async () => {
            tree = getMountedChildListComponent(props);
            await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
            expect(lastRequestUrl).toEqual("http://localhost:9000/api/edit/topLevelObjects?start=0&rows=10");
            tree.root.findByType("button").props.onClick();
        });
        expect(tree.toJSON()).toMatchSnapshot();
    });

    it("renders using SelectableChild when a callback is provided", async () => {
        props.selectCallback = jest.fn();
        let tree;
        await renderer.act(async () => {
            tree = getMountedChildListComponent(props);
            await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
        });
        expect(lastRequestUrl).toEqual("http://localhost:9000/api/edit/topLevelObjects?start=0&rows=10");
        expect(tree.toJSON()).toMatchSnapshot();
    });

    it("displays a paginator when appropriate", async () => {
        // with a page size of 10, the response will include 10 records, but numFound will show
        // the full result set size
        response = {
            numFound: 10000,
            start: 0,
            docs: [
                { id: "foo:124", title: "hello1" },
                { id: "foo:125", title: "hello2" },
                { id: "foo:126", title: "hello3" },
                { id: "foo:127", title: "hello4" },
                { id: "foo:128", title: "hello5" },
                { id: "foo:129", title: "hello6" },
                { id: "foo:130", title: "hello7" },
                { id: "foo:131", title: "hello8" },
                { id: "foo:132", title: "hello9" },
                { id: "foo:133", title: "hello10" },
            ],
        };
        let tree;
        await renderer.act(async () => {
            tree = getMountedChildListComponent(props);
            await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
        });
        expect(lastRequestUrl).toEqual("http://localhost:9000/api/edit/topLevelObjects?start=0&rows=10");
        expect(tree.toJSON()).toMatchSnapshot();
    });

    it("renders using ajax-loaded object data", async () => {
        props.pid = "foo:123";
        let tree;
        await renderer.act(async () => {
            tree = getMountedChildListComponent(props);
            await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
        });
        expect(lastRequestUrl).toEqual("http://localhost:9000/api/edit/object/foo%3A123/children?start=0&rows=10");
        expect(tree.toJSON()).toMatchSnapshot();
    });
});
