import React from "react";
import { useEditorContext } from "../../context/EditorContext";
import ObjectPreviewButton from "./ObjectPreviewButton";
import ObjectStatus from "./ObjectStatus";
import Refresh from "@mui/icons-material/Refresh";
import EditParentsButton from "./EditParentsButton";
import DeleteObjectButton from "./DeleteObjectButton";

export interface ObjectButtonBarProps {
    pid: string;
}

const ObjectButtonBar = ({ pid }: ObjectButtonBarProps): React.ReactElement => {
    const {
        action: { clearPidFromChildListStorage },
    } = useEditorContext();

    return (
        <>
            <ObjectStatus pid={pid} />
            <EditParentsButton pid={pid} />
            <button onClick={() => clearPidFromChildListStorage(pid)}>
                <Refresh style={{ height: "14px" }} titleAccess="Refresh children" />
            </button>
            <ObjectPreviewButton pid={pid} />
            <DeleteObjectButton pid={pid} />
        </>
    );
};

export default ObjectButtonBar;
