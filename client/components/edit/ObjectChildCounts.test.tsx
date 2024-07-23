import React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { waitFor } from "@testing-library/react";
import renderer from "react-test-renderer";
import { ObjectChildCountsProps, ObjectChildCounts } from "./ObjectChildCounts";
import { EditorContextProvider, ChildCounts } from "../../context/EditorContext";
import { FetchContextProvider } from "../../context/FetchContext";
import { GlobalContextProvider } from "../../context/GlobalContext";

jest.mock("./ObjectLoader", () => (args) => JSON.stringify(args));

function getMountedObjectChildCountsComponent(props: ObjectChildCountsProps) {
    return renderer.create(
        <GlobalContextProvider>
            <FetchContextProvider>
                <EditorContextProvider>
                    <ObjectChildCounts {...props} />
                </EditorContextProvider>
            </FetchContextProvider>
            ,
        </GlobalContextProvider>,
    );
}

describe("ObjectChildCounts", () => {
    let props: ObjectChildCountsProps;
    let lastRequestUrl: string;
    let response: ChildCounts;

    beforeEach(() => {
        props = { pid: "foo:123" };
        response = { directChildren: 5, totalDescendants: 100 };
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

    it("displays the data found in the response", async () => {
        let tree;
        await renderer.act(async () => {
            tree = getMountedObjectChildCountsComponent(props);
            await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
        });
        expect(lastRequestUrl).toEqual("http://localhost:9000/api/edit/object/foo%3A123/childCounts");
        expect(tree.toJSON()).toMatchSnapshot();
    });
});
