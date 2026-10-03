// Point the download links at the packaged zip for the current version,
// and keep the version label in sync. Served statically; degrades gracefully.
(async () => {
  try {
    const res = await fetch("version.json", { cache: "no-store" });
    if (!res.ok) return;
    const { version } = await res.json();
    if (!version) return;

    const zipName = `nightshift-${version}.zip`;
    const zipPath = `downloads/${zipName}`;
    const label = document.getElementById("version");
    if (label) label.textContent = `v${version} · Manifest V3 · Chrome, Firefox, Edge, Brave`;

    for (const id of ["download", "zip-link"]) {
      const a = document.getElementById(id);
      if (!a) continue;
      a.setAttribute("href", zipPath);
      a.setAttribute("download", zipName);
      if (id === "zip-link") a.textContent = zipName;
    }
  } catch (e) {
    /* static hosting without version.json — links fall back to #install */
  }
})();
