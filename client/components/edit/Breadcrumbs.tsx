import styles from "../shared/Breadcrumbs.module.css";
import React, { useEffect, useState } from "react";
import BasicBreadcrumbs from "../shared/BasicBreadcrumbs";
import { TreeNode, processBreadcrumbData } from "../../util/Breadcrumbs";
import { useEditorContext } from "../../context/EditorContext";
import Link from "next/link";

interface BreadcrumbsProps {
    pid?: string | null;
    initiallyShallow?: boolean;
}

const Breadcrumbs = ({ pid = null, initiallyShallow = true }: BreadcrumbsProps): React.ReactElement => {
    const {
        state: { parentDetailsStorage, topLevelPids },
        action: { loadParentDetailsIntoStorage },
    } = useEditorContext();
    const [shallow, setShallow] = useState<boolean>(initiallyShallow);

    const dataForPid =
        pid !== null && Object.prototype.hasOwnProperty.call(parentDetailsStorage, pid as string)
            ? parentDetailsStorage[pid]
            : {};
    const key = shallow ? "shallow" : "full";
    const loaded = Object.prototype.hasOwnProperty.call(dataForPid, key);

    useEffect(() => {
        if (!loaded && pid !== null) {
            loadParentDetailsIntoStorage(pid, shallow);
        }
    }, [loaded, shallow]);

    // Special case: no PID, we're at the top level:
    if (pid === null) {
        return <BasicBreadcrumbs />;
    }

    if (!loaded) {
        return <span>Loading...</span>;
    }
    const treeData: Array<Array<TreeNode>> = processBreadcrumbData(parentDetailsStorage[pid][key]).paths;

    const contents = treeData.map((trail, trailIndex: number) => {
        const keySuffix = trailIndex + "_" + (shallow ? "s" : "f");
        const trailPids: Array<string> = [];
        const breadcrumbs = trail.map((breadcrumb) => {
            trailPids.push(breadcrumb.pid);
            return (
                <li key={"breadcrumb_" + breadcrumb.pid + "_" + keySuffix}>
                    <Link href={"/edit/object/" + breadcrumb.pid}>{breadcrumb.title}</Link>
                </li>
            );
        });
        // If we're in shallow mode, and our trail is non-empty and does not include the uppermost
        // top-level PID, we should show an expand control.
        if (shallow && trailPids.length > 0 && !trailPids.includes(topLevelPids[0] ?? "")) {
            breadcrumbs.unshift(
                <li key={"breadcrumb_expand_" + keySuffix}>
                    <button onClick={() => setShallow(false)}>...</button>
                </li>,
            );
        }
        breadcrumbs.unshift(
            <li key={"breadcrumb_home_" + keySuffix}>
                <Link href="/edit">Edit Home</Link>
            </li>,
        );
        breadcrumbs.unshift(
            <li key={"breadcrumb_mainmenu_" + keySuffix}>
                <Link href="/">Main Menu</Link>
            </li>,
        );
        return (
            <ul className={styles.breadcrumb} key={"breadcrumbs_" + keySuffix}>
                {breadcrumbs}
            </ul>
        );
    });
    return <>{contents}</>;
};

export default Breadcrumbs;
