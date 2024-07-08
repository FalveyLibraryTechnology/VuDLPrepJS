import { describe, expect, it } from "@jest/globals";
import { renderHook, act } from "@testing-library/react";
import { ProcessMetadataContextProvider, useProcessMetadataContext } from "./ProcessMetadataContext";

describe("useProcessMetadataContext", () => {
    it("allows task manipulation", async () => {
        const { result } = await renderHook(() => useProcessMetadataContext(), { wrapper: ProcessMetadataContextProvider });
        act(() => {
            result.current.action.addTask(0);
            result.current.action.updateTaskAttributes(0, { label: "foo", toolLabel: "bar" });
            result.current.action.addTask(1);   // add at end
            result.current.action.addTask(0);   // add at top, push others down
            result.current.action.updateTaskAttribute(0, "sequence", "first");
            result.current.action.updateTaskAttribute(2, "sequence", "last");
        });
        expect(result.current.state.tasks).toEqual([
            {
                "description": "",
                "id": "1",
                "individual": "",
                "label": "",
                "sequence": "first",
                "toolDescription": "",
                "toolLabel": "",
                "toolMake": "",
                "toolSerialNumber": "",
                "toolVersion": "",
              },
              {
                "description": "",
                "id": "2",
                "individual": "",
                "label": "foo",
                "sequence": "1",
                "toolDescription": "",
                "toolLabel": "bar",
                "toolMake": "",
                "toolSerialNumber": "",
                "toolVersion": "",
              },
              {
                "description": "",
                "id": "3",
                "individual": "",
                "label": "",
                "sequence": "last",
                "toolDescription": "",
                "toolLabel": "",
                "toolMake": "",
                "toolSerialNumber": "",
                "toolVersion": "",
              },              
        ]);
        act(() => {
            result.current.action.deleteTask(1);
        })
        expect(result.current.state.tasks).toEqual([
            {
                "description": "",
                "id": "1",
                "individual": "",
                "label": "",
                "sequence": "first",
                "toolDescription": "",
                "toolLabel": "",
                "toolMake": "",
                "toolSerialNumber": "",
                "toolVersion": "",
              },
              {
                "description": "",
                "id": "2",
                "individual": "",
                "label": "",
                "sequence": "last",
                "toolDescription": "",
                "toolLabel": "",
                "toolMake": "",
                "toolSerialNumber": "",
                "toolVersion": "",
              },              
        ]);
    });

    it("allows setting of top-level metadata", async () => {
        const { result } = await renderHook(() => useProcessMetadataContext(), { wrapper: ProcessMetadataContextProvider });
        act(() => {
            result.current.action.setProcessCreator("foo");
            result.current.action.setProcessDateTime ("bar");
            result.current.action.setProcessLabel("baz");
            result.current.action.setProcessOrganization("xyzzy");
        })
        expect(result.current.state).toEqual({
            "processCreator": "foo",
            "processDateTime": "bar",
            "processLabel": "baz",
            "processOrganization": "xyzzy",
        });
    });

    describe("setMetadata", () => {
        it("sets the current metadata", async () => {
            const metadata = { processLabel: "test" };
            const { result } = await renderHook(() => useProcessMetadataContext(), { wrapper: ProcessMetadataContextProvider });

            expect(result.current.state).not.toEqual(metadata);

            act(() => {
                result.current.action.setMetadata(metadata);
            });

            expect(result.current.state).toEqual(metadata);
        });
    });
});
