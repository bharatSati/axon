import { useEffect, useState } from "react";

export function useNearViewport(ref, margin = "240px") {
  const [near, setNear] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setNear(entry.isIntersecting),
      { rootMargin: margin },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, margin]);

  return near;
}
