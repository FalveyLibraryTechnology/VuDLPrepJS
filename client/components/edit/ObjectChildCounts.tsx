import React from "react";
import { ChildCounts, useEditorContext } from "../../context/EditorContext";
import ObjectLoader from "./ObjectLoader";

export interface ObjectChildCountsProps {
    pid: string;
}

export const ObjectChildCounts = ({ pid }: ObjectChildCountsProps): React.ReactElement => {
    const {
        state: { childCountsStorage },
        action: { loadChildCountsIntoStorage },
    } = useEditorContext();
    const loaded: boolean = Object.prototype.hasOwnProperty.call(childCountsStorage, pid);
    if (!loaded) {
        loadChildCountsIntoStorage(pid);
    }
    const details: ChildCounts = loaded ? childCountsStorage[pid] : { directChildren: 0, totalDescendants: 0 };

    const stateMsg = loaded ? (
        <div>{details.directChildren} children, {details.totalDescendants} descendants</div>
    ) : (
        ""
    );
    return (
        <>
            <ObjectLoader pid={pid} />
            {stateMsg}
        </>
    );
};

export default ObjectChildCounts;
