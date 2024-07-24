const recentPidsListLimit = 10;

export function getRecentPidsCatalog(): Record<string, string> {
    try {
        return JSON.parse(sessionStorage.getItem("recentPids") ?? "{}") as Record<string, string>;
    } catch (e) {
    }
    return {};
}

export function setRecentPidsCatalog(catalog: Record<string, string>): void {
    sessionStorage.setItem("recentPids", JSON.stringify(catalog));
}

export function updateRecentPidsCatalog(pid: string, title: string): void {
    const recent = getRecentPidsCatalog();
    delete recent[pid];
    const newRecent = {[pid]: title};
    const otherPids = Object.keys(recent).slice(0, recentPidsListLimit - 1);
    otherPids.forEach((otherPid) => {
        newRecent[otherPid] = recent[otherPid];
    });
    setRecentPidsCatalog(newRecent);
}
