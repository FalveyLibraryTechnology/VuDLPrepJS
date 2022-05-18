import React from "react";
import ChildList from "./children/ChildList";
import { EditorContextProvider } from "../../context/EditorContext";
import Link from "next/link";

const EditHome = (): React.ReactElement => {
    return (
        <div>
            <h1>Editor</h1>
            <h2>Tools</h2>
            <ul>
                <li>
                    <Link href="/edit/newChild">Create New Top-Level Object</Link>
                </li>
            </ul>
            <h2>Contents</h2>
            <EditorContextProvider>
                <ChildList pid="" />
            </EditorContextProvider>
        </div>
    );
};

export default EditHome;
