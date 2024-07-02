import React from "react";
import { baseUrl } from "../../util/routes";
import Link from "next/link";

const MainMenu = (): React.ReactElement => {
    return (
        <div className="main-menu">
            <h1 className="main-menu-heading">VuDL Admin</h1>
            <h2 className="main-menu-core-functions-heading">Core Functions</h2>
            <ul className="main-menu-core-functions-list">
                <li>
                    <Link href="/paginate">Job Paginator</Link>
                </li>
                <li>
                    <Link href="/edit">Object Editor</Link>
                </li>
            </ul>
            <h2 className="main-menu-other-tools-heading">Other Tools</h2>
            <ul className="main-menu-other-tools-list">
                <li>
                    <a href={`${baseUrl}/queue`}>Arena (Job Queue Manager)</a>
                </li>
                <li>
                    <Link href="/bulk">Bulk Editor</Link>
                </li>
                <li>
                    <Link href="/pdf">PDF Generator</Link>
                </li>
                <li>
                    <Link href="/solr">Solr Indexer</Link>
                </li>
            </ul>
        </div>
    );
};

export default MainMenu;
