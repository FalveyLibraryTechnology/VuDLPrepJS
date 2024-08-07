import React, { useState } from "react";
import ObjectLoader from "../ObjectLoader";
import PidPicker from "../PidPicker";
import { useGlobalContext } from "../../../context/GlobalContext";
import { useEditorContext } from "../../../context/EditorContext";
import { useFetchContext } from "../../../context/FetchContext";
import { getObjectLastChildPositionUrl } from "../../../util/routes";

interface ParentPickerProps {
    pid: string;
}

const ParentPicker = ({ pid }: ParentPickerProps): React.ReactElement => {
    const {
        action: { setSnackbarState },
    } = useGlobalContext();
    const {
        state: { objectDetailsStorage, parentDetailsStorage },
        action: { attachObjectToParent },
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
        const result = await attachObjectToParent(pid, selectedParentPid, position);
        result === "ok"
            ? showSnackbarMessage(`Successfully added ${pid} to ${selectedParentPid}`, "info")
            : showSnackbarMessage(result, "error");
        setStatusMessage("");
    };

    const getParentCount = (): number => {
        const dataForPid = Object.prototype.hasOwnProperty.call(parentDetailsStorage, pid as string)
            ? parentDetailsStorage[pid]
            : {};
        return (dataForPid["shallow"]?.parents ?? dataForPid["full"]?.parents ?? []).length;
    };

    const moveToParent = async () => {
        const parentCount = getParentCount();
        if (parentCount > 1) {
            if (!confirm(`Are you sure you wish to move this object? ${parentCount} parents will be deleted.`)) {
                return;
            }
        }
        alert("move!");
    };

    const setToLastPosition = async () => {
        const target = getObjectLastChildPositionUrl(selectedParentPid);
        let result: string;
        try {
            result = await fetchText(target, { method: "GET" });
        } catch (e) {
            result = "0";
        }
        setPosition((parseInt(result) + 1).toString());
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
            {visibleMessage.length == 0 ? (
                <>
                    <button onClick={addParent}>Add Parent</button>
                    <button onClick={moveToParent}>Move Here</button>
                </>
            ) : (
                visibleMessage
            )}
        </>
    );
};

export default ParentPicker;
