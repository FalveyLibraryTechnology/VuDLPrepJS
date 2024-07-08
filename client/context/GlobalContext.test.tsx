import { describe, expect, it } from "@jest/globals";
import { renderHook, act } from "@testing-library/react";
import { GlobalContextProvider, useGlobalContext } from "./GlobalContext";

describe("useGlobalContext", () => {
    describe("setSnackbarState", () => {
        it("sets the snackbar state with text and severity", async () => {
            const { result } = await renderHook(() => useGlobalContext(), { wrapper: GlobalContextProvider });

            expect(result.current.state.snackbarState).toEqual({
                open: false,
                message: "",
                severity: "info"
            });

            await act(async () => {
                await result.current.action.setSnackbarState({
                    open: true,
                    message: "oh no!",
                    severity: "error"
                });
            });

            expect(result.current.state.snackbarState).toEqual({
                open: true,
                message: "oh no!",
                severity: "error"
            });
        });
    });

    describe("toggleModal", () => {
        it("toggles the modal", async () => {
            const { result } = await renderHook(() => useGlobalContext(), { wrapper: GlobalContextProvider });

            expect(result.current.action.isModalOpen("foo")).toEqual(false);

            await act(async () => {
                await result.current.action.toggleModal("foo");
            });

            expect(result.current.action.isModalOpen("foo")).toEqual(true);

            await act(async () => {
                await result.current.action.toggleModal("foo");
            });

            expect(result.current.action.isModalOpen("foo")).toEqual(false);

            await act(async () => {
                await result.current.action.toggleModal("foo");
            });

            expect(result.current.action.isModalOpen("foo")).toEqual(true);
        });
    });
});
