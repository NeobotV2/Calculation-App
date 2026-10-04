import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Link, Router, useLocation, useRoute } from "wouter";
import { RouteScope } from "./RouteScope";

function Probe() {
  const [location] = useLocation();
  const [, params] = useRoute<{ id: string; schritt?: string }>("/kalkulation/:id/:schritt?");
  return (
    <p>
      {location}|{params?.id ?? "kein Treffer"}|{params?.schritt ?? ""}
      <Link href="/objekte">Objekte</Link>
    </p>
  );
}

describe("RouteScope", () => {
  it("keeps the route a page was rendered for, even when the app location already moved on", () => {
    // Wie beim Verlassen des Flows: die App steht schon auf /print/…, die ausblendende Seite nicht.
    const html = renderToStaticMarkup(
      <Router ssrPath="/print/demo-1">
        <RouteScope location="/kalkulation/demo-1/pruefen">
          <Probe />
        </RouteScope>
      </Router>,
    );
    expect(html).toContain("/kalkulation/demo-1/pruefen|demo-1|pruefen");
  });

  it("renders hash links like the app router", () => {
    const html = renderToStaticMarkup(
      <RouteScope location="/objekte/p1">
        <Probe />
      </RouteScope>,
    );
    expect(html).toContain('href="#/objekte"');
  });
});
