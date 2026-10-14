import { useEffect, useState } from "react";
export function readRoute() {
  const [path, query = ""] = (window.location.hash.slice(1) || "/").split("?");
  return { path, params: new URLSearchParams(query) };
}
export function useRoute() {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const change = () => setRoute(readRoute());
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  return route;
}
export function navigate(path) {
  window.location.hash = path;
}
export function queryRoute(path, changes, current = new URLSearchParams()) {
  const params = new URLSearchParams(current);
  for (const [key, value] of Object.entries(changes))
    value ? params.set(key, String(value)) : params.delete(key);
  return path + (params.size ? "?" + params.toString() : "");
}
