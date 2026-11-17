"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Instant feedback for page changes: a progress bar appears the moment a link is tapped, and
 * if the next page takes more than ~250ms a branded loader covers the old page, so the screen
 * never looks frozen or blank. Hides itself as soon as the new URL renders.
 */
export function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [active, setActive] = useState(false);
  const [slow, setSlow] = useState(false);

  // New page rendered → done.
  useEffect(() => { setActive(false); setSlow(false); }, [pathname, search]);

  useEffect(() => {
    // Capture phase: next/link calls preventDefault() to navigate client-side, so a normal
    // bubbling listener would see every link click as "cancelled".
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return; // same page / #hash
      setActive(true);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    if (!active) return;
    const slowTimer = setTimeout(() => setSlow(true), 250);
    const giveUp = setTimeout(() => { setActive(false); setSlow(false); }, 15000); // never get stuck
    return () => { clearTimeout(slowTimer); clearTimeout(giveUp); };
  }, [active]);

  if (!active) return null;
  return (
    <>
      <div className="fixed inset-x-0 top-0 z-[70] h-[3px] overflow-hidden bg-mint" role="progressbar" aria-label="Loading page">
        <div className="bd-progress h-full w-1/3 bg-gradient-to-r from-green to-gold" />
      </div>
      {slow && (
        <div className="fixed inset-0 z-[65] grid place-items-center bg-cream/70 backdrop-blur-[2px]" role="status" aria-live="polite">
          <div className="relative grid h-16 w-16 place-items-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-mint" />
            <span className="serif relative grid h-14 w-14 place-items-center rounded-full bg-green text-xl font-bold text-white">BD</span>
          </div>
        </div>
      )}
    </>
  );
}
