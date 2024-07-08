import React, { useState } from "react";
import ObjectLoader from "../ObjectLoader";
import PidPicker from "../PidPicker";
import { useGlobalContext } from "../../../context/GlobalContext";
import { useEditorContext } from "../../../context/EditorContext";
import { useFetchContext } from "../../../context/FetchContext";
import { getObjectLastChildPositionUrl, getParentUrl } from "../../../util/routes";

interface ParentPickerProps {
    pid: string;
}

const ParentPicker = ({ pid }: ParentPickerProps): React.ReactElement => {
    const {
        action: { setSnackbarState },
    } = useGlobalContext();
    const {
        state: { objectDetailsStorage },
        action: { clearPidFromChildListStorage, removeFromObjectDetailsStorage, removeFromParentDetailsStorage },
    } = useEditorContext();
    const {
        action: { fetchText },
    } = useFetchContext();
    const [selectedParentPid, setSelectedParentPid] = useState<string>("");
    const [position, setPosition] = useState<string>("");
    const [statusMessage, setStatusMessage] = useState<string>("");

    const loaded = Object.prototype.hasOwnProperty.call(objectDetailsStorage, selectedParentPid);
    const details = loaded ? objectDetailsStorage[selectedParentPid] : null;

    const showSnackbarMessage = (message: string, severity: string) => {
        setSnackbarState({
            open: true,
            message,
            severity,
        });
    };

    const errorCallback = (pid: string) => {
        showSnackbarMessage(`Cannot load details for ${pid}. Are you sure this is a valid PID?`, "error");
        setSelectedParentPid("");
    };

    const addParent = async () => {
        setStatusMessage("Saving...");
        const target = getParentUrl(pid, selectedParentPid);
        let result: string;
        try {
            result = await fetchText(target, { method: "PUT", body: position });
        } catch (e) {
            result = (e as Error).message ?? "Unexpected error";
        }
        if (result === "ok") {
            // Clear and reload the cached object and its parents, since these have now changed!
            removeFromObjectDetailsStorage(pid);
            removeFromParentDetailsStorage(pid);
            // Clear any cached lists belonging to the parent PID, because the
            // order has potentially changed!
            clearPidFromChildListStorage(selectedParentPid);
            showSnackbarMessage(`Successfully added ${pid} to ${selectedParentPid}`, "info");
        } else {
            showSnackbarMessage(result, "error");
        }
        setStatusMessage("");
    };

    const setToLastPosition = async () => {
        const target = getObjectLastChildPositionUrl(selectedParentPid);
        let result: string;
        try {
            result = await fetchText(target, { method: "GET" });
        } catch (e) {
            result = "0";
        }
        setPosition(parseInt(result) + 1);
    };

    const positionRequired = details && (details.sortOn ?? "") == "custom";
    const positionControl = positionRequired ? (
        <div>
            <label>
                Position: <input type="text" value={position} onChange={(e) => setPosition(e.target.value)} />
            </label>
            <button onClick={setToLastPosition}>Set to Last Position in Parent</button>
        </div>
    ) : null;

    let visibleMessage = "";
    if (positionRequired && position.length == 0) {
        visibleMessage = "Please enter a position.";
    } else if (!details) {
        visibleMessage = "Please select a valid PID.";
    } else {
        visibleMessage = statusMessage;
    }
    return (
        <>
            {selectedParentPid.length > 0 ? (
                <ObjectLoader pid={selectedParentPid} errorCallback={errorCallback} />
            ) : null}
            <PidPicker selected={selectedParentPid} setSelected={setSelectedParentPid} />
            <br />
            {positionControl}
            {visibleMessage.length == 0 ? <button onClick={addParent}>Add</button> : visibleMessage}
        </>
    );
};

export default ParentPicker;
