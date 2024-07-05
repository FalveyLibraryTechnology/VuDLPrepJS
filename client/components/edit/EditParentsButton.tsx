import React from "react";
import { useGlobalContext } from "../../context/GlobalContext";
import { useEditorContext } from "../../context/EditorContext";

export interface ObjectStatusProps {
    pid: string;
}

export const EditParentsButton = ({ pid }: ObjectStatusProps): React.ReactElement => {
    const {
        action: { openModal },
    } = useGlobalContext();

    const {
        action: { setParentsModalActivePid },
    } = useEditorContext();

    const clickAction = () => {
        setParentsModalActivePid(pid);
        openModal("parents");
    };
    return <button onClick={clickAction}>Edit Parents</button>;
};

export default EditParentsButton;
