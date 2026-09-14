import { useEffect, useState } from "react";
import { Onboarding } from "./pages/onboarding";
import { OrgSuggestion } from "./pages/OrgSuggestion";
import { Connect } from "./pages/Connect";

type Route = "onboarding" | "org" | "connect";

function routeFromHash(): Route {
  if (window.location.hash === "#/org") return "org";
  if (window.location.hash === "#/connect") return "connect";
  return "onboarding";
}

export default function App() {
  const [route, setRoute] = useState<Route>(routeFromHash);

  useEffect(() => {
    const onHash = () => setRoute(routeFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  if (route === "org") return <OrgSuggestion />;
  if (route === "connect") return <Connect />;
  return <Onboarding />;
}
