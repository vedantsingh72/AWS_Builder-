import { useEffect, useState } from "react";
import { Onboarding } from "./pages/onboarding";
import { OrgSuggestion } from "./pages/OrgSuggestion";

function routeFromHash(): "onboarding" | "org" {
  return window.location.hash === "#/org" ? "org" : "onboarding";
}

export default function App() {
  const [route, setRoute] = useState<"onboarding" | "org">(routeFromHash);

  useEffect(() => {
    const onHash = () => setRoute(routeFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return route === "org" ? <OrgSuggestion /> : <Onboarding />;
}
