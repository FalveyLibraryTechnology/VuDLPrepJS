import TrashTreeNode from "./TrashTreeNode";

describe("TrashTreeNode", () => {
    it("has basic getters for its constructor arguments", () => {
        const node = new TrashTreeNode("foo", ["bar"]);
        expect(node.pid).toEqual("foo");
        expect(node.parentPids).toEqual(["bar"]);
    });

    it("can add and remove children", () => {
        const parent = new TrashTreeNode("parent", []);
        const child1 = new TrashTreeNode("child1", ["parent"]);
        const child2 = new TrashTreeNode("child2", ["parent"]);
        parent.addChild(child1);
        parent.addChild(child2);
        expect(parent.childNodes).toEqual([child1, child2]);
        parent.removeChildByPid("child1");
        expect(parent.childNodes).toEqual([child2]);
    });

    it("does not allow children who don't acknowledge their parents", () => {
        const parent = new TrashTreeNode("parent", []);
        const disrespectfulChild = new TrashTreeNode("disrespectfulChild", []);
        let message = "";
        try {
            parent.addChild(disrespectfulChild);
        } catch (e) {
            message = e.message;
        }
        expect(message).toEqual("Cannot add child who does not recognize parent node");
    });

    it("returns itself as a first leaf when it has no children", () => {
        const parent = new TrashTreeNode("parent", []);
        expect(parent.firstLeaf).toEqual(parent);
    });

    it("recurses into children to find the first leaf", () => {
        const parent = new TrashTreeNode("parent", []);
        const child = new TrashTreeNode("child", ["parent"]);
        const grandchild = new TrashTreeNode("grandchild", ["child"]);
        parent.addChild(child);
        child.addChild(grandchild);
        expect(parent.firstLeaf).toEqual(grandchild);
    });

    it("can detect missing parent nodes", () => {
        const parent = new TrashTreeNode("parent", []);
        const child = new TrashTreeNode("child", ["parent"]);
        parent.addChild(child);
        expect(child.missingParentNodePids).toEqual(["parent"]);
        child.linkParentNode(parent);
        expect(child.missingParentNodePids).toEqual([]);
    });

    it("doesn't allow illegal parent linkages", () => {
        const child = new TrashTreeNode("child", ["parent"]);
        const boogeyman = new TrashTreeNode("boogeyman", []);
        let message = "";
        try {
            child.linkParentNode(boogeyman);
        } catch (e) {
            message = e.message;
        }
        expect(message).toEqual("Unexpected parent PID: boogeyman");
    });

    it("allows access to parent nodes", () => {
        const parent = new TrashTreeNode("parent", []);
        const child = new TrashTreeNode("child", ["parent"]);
        child.linkParentNode(parent);
        expect(child.parentNodes).toEqual([parent]);
    });
});
