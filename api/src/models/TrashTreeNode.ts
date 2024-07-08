class TrashTreeNode {
    protected _pid: string;
    protected _parentPids: Array<string>;
    protected _parentNodes: Record<string, TrashTreeNode> = {};
    protected _childNodes: Array<TrashTreeNode> = [];

    constructor(pid: string, parentPids: Array<string>) {
        this._pid = pid;
        this._parentPids = parentPids;
    }

    addChild(node: TrashTreeNode): void {
        if (!node.parentPids.includes(this._pid)) {
            throw new Error("Cannot add child who does not recognize parent node");
        }
        if (!this.hasChildPid(node.pid)) {
            this._childNodes.push(node);
        }
    }

    hasChildPid(pid: string): boolean {
        return this._childNodes.filter((node) => node.pid === pid).length > 0;
    }

    removeChildByPid(pid: string): void {
        this._childNodes = this._childNodes.filter((node) => node.pid !== pid);
    }

    get childNodes(): Array<TrashTreeNode> {
        return this._childNodes;
    }

    get firstLeaf(): TrashTreeNode {
        // If we have children, pick a leaf from among them; otherwise, we are the leaf!
        for (const node of this._childNodes) {
            return node.firstLeaf;
        }
        return this;
    }

    linkParentNode(node: TrashTreeNode): void {
        if (this.parentPids.includes(node.pid)) {
            this._parentNodes[node.pid] = node;
            node.addChild(this);
        } else {
            throw new Error(`Unexpected parent PID: ${node.pid}`);
        }
    }

    get parentNodes(): Array<TrashTreeNode> {
        return Object.values(this._parentNodes);
    }

    get pid(): string {
        return this._pid;
    }

    get parentPids(): Array<string> {
        return this._parentPids;
    }

    get missingParentNodePids(): Array<string> {
        const existingNodes = Object.keys(this._parentNodes);
        return this.parentPids.filter((x) => !existingNodes.includes(x));
    }
}

export default TrashTreeNode;
