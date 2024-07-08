import React, { Dispatch } from "react";
import { TreeItem } from "@mui/x-tree-view/TreeItem";
import { TreeView } from "@mui/x-tree-view/TreeView";

interface CategoryTreeViewProps {
    models: Record<string, string>;
    setSelectedModel: Dispatch<string>;
}

const CategoryTreeView = ({ models, setSelectedModel }: CategoryTreeViewProps): React.ReactElement => {
    function handleSelect(event, model) {
        event.preventDefault();
        // Ignore categories
        if (model.slice(0, 2) == "__") {
            return;
        }
        setSelectedModel(model);
        return false;
    }
    return (
        <TreeView defaultCollapseIcon={"➖"} defaultExpandIcon={"➕"} onNodeSelect={handleSelect}>
            {Object.entries(models).map(([category, categoryValue]) => {
                return (
                    <TreeItem key={category} nodeId={`__${category}`} label={category}>
                        {Object.entries(categoryValue).map(([model, value]) => {
                            return <TreeItem key={model} nodeId={value} label={model} />;
                        })}
                    </TreeItem>
                );
            })}
        </TreeView>
    );
};

export default CategoryTreeView;
