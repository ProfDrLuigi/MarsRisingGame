(() => {
  "use strict";

  const configuration = window.MARS_RISING_RELEASE || {};
  const repository = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(configuration.repository || "")
    ? configuration.repository : "profdrluigi/MarsRisingGame";
  const releaseRoot = `https://github.com/${repository}/releases`;
  const downloads = [...document.querySelectorAll("[data-release-download]")];
  const status = document.querySelector("[data-release-status]");
  const label = document.querySelector("[data-download-label]");
  const version = document.querySelector("[data-release-version]");
  const filename = document.querySelector("[data-release-file]");
  const filesize = document.querySelector("[data-release-size]");

  document.querySelectorAll("[data-release-page]").forEach(link => { link.href = releaseRoot; });
  downloads.forEach(link => { link.href = `${releaseRoot}/latest`; });

  function releaseFallback(message) {
    label.textContent = "View releases on GitHub";
    status.textContent = message;
    document.documentElement.dataset.releaseState = "fallback";
  }

  function trustedAssetURL(value) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && url.hostname === "github.com" &&
        url.pathname.startsWith(`/${repository}/releases/download/`) ? url.href : null;
    } catch { return null; }
  }

  async function loadRelease() {
    if (window.location.protocol === "file:") {
      releaseFallback("Find the latest download in the GitHub releases.");
      return;
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(`https://api.github.com/repos/${repository}/releases/latest`, {
        headers: { Accept: "application/vnd.github+json" }, signal: controller.signal,
      });
      if (response.status === 404) {
        downloads.forEach(link => { link.href = releaseRoot; });
        releaseFallback("A public release is not available yet. Downloads will appear on GitHub.");
        return;
      }
      if (!response.ok) throw new Error("Release lookup failed");
      const release = await response.json();
      const candidates = (Array.isArray(release.assets) ? release.assets : []).filter(asset =>
        asset && asset.state === "uploaded" && typeof asset.name === "string" &&
        /\.zip$/i.test(asset.name) && trustedAssetURL(asset.browser_download_url));
      const configured = typeof configuration.assetName === "string" ? configuration.assetName : "";
      const asset = configured ? candidates.find(item => item.name === configured)
        : candidates.length === 1 ? candidates[0]
        : candidates.find(item => /universal/i.test(item.name));
      if (typeof release.tag_name === "string" && release.tag_name.trim()) {
        version.textContent = release.tag_name.slice(0, 50);
      }
      if (!asset) {
        releaseFallback(candidates.length > 1
          ? "Choose the ZIP for your Mac in the latest GitHub release."
          : "The latest release does not have an app ZIP attached yet.");
        return;
      }
      downloads.forEach(link => { link.href = trustedAssetURL(asset.browser_download_url); });
      label.textContent = "Download release ZIP";
      filename.textContent = asset.name;
      if (Number.isFinite(asset.size) && asset.size > 0) {
        filesize.textContent = `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(asset.size / 1048576)} MB`;
      }
      const date = typeof release.published_at === "string" ? new Date(release.published_at) : new Date(NaN);
      status.textContent = Number.isNaN(date.getTime()) ? "Direct ZIP download from the latest GitHub release."
        : `Published ${new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(date)} · Download via GitHub`;
      document.documentElement.dataset.releaseState = "ready";
    } catch {
      releaseFallback("Release details are temporarily unavailable. Open the latest release on GitHub to download the app.");
    } finally { window.clearTimeout(timeout); }
  }

  // Bootstrap handles focus trapping, Escape and restoration to the image button.
  const imageModal = document.querySelector("#screenshot-modal");
  imageModal.addEventListener("show.bs.modal", event => {
    const source = event.relatedTarget;
    if (!source) return;
    const image = imageModal.querySelector(".modal-screenshot");
    image.src = source.dataset.image;
    image.alt = source.querySelector("img").alt;
    image.classList.toggle("image-smooth", source.querySelector("img").classList.contains("image-smooth"));
    imageModal.querySelector("#screenshot-title").textContent = source.dataset.title;
    imageModal.querySelector("#screenshot-caption").textContent = source.dataset.caption;
  });

  // Close the mobile navigation after choosing a section.
  document.querySelectorAll("#navigation a").forEach(link => {
    link.addEventListener("click", () => {
      const navigation = document.querySelector("#navigation");
      if (navigation.classList.contains("show") && window.bootstrap) {
        window.bootstrap.Collapse.getOrCreateInstance(navigation).hide();
      }
    });
  });

  void loadRelease();
})();
