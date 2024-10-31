import React from "react";
import styles from "./ObjectButtonBar.module.css";

import { useEditorContext } from "../../context/EditorContext";
import ObjectPreviewButton from "./ObjectPreviewButton";
import ObjectStatus from "./ObjectStatus";
import EditParentsButton from "./EditParentsButton";
import DeleteObjectButton from "./DeleteObjectButton";

import RefreshIcon from "@mui/icons-material/Refresh";

export interface ObjectButtonBarProps {
	pid: string;
}

const ObjectButtonBar = ({ pid }: ObjectButtonBarProps): React.ReactElement => {
	const {
		action: { clearPidFromChildListStorage },
	} = useEditorContext();

	return (
		<div className={styles.objectBar}>
			<ObjectStatus pid={pid} />
			<EditParentsButton pid={pid} />
			<button
				type="button"
				className={styles.refreshBtn}
				onClick={() => clearPidFromChildListStorage(pid)}
				title="Refresh children"
			>
				<RefreshIcon /> Refresh
			</button>
			<ObjectPreviewButton pid={pid} />
			<DeleteObjectButton pid={pid} />
		</div>
	);
};

export default ObjectButtonBar;
