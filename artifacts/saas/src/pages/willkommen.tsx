import { useEffect, useState, type ReactNode } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  Building2,
  Calculator,
  FileText,
  ShieldCheck,
  FileStack,
  BarChart3,
  Check,
  Clock,
  TrendingUp,
  Menu,
  X,
  Star,
  ChevronDown,
  Mail,
  CircleCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { useStore } from "@/store/use-store";
import { PRICING, formatCents, FOUNDING_CONFIG } from "@/lib/billing-config";
import {
  trackLandingViewed,
  trackLandingCtaClicked,
  trackSignupStarted,
} from "@/services/analytics-service";
import { submitLead } from "@/services/lead-service";

/* ─────────────────────────────────────────────────────────────────────────
   CleanCalc Pro — Öffentliche Marketing-Landingpage (Top of Funnel)
   Erste Anlaufstelle für neue Besucher: Wertversprechen, Funktionen,
   Preise und klare Handlungsaufforderungen zur Aktivierung.
   ───────────────────────────────────────────────────────────────────────── */

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.3, ease: "easeOut", delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function LeadCaptureForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "loading") return;
    setError("");
    setStatus("loading");
    const result = await submitLead({ email, source: "landing_newsletter" });
    if (result.ok) {
      setStatus("success");
    } else {
      setStatus("idle");
      setError(result.error || "Eintragen fehlgeschlagen.");
    }
  };

  if (status === "success") {
    return (
      <div role="status" className="flex items-center justify-center gap-2 rounded-lg bg-success-soft px-5 py-4 font-medium text-success">
        <CircleCheck className="size-5" aria-hidden="true" /> Eingetragen – danke! Wir melden uns mit nützlichen Tipps.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ihre@firma.de"
          aria-label="E-Mail-Adresse"
          inputSize="lg"
          className="flex-1"
          required
        />
        <Button type="submit" size="lg" className="shrink-0" loading={status === "loading"}>
          {status !== "loading" && <Mail aria-hidden="true" />}
          Auf dem Laufenden bleiben
        </Button>
      </div>
      {error && <p role="alert" className="text-left text-sm text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground text-left">
        Praxistipps zur Kalkulation & Produkt-Updates. Kein Spam, jederzeit abbestellbar.
      </p>
    </form>
  );
}

const FEATURES = [
  {
    icon: Building2,
    title: "Objektkalkulation",
    text: "Raumbasierte Kalkulation mit über 125 Raumtypen nach BIV/RAL-Leistungswerten. Verschmutzungs- und Möblierungsgrad fließen automatisch ein.",
  },
  {
    icon: Calculator,
    title: "Verrechnungssatz-Kalkulator",
    text: "Vom Tariflohn LG1 über SV-Anteil, Ausfallzeiten und Gemeinkosten bis zur Gewinnmarge — Ihr belastbarer Verrechnungssatz in 5 Schritten.",
  },
  {
    icon: FileText,
    title: "Angebot als PDF",
    text: "Aus der Kalkulation wird auf Knopfdruck ein druckfertiges, professionelles Angebot — mit Ihrem Logo und Ihrer Handschrift.",
  },
  {
    icon: ShieldCheck,
    title: "Plausibilitätsprüfung",
    text: "Automatische Warnungen bei zu knappen Margen, unrealistischen Leistungswerten oder unvollständigen Leistungsverzeichnissen.",
  },
  {
    icon: FileStack,
    title: "Vorlagen",
    text: "Bewährte Leistungsverzeichnisse einmal anlegen und für ähnliche Objekte wiederverwenden — kalkulieren in Minuten statt Stunden.",
  },
  {
    icon: BarChart3,
    title: "Controlling & KPIs",
    text: "Monatsumsatz, Ø Marge, Stunden pro Monat und €/m² immer im Blick — die Steuerungskennzahlen für Ihr Reinigungsgeschäft.",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Objekt anlegen",
    text: "Kunde, Anschrift und Reinigungsintervall erfassen — oder eine Vorlage als Startpunkt wählen.",
  },
  {
    n: "2",
    title: "Räume & Leistungen erfassen",
    text: "Flächen, Raumtypen und Zu-/Abschläge eintragen. Stunden und Kosten werden in Echtzeit berechnet.",
  },
  {
    n: "3",
    title: "Angebot exportieren",
    text: "Marge prüfen, Plausibilitätshinweise abarbeiten und das fertige Angebot als PDF an den Auftraggeber senden.",
  },
];

const PAINS = [
  {
    icon: Clock,
    title: "Stundenlange Excel-Kalkulationen",
    text: "Verschachtelte Tabellen, die niemand außer Ihnen versteht — und bei jeder Anfrage von vorne.",
  },
  {
    icon: TrendingUp,
    title: "Margen, die zu knapp kalkuliert sind",
    text: "Ohne sauberen Verrechnungssatz arbeiten Objekte schnell unter Deckungsbeitrag — und Sie merken es zu spät.",
  },
  {
    icon: FileText,
    title: "Angebote, die unprofessionell wirken",
    text: "Ein zusammenkopiertes Word-Dokument verschenkt Vertrauen — und am Ende den Auftrag.",
  },
];

const FAQ = [
  {
    q: "Für wen ist CleanCalc Pro gemacht?",
    a: "Für Gebäudereiniger, Objektleiter und Kalkulatoren in der Unterhaltsreinigung, die Angebote schnell, nachvollziehbar und mit gesunder Marge erstellen wollen — vom Einzelunternehmer bis zum mittelständischen Reinigungsbetrieb.",
  },
  {
    q: "Auf welcher Grundlage wird kalkuliert?",
    a: "Die hinterlegten Leistungswerte orientieren sich an den branchenüblichen BIV/RAL-Richtwerten. Über Zu- und Abschläge für Verschmutzungs- und Möblierungsgrad sowie Bodenbelag passen Sie die Kalkulation präzise an die Realität jedes Objekts an.",
  },
  {
    q: "Kann ich die App kostenlos testen?",
    a: "Ja. Im kostenlosen Basic-Plan kalkulieren Sie ein vollständiges Objekt — ohne Kreditkarte, ohne Zeitlimit. Für unbegrenzte Objekte, PDF-Export und Vorlagen wechseln Sie jederzeit in den Pro-Plan.",
  },
  {
    q: "Sind meine Daten sicher?",
    a: "Mit einem Konto werden Ihre Kalkulationen verschlüsselt in der Cloud gesichert und über Ihre Geräte synchronisiert. Ohne Konto bleiben alle Daten lokal auf Ihrem Gerät. Die App ist DSGVO-konform und in Deutschland für den deutschen Markt gebaut.",
  },
  {
    q: "Brauche ich eine Schulung?",
    a: "Nein. Die App führt Sie Schritt für Schritt durch die Kalkulation. Wer schon einmal ein Objekt kalkuliert hat, ist in wenigen Minuten startklar.",
  },
];

export default function Willkommen() {
  const [, setLocation] = useLocation();
  const setHasSeenSplash = useStore((s) => s.setHasSeenSplash);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    // Erster Kontakt gilt als gesehen — gibt die App-Navigation frei.
    setHasSeenSplash();
    trackLandingViewed();
  }, [setHasSeenSplash]);

  const goStart = (cta: string) => {
    trackLandingCtaClicked(cta);
    setHasSeenSplash();
    // Wer schon eingerichtet ist, startet in der App — ein zweites Onboarding würde Daten überschreiben.
    setLocation(useStore.getState().hasOnboarded ? "/" : "/onboarding");
  };

  const goLogin = () => {
    trackLandingCtaClicked("login");
    setLocation("/login");
  };

  const goRegister = (cta: string) => {
    trackLandingCtaClicked(cta);
    trackSignupStarted("landing");
    setLocation("/register");
  };

  const proFromMonthly = formatCents(PRICING.proAnnual.effectiveMonthlyFromAnnualCents);
  const proMonthly = formatCents(PRICING.proMonthly.monthlyPriceCents);
  const foundingMonthly = formatCents(PRICING.foundingAnnual.effectiveMonthlyFromAnnualCents);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ── Sticky Navigation ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-sticky border-b border-border bg-background pt-safe">
        <div className="max-w-6xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div aria-hidden="true" className="flex size-9 items-center justify-center rounded-md bg-primary shadow-surface">
              <Sparkles className="size-5 text-primary-foreground" strokeWidth={2} />
            </div>
            <span className="text-h3 font-bold">
              CleanCalc <span className="text-primary">Pro</span>
            </span>
          </div>

          <nav aria-label="Seitenbereiche" className="hidden md:flex items-center gap-1">
            <button onClick={() => scrollToId("funktionen")} className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Funktionen</button>
            <button onClick={() => scrollToId("ablauf")} className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Ablauf</button>
            <button onClick={() => scrollToId("preise")} className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Preise</button>
            <button onClick={() => scrollToId("faq")} className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">FAQ</button>
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={goLogin}>Anmelden</Button>
            <Button size="sm" onClick={() => goStart("nav")}>Kostenlos starten</Button>
          </div>

          <button
            className="md:hidden flex size-11 items-center justify-center rounded-md text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setMobileNavOpen((o) => !o)}
            aria-label={mobileNavOpen ? "Menü schließen" : "Menü öffnen"}
            aria-expanded={mobileNavOpen}
          >
            {mobileNavOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          </button>
        </div>

        {mobileNavOpen && (
          <div className="md:hidden border-t border-border bg-background px-5 py-4 space-y-1">
            {[
              { id: "funktionen", label: "Funktionen" },
              { id: "ablauf", label: "Ablauf" },
              { id: "preise", label: "Preise" },
              { id: "faq", label: "FAQ" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => { setMobileNavOpen(false); scrollToId(item.id); }}
                className="block w-full text-left px-3 py-2 min-h-11 rounded-md text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                {item.label}
              </button>
            ))}
            <div className="pt-2 grid grid-cols-2 gap-2">
              <Button variant="secondary" size="sm" onClick={goLogin}>Anmelden</Button>
              <Button size="sm" onClick={() => goStart("nav_mobile")}>Starten</Button>
            </div>
          </div>
        )}
      </header>

      <main id="main-content">
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative">
        <div className="max-w-6xl mx-auto px-5 md:px-8 pt-12 pb-12 md:pt-24 md:pb-20 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary mb-6"
            >
              <Sparkles className="size-4" aria-hidden="true" /> Für professionelle Gebäudereiniger
            </motion.div>
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.05 }}
              className="text-h1 md:text-display font-bold mb-5"
            >
              Reinigungsangebote, die rechnen — in&nbsp;Minuten statt&nbsp;Stunden.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl"
            >
              Kalkulieren Sie Objekte nach BIV/RAL-Leistungswerten, ermitteln Sie Ihren belastbaren
              Verrechnungssatz und erstellen Sie druckfertige Angebote — alles in einer App.
            </motion.p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.15 }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <Button size="lg" onClick={() => goStart("hero_primary")}>
                Jetzt kostenlos kalkulieren <ArrowRight aria-hidden="true" />
              </Button>
              <Button size="lg" variant="secondary" onClick={() => { trackLandingCtaClicked("hero_features"); scrollToId("funktionen"); }}>
                Funktionen ansehen
              </Button>
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.25 }}
              className="text-sm text-muted-foreground mt-5 flex flex-wrap items-center gap-x-4 gap-y-1"
            >
              <span className="inline-flex items-center gap-1.5"><Check className="size-4 text-success" aria-hidden="true" /> Keine Kreditkarte nötig</span>
              <span className="inline-flex items-center gap-1.5"><Check className="size-4 text-success" aria-hidden="true" /> In 2 Minuten startklar</span>
            </motion.p>
          </div>

          {/* Hero-Visual: stilisiertes Kalkulations-Resultat */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2, ease: "easeOut" }}
            className="relative"
          >
            <div className="rounded-lg border border-border bg-card p-5 shadow-raised md:p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-overline uppercase text-muted-foreground mb-1">Objektkalkulation</p>
                  <p className="font-semibold text-lg">Bürogebäude Hansaring</p>
                </div>
                <StatusBadge tone="success" size="sm" label="Angebotsbereit" />
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { l: "Fläche", v: "2.480 m²" },
                  { l: "Std / Monat", v: "168,5 h" },
                  { l: "Monatsumsatz", v: "4.385 €" },
                  { l: "Ø Marge", v: "21,4 %", accent: true },
                ].map((k) => (
                  <div key={k.l} className="rounded-md border border-border bg-surface-sunken p-3">
                    <p className="text-label text-muted-foreground mb-1">{k.l}</p>
                    <p className={`text-kpi tabular-nums ${k.accent ? "text-primary" : "text-foreground"}`}>{k.v}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {[
                  { name: "Büroflächen · 5× wöch.", val: "1.940 €" },
                  { name: "Sanitärbereiche · täglich", val: "1.310 €" },
                  { name: "Verkehrsflächen · 3× wöch.", val: "1.135 €" },
                ].map((r) => (
                  <div key={r.name} className="flex items-center justify-between text-sm rounded-md bg-surface-sunken px-3 py-2">
                    <span className="text-muted-foreground">{r.name}</span>
                    <span className="font-semibold tabular-nums">{r.val}</span>
                  </div>
                ))}
              </div>
              <Button className="w-full mt-4" variant="secondary" onClick={() => goStart("hero_card")}>
                <FileText aria-hidden="true" /> Angebot als PDF
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Vertrauensleiste / Kennzahlen ─────────────────────────────── */}
      <section className="border-y border-border bg-surface-sunken">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { v: "125+", l: "Raumtypen" },
            { v: "16", l: "Leistungsgruppen" },
            { v: "BIV / RAL", l: "Leistungswerte" },
            { v: "DSGVO", l: "konform" },
          ].map((s) => (
            <div key={s.l}>
              <p className="text-kpi md:text-money text-foreground tabular-nums">{s.v}</p>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Problem → Lösung ──────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-24">
        <Reveal className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-h1 font-bold mb-4">Kalkulation kostet zu viel Zeit — und zu oft die Marge</h2>
          <p className="text-lg text-muted-foreground">
            Die meisten Reinigungsbetriebe kalkulieren in Excel oder im Kopf. Das ist langsam, fehleranfällig und schwer nachvollziehbar.
          </p>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-5">
          {PAINS.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.08}>
              <div className="h-full rounded-lg border border-border bg-card p-6 shadow-surface">
                <div aria-hidden="true" className="size-11 rounded-md bg-destructive-soft flex items-center justify-center mb-4">
                  <p.icon className="size-5 text-destructive" />
                </div>
                <h3 className="text-h3 mb-2">{p.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{p.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Funktionen ────────────────────────────────────────────────── */}
      <section id="funktionen" className="bg-surface-sunken border-y border-border scroll-mt-20">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-24">
          <Reveal className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-overline uppercase text-primary mb-3">Alles in einer App</p>
            <h2 className="text-h1 font-bold mb-4">Von der Fläche zum fertigen Angebot</h2>
            <p className="text-lg text-muted-foreground">
              Jeder Schritt der Reinigungskalkulation — sauber abgebildet, in professioneller Branchensprache.
            </p>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 0.08}>
                <div className="h-full rounded-lg border border-border bg-card p-6 shadow-surface">
                  <div aria-hidden="true" className="size-12 rounded-md bg-primary-soft flex items-center justify-center mb-4">
                    <f.icon className="size-6 text-primary" />
                  </div>
                  <h3 className="text-h3 mb-2">{f.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{f.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Ablauf ────────────────────────────────────────────────────── */}
      <section id="ablauf" className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-24 scroll-mt-20">
        <Reveal className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-overline uppercase text-primary mb-3">In drei Schritten</p>
          <h2 className="text-h1 font-bold">So einfach kalkulieren Sie Ihr nächstes Objekt</h2>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-6 md:gap-5">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.1}>
              <div className="relative h-full rounded-lg border border-border bg-card p-6 shadow-surface">
                <div aria-hidden="true" className="size-11 rounded-full bg-primary text-primary-foreground text-h3 font-bold flex items-center justify-center mb-4">{s.n}</div>
                <h3 className="text-h3 mb-2">{s.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{s.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal className="text-center mt-12">
          <Button size="lg" onClick={() => goStart("ablauf")} className="h-auto min-h-11 max-w-full whitespace-normal py-2 text-balance pointer-coarse:h-auto pointer-coarse:min-h-12">
            Erstes Objekt kostenlos kalkulieren <ArrowRight aria-hidden="true" />
          </Button>
        </Reveal>
      </section>

      {/* ── Preise ────────────────────────────────────────────────────── */}
      <section id="preise" className="bg-surface-sunken border-y border-border scroll-mt-20">
        <div className="max-w-5xl mx-auto px-5 md:px-8 py-16 md:py-24">
          <Reveal className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-overline uppercase text-primary mb-3">Preise</p>
            <h2 className="text-h1 font-bold mb-4">Starten Sie kostenlos. Upgraden, wenn es sich lohnt.</h2>
            <p className="text-lg text-muted-foreground">Keine versteckten Kosten, monatlich kündbar.</p>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto">
            {/* Free */}
            <Reveal>
              <div className="h-full rounded-lg border border-border bg-card p-6 shadow-surface flex flex-col">
                <h3 className="text-h2 mb-1">Basic</h3>
                <p className="text-sm text-muted-foreground mb-5">Zum Ausprobieren & für gelegentliche Angebote</p>
                <div className="mb-6">
                  <span className="text-display">0 €</span>
                  <span className="text-muted-foreground"> / dauerhaft</span>
                </div>
                <ul className="space-y-3 mb-6 flex-1">
                  {[
                    "1 Objekt kalkulieren",
                    "Über 125 Raumtypen (BIV/RAL)",
                    "Verrechnungssatz-Kalkulator",
                    "Plausibilitätsprüfung",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="size-4 text-success shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button variant="secondary" size="lg" className="w-full" onClick={() => goStart("pricing_free")}>
                  Kostenlos starten
                </Button>
              </div>
            </Reveal>

            {/* Pro */}
            <Reveal delay={0.08}>
              <div className="relative h-full rounded-lg border-2 border-primary bg-card p-6 flex flex-col shadow-raised">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  <Star className="size-3" fill="currentColor" aria-hidden="true" /> Empfohlen
                </div>
                <h3 className="text-h2 mb-1">Pro</h3>
                <p className="text-sm text-muted-foreground mb-5">Für aktive Reinigungsbetriebe, die laufend kalkulieren</p>
                <div className="mb-1">
                  <span className="text-display">{proFromMonthly}</span>
                  <span className="text-muted-foreground"> / Monat</span>
                </div>
                <p className="text-xs text-muted-foreground mb-6">jährliche Abrechnung · monatlich {proMonthly}</p>
                <ul className="space-y-3 mb-6 flex-1">
                  {[
                    "Unbegrenzt viele Objekte",
                    "Druckfertige Angebote als PDF",
                    "Eigenes Logo & Branding, kein Wasserzeichen",
                    "Vorlagen & wiederkehrende Leistungen",
                    "Eigene Leistungswerte hinterlegen",
                    "Cloud-Sync über alle Geräte",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="size-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button size="lg" className="w-full" onClick={() => goStart("pricing_pro")}>
                  Pro testen <ArrowRight aria-hidden="true" />
                </Button>
              </div>
            </Reveal>
          </div>

          {FOUNDING_CONFIG.enabled && (
            <Reveal delay={0.12}>
              <div className="mt-6 max-w-3xl mx-auto rounded-lg border border-primary/30 bg-primary-soft p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                <div className="flex items-center gap-3">
                  <div aria-hidden="true" className="size-11 rounded-md bg-card flex items-center justify-center shrink-0">
                    <Sparkles className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Founding-Member-Angebot · ab {foundingMonthly}/Monat</p>
                    <p className="text-sm text-muted-foreground">
                      Limitiert auf die ersten {FOUNDING_CONFIG.maxCustomers} Betriebe — Pro-Funktionen dauerhaft günstiger.
                    </p>
                  </div>
                </div>
                <Button variant="secondary" className="shrink-0" onClick={() => goStart("pricing_founding")}>
                  Platz sichern
                </Button>
              </div>
            </Reveal>
          )}
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────── */}
      <section id="faq" className="max-w-3xl mx-auto px-5 md:px-8 py-16 md:py-24 scroll-mt-20">
        <Reveal className="text-center mb-12">
          <h2 className="text-h1 font-bold">Häufige Fragen</h2>
        </Reveal>
        <div className="space-y-3">
          {FAQ.map((item, i) => {
            const open = openFaq === i;
            return (
              <Reveal key={item.q} delay={i * 0.04}>
                <div className="rounded-lg border border-border bg-card overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(open ? null : i)}
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    aria-expanded={open}
                    aria-controls={`faq-${i}`}
                  >
                    <span className="font-semibold">{item.q}</span>
                    <ChevronDown aria-hidden="true" className={`size-5 text-muted-foreground shrink-0 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
                  </button>
                  {open && (
                    <div id={`faq-${i}`} className="px-5 pb-5 -mt-1 text-sm text-muted-foreground leading-relaxed">{item.a}</div>
                  )}
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ── Lead-Capture / Newsletter ─────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-5 md:px-8 pb-4">
        <Reveal>
          <div className="rounded-lg border border-border bg-card p-6 md:p-8 text-center shadow-surface">
            <div aria-hidden="true" className="size-12 rounded-md bg-primary-soft flex items-center justify-center mx-auto mb-4">
              <Mail className="size-6 text-primary" />
            </div>
            <h2 className="text-h1 font-bold mb-2">Noch nicht startklar?</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Tragen Sie sich ein und erhalten Sie Praxistipps rund um die Reinigungskalkulation
              sowie Neuigkeiten zu CleanCalc Pro.
            </p>
            <div className="max-w-lg mx-auto">
              <LeadCaptureForm />
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Abschluss-CTA ─────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 py-16">
        <Reveal>
          <div className="relative overflow-hidden rounded-xl bg-primary px-6 py-12 md:py-20 text-center">
            <div className="relative">
              <h2 className="text-h1 md:text-display font-bold text-primary-foreground mb-4 max-w-2xl mx-auto">
                Ihr nächstes Angebot ist nur ein paar Minuten entfernt.
              </h2>
              <p className="text-primary-foreground text-lg mb-8 max-w-xl mx-auto">
                Kostenlos starten, erstes Objekt kalkulieren und sehen, wie viel schneller saubere Angebote gehen.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button size="lg" variant="secondary" onClick={() => goStart("footer_cta")}>
                  Jetzt kostenlos kalkulieren <ArrowRight aria-hidden="true" />
                </Button>
                <Button size="lg" variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" onClick={() => goRegister("footer_register")}>
                  Konto erstellen
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
      </main>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="border-t border-border pb-safe">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div aria-hidden="true" className="size-8 rounded-md bg-primary flex items-center justify-center">
              <Sparkles className="size-4 text-primary-foreground" strokeWidth={2} />
            </div>
            <span className="font-semibold">CleanCalc <span className="text-primary">Pro</span></span>
          </div>
          <nav aria-label="Rechtliches" className="flex flex-wrap items-center justify-center gap-5 text-sm text-muted-foreground">
            <Link href="/impressum" className="hover:text-foreground transition-colors">Impressum</Link>
            <Link href="/datenschutz" className="hover:text-foreground transition-colors">Datenschutz</Link>
            <Link href="/agb" className="hover:text-foreground transition-colors">AGB</Link>
            <button onClick={goLogin} className="hover:text-foreground transition-colors">Anmelden</button>
          </nav>
        </div>
        <p className="text-center text-xs text-muted-foreground pb-8">
          © {new Date().getFullYear()} CleanCalc Pro · Objektkalkulation für die Gebäudereinigung
        </p>
      </footer>
    </div>
  );
}
