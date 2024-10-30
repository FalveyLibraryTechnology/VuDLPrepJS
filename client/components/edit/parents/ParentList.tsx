import React, { useEffect, useState } from "react";
import { useGlobalContext } from "../../../context/GlobalContext";
import { useEditorContext } from "../../../context/EditorContext";
import Delete from "@mui/icons-material/Delete";

export interface ParentListProps {
    pid: string;
    initiallyShallow?: boolean;
}

const ParentList = ({ pid, initiallyShallow = true }: ParentListProps): React.ReactElement => {
    const {
        action: { setSnackbarState },
    } = useGlobalContext();
    const {
        state: { parentDetailsStorage },
        action: { detachObjectFromParent, loadParentDetailsIntoStorage },
    } = useEditorContext();
    const [shallow, setShallow] = useState<boolean>(initiallyShallow);
    const dataForPid = Object.prototype.hasOwnProperty.call(parentDetailsStorage, pid as string)
        ? parentDetailsStorage[pid]
        : {};
    const key = shallow ? "shallow" : "full";
    const loaded = Object.prototype.hasOwnProperty.call(dataForPid, key);

    useEffect(() => {
        if (!loaded) {
            loadParentDetailsIntoStorage(pid, shallow);
        }
    }, [loaded, shallow]);

    const showSnackbarMessage = (message: string, severity: string) => {
        setSnackbarState({
            open: true,
            message,
            severity,
        });
    };

    const deleteParent = async (parentPid: string) => {
        if (!confirm("Are you sure you wish to remove this parent?")) {
            return;
        }
        const result = await detachObjectFromParent(pid, parentPid);
        result === "ok"
            ? showSnackbarMessage(`Successfully removed ${pid} from ${parentPid}`, "info")
            : showSnackbarMessage(result, "error");
    };

    const parents = (loaded ? parentDetailsStorage[pid][key].parents ?? [] : []).map((parent) => {
        let parentChain = "";
        let nextNode = (parent.parents ?? [])[0] ?? null;
        while (nextNode) {
            parentChain = nextNode.title + (parentChain.length ? "/" : "") + parentChain;
            nextNode = (nextNode.parents ?? [])[0] ?? null;
        }
        return (
            <tr key={"parentlist_" + pid + "_" + parent.pid}>
                <td>
                    <button onClick={() => deleteParent(parent.pid)}>
                        <Delete titleAccess={`Delete parent ${parent.pid}`} />
                    </button>
                </td>
                <td>{parent.pid ?? ""}</td>
                <td>{parent.title ?? "Unknown title"}</td>
                <td>{shallow ? <button onClick={() => setShallow(false)}>Show More</button> : parentChain}</td>
            </tr>
        );
    });
    return (
        <table border={1}>
            <tbody>
                {parents.length > 0 ? (
                    parents
                ) : (
                    <tr key={"parentlist_" + pid + "_null"}>
                        <td>{loaded ? "No parents defined." : "Loading..."}</td>
                    </tr>
                )}
            </tbody>
        </table>
    );
};

export default ParentList;
