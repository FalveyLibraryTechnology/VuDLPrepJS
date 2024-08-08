import React, { useEffect, useState } from "react";
import { useEditorContext } from "../../context/EditorContext";
import Delete from "@mui/icons-material/Delete";
import { getObjectParentsUrl, getObjectRecursiveChildPidsUrl } from "../../util/routes";
import { useFetchContext } from "../../context/FetchContext";
import { useGlobalContext } from "../../context/GlobalContext";

export interface DeleteObjectButtonProps {
    pid: string;
}

const DeleteObjectButton = ({ pid }: DeleteObjectButtonProps): React.ReactElement => {
    const {
        action: { attachObjectToParent, getParentCountForPid, moveObjectToParent, updateObjectState },
        state: { objectDetailsStorage, trashPid },
    } = useEditorContext();
    const {
        action: { fetchJSON },
    } = useFetchContext();
    const {
        action: { setSnackbarState },
    } = useGlobalContext();

    const showSnackbarMessage = (message: string, severity: string) => {
        setSnackbarState({
            open: true,
            message,
            severity,
        });
    };

    const [childPidResponse, setChildPidResponse] = useState({ loading: true });
    const [statusMessage, setStatusMessage] = useState<string>("");
    const loaded = Object.prototype.hasOwnProperty.call(objectDetailsStorage, pid);
    useEffect(() => {
        async function loadChildren() {
            const url = getObjectRecursiveChildPidsUrl(pid, 0, 0);
            const response = await fetchJSON(url);
            setChildPidResponse(response);
        }
        setChildPidResponse({ loading: true });
        if (loaded) {
            loadChildren();
        }
    }, [loaded]);

    const performDelete = async function () {
        const msg =
            `Are you sure you wish to delete PID ${pid}` +
            (childPidResponse.numFound > 0 ? ` and its ${childPidResponse.numFound} children` : "") +
            "?";
        if (!confirm(msg)) {
            return;
        }
        setStatusMessage("Working...");
        // Get the parent count from storage (if possible) or the API (if necessary); we'll need this to pick the right operation.
        let parentCount = getParentCountForPid(pid);
        if (parentCount === null) {
            const url = getObjectParentsUrl(pid, true);
            try {
                const parentDetails = await fetchJSON(url);
                parentCount = parentDetails.parents.length;
            } catch (e) {
                showSnackbarMessage(e.message, "error");
                setStatusMessage("");
                return;
            }
        }
        // Move only works for objects with parents already; if we have no parents, we need to attach to trash instead:
        const result = await (parentCount === 0
            ? attachObjectToParent(pid, trashPid, "")
            : moveObjectToParent(pid, trashPid, ""));
        if (result === "ok") {
            showSnackbarMessage(`Successfully moved ${pid} to ${trashPid}`, "info");
        } else {
            showSnackbarMessage(result, "error");
            setStatusMessage("");
            return;
        }
        try {
            const stateResult = await updateObjectState(pid, "Deleted", childPidResponse.numFound, (msg) => {
                showSnackbarMessage(msg, "info");
            });
            showSnackbarMessage(...stateResult);
        } catch (e) {
            showSnackbarMessage(e.message, "error");
        }
        showSnackbarMessage("Delete operation complete.", "info");
        setStatusMessage("");
    };
    const visible = statusMessage.length === 0 && trashPid && loaded && childPidResponse?.loading !== true;
    return visible ? (
        <button onClick={performDelete}>
            <Delete style={{ height: "14px" }} titleAccess="Delete Object and Children" />
        </button>
    ) : (
        <>{statusMessage}</>
    );
};

export default DeleteObjectButton;
