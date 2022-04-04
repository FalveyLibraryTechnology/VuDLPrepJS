import React, { useEffect } from "react";
import PropTypes from "prop-types";
import ChildList from "./ChildList";
import Breadcrumbs from "./Breadcrumbs";
import ObjectSummary from "./ObjectSummary";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Link from "next/link";
import DatastreamList from "./datastream/DatastreamList";
import DatastreamModal from "./datastream/DatastreamModal";
import { useEditorContext } from "../../context/EditorContext";
import EditorSnackbar from "./EditorSnackbar";

const ObjectEditor = ({ pid }) => {
    const {
        action: { setCurrentPid, initializeModelsCatalog },
    } = useEditorContext();

    useEffect(() => {
        setCurrentPid(pid);
        initializeModelsCatalog();
    }, []);

    return (
        <div>
            <Breadcrumbs pid={pid} />
            <h1>Editor: Object {pid}</h1>
            <h2>Tools</h2>
            <ObjectSummary pid={pid} />
            <Grid container>
                <Grid item xs={4}>
                    <Box>
                        <h3>Object</h3>
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
            <ChildList pid={pid} />
            <EditorSnackbar />
        </div>
    );
};

ObjectEditor.propTypes = {
    pid: PropTypes.string,
};

export default ObjectEditor;
