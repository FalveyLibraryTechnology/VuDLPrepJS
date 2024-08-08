import React, { useEffect, useState } from "react";
import { useEditorContext } from "../../context/EditorContext";
import Delete from "@mui/icons-material/Delete";
import { getObjectRecursiveChildPidsUrl } from "../../util/routes";
import { useFetchContext } from "../../context/FetchContext";
import { useGlobalContext } from "../../context/GlobalContext";

export interface DeleteObjectButtonProps {
    pid: string;
}

const DeleteObjectButton = ({ pid }: DeleteObjectButtonProps): React.ReactElement => {
    const {
        action: { moveObjectToParent, updateObjectState },
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
    const details = loaded ? objectDetailsStorage[pid] : {};
    useEffect(() => {
        async function loadChildren() {
            setChildPidResponse({ loading: true });
            const url = getObjectRecursiveChildPidsUrl(details.pid, 0, 0);
            const response = await fetchJSON(url);
            setChildPidResponse(response);
        }
        loadChildren();
    }, [details]);

    const performDelete = async function () {
        const msg =
            `Are you sure you wish to delete PID ${pid}` +
            (childPidResponse.numFound > 0 ? ` and its ${childPidResponse.numFound} children` : "") +
            "?";
        if (!confirm(msg)) {
            return;
        }
        setStatusMessage("Working...");
        const result = await moveObjectToParent(pid, trashPid, null);
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
