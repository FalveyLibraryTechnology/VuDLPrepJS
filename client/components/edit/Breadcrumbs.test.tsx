import React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { waitFor } from "@testing-library/react";
import renderer from "react-test-renderer";
import Breadcrumbs from "./Breadcrumbs";
import { EditorContextProvider } from "../../context/EditorContext";
import { FetchContextProvider } from "../../context/FetchContext";

describe("Breadcrumb", () => {
    let props: Record<string, string>;
    let lastRequestUrl: string;
    let breadcrumbResponse = {};

    beforeEach(() => {
        props = { pid: "foo:1234" };
        global.fetch = jest.fn((url) => {
            lastRequestUrl = url;
            return {
                ok: true,
                status: 200,
                json: async function () {
                    return breadcrumbResponse;
                },
            };
        });
    });

    async function runStandardSnapshotTest(initiallyShallow: boolean) {
        let tree;
        await renderer.act(async () => {
            tree = renderer.create(
                <FetchContextProvider>
                    <EditorContextProvider>
                        <Breadcrumbs {...{ ...props, initiallyShallow }} />
                    </EditorContextProvider>
                </FetchContextProvider>,
            );
            await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
        });
        expect(lastRequestUrl).toEqual(
            "http://localhost:9000/api/edit/object/foo%3A1234/parents" + (initiallyShallow ? "?shallow=1" : ""),
        );
        expect(tree.toJSON()).toMatchSnapshot();
    }

    function getObject(pid, title, parents = []) {
        return { pid, title, parents };
    }

    it("renders without a pid", () => {
        props = {};
        const tree = renderer.create(
            <FetchContextProvider>
                <EditorContextProvider>
                    <Breadcrumbs />
                </EditorContextProvider>
            </FetchContextProvider>,
        );
        expect(tree.toJSON()).toMatchSnapshot();
    });

    it("renders using ajax-loaded object data (no parents, shallow mode)", async () => {
        breadcrumbResponse = getObject("foo:1234", "Fake Title");
        await runStandardSnapshotTest(true);
    });

    it("renders using ajax-loaded object data (no parents, deep mode)", async () => {
        breadcrumbResponse = getObject("foo:1234", "Fake Title");
        await runStandardSnapshotTest(false);
    });

    it("renders using ajax-loaded object data (simple case, shallow mode)", async () => {
        const parent = getObject("foo:1233", "Fake Parent");
        breadcrumbResponse = getObject("foo:1234", "Fake Title", [parent]);
        await runStandardSnapshotTest(true);
    });

    it("renders using ajax-loaded object data (simple case, deep mode)", async () => {
        const parent = getObject("foo:1233", "Fake Parent");
        breadcrumbResponse = getObject("foo:1234", "Fake Title", [parent]);
        await runStandardSnapshotTest(false);
    });

    it("renders using ajax-loaded object data (many parents, shallow mode)", async () => {
        const parents = [];
        for (let $x = 0; $x < 15; $x++) {
            parents.push(getObject("foo:" + $x, "Fake Parent " + $x));
        }
        breadcrumbResponse = getObject("foo:1234", "Fake Title", parents);
        await runStandardSnapshotTest(true);
    });

    it("renders using ajax-loaded object data (many parents, deep mode)", async () => {
        const parents = [];
        for (let $x = 0; $x < 15; $x++) {
            parents.push(getObject("foo:" + $x, "Fake Parent " + $x));
        }
        breadcrumbResponse = getObject("foo:1234", "Fake Title", parents);
        await runStandardSnapshotTest(false);
    });

    it("renders using ajax-loaded object data (deep parent chain)", async () => {
        let parents = [];
        for (let $x = 0; $x < 15; $x++) {
            parents = [getObject("foo:" + $x, "Fake Parent " + $x, parents)];
        }
        breadcrumbResponse = getObject("foo:1234", "Fake Title", parents);
        await runStandardSnapshotTest(false);
    });

    it("renders using ajax-loaded object data (multiple parents with common grandparent)", async () => {
        const grandparent = getObject("foo:1232", "Fake Grandparent");
        const parent1 = getObject("foo:1233", "Fake Parent 1", [grandparent]);
        const parent2 = getObject("foo:1231", "Fake Parent 2", [grandparent]);
        breadcrumbResponse = getObject("foo:1234", "Fake Title", [parent1, parent2]);
        await runStandardSnapshotTest(false);
    });
});
