import React, { useEffect } from "react";
import ChildList from "./children/ChildList";
import { ChildListContextProvider } from "../../context/ChildListContext";
import Breadcrumbs from "./Breadcrumbs";
import ObjectSummary from "./ObjectSummary";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Link from "next/link";
import DatastreamList from "./datastream/DatastreamList";
import DatastreamModal from "./datastream/DatastreamModal";
import { useEditorContext } from "../../context/EditorContext";
import EditorSnackbar from "./EditorSnackbar";

interface ObjectEditorProps {
    pid: string;
}

const ObjectEditor = ({ pid }: ObjectEditorProps): React.ReactElement => {
    const {
        action: { initializeCatalog, loadObjectDetails },
    } = useEditorContext();

    useEffect(() => {
        loadObjectDetails(pid);
        initializeCatalog();
    }, []);

    return (
        <div>
            <Breadcrumbs pid={pid} />
            <h1>Editor: Object {pid}</h1>
            <ObjectSummary />
            <Grid container>
                <Grid item xs={4}>
                    <Box>
                        <h3>Object Tools</h3>
                        <ul>
                            <li>
                                <Link href={`/edit/object/${pid}/newChild`}>Create New Child Object</Link>
                            </li>
                        </ul>
                    </Box>
                </Grid>
                <Grid item xs={4}>
                    <Box>
                        <h3>Datastreams</h3>
                        <DatastreamList />
                    </Box>
                </Grid>
            </Grid>

            <DatastreamModal />
            <h2>Contents</h2>
            <ChildListContextProvider>
                <ChildList pid={pid} />
            </ChildListContextProvider>
            <EditorSnackbar />
        </div>
    );
};

export default ObjectEditor;
