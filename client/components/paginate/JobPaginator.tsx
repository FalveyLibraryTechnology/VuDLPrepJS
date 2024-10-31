import type React from "react";
import { useEffect } from "react";

import JobPaginatorZoomToggle from "./JobPaginatorZoomToggle";
import PaginatorControls from "./PaginatorControls";
import PaginatorList from "./PaginatorList";
import { usePaginatorContext } from "../../context/PaginatorContext";

import Grid from "@mui/material/Grid";
import Link from "next/link";

interface JobPaginatorProps {
    initialCategory: string;
    initialJob: string;
}

const JobPaginator = ({ initialCategory, initialJob }: JobPaginatorProps): React.ReactElement => {
    const {
        state: { category, job },
        action: { loadJob },
    } = usePaginatorContext();

    useEffect(() => {
        loadJob(initialCategory, initialJob);
    }, []);

    return (
		<>
			<ul className="breadcrumbs" style={{ marginBlockEnd: 0 }}>
				<li><Link href="/">Main Menu</Link></li>
				<li><Link href="/paginate">Paginator</Link></li>
				<li>{category}{" "}{job}</li>
			</ul>
			<Grid container id="paginator">
				<Grid item xs={6}>
					<JobPaginatorZoomToggle />
				</Grid>
				<Grid item xs={6}>
					<PaginatorControls />
					<PaginatorList />
				</Grid>
			</Grid>
		</>
    );
};

export default JobPaginator;
