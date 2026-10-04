import * as React from "react";
import { useMemo } from "react";
import { useStore, type Project } from "@/store/use-store";
import type { ObjectEconomics } from "@/lib/object-economics";
import { calcOfferPresentation, type OfferPresentation } from "@/lib/object-totals";
import { buildOfferPositions, type OfferPosition, type OfferPositionGroup } from "@/lib/offer-positions";
import { displayOfferGroups, displayTotals } from "@/lib/display-rounding";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import {
  formatOfferQuantity,
  hmsOverageText,
  offerDates,
  offerNumber,
  PAPER_TOKENS,
  verkehrssicherungText,
  winterBillingText,
  winterCapText,
  winterSeasonLine,
  winterTotalsLine,
  type OfferDetail,
} from "./offer-meta";

/* ─────────────────────────────────────────────────────────────────────────
   Das EINE Kundenangebot: gerendert von /print/:id und von der Vorschau.
   Immer hell (Papier), A4, Fließtext 10 pt, Tabellen 9 pt, tabular-nums.
   Alle Summen stammen aus buildOfferPositions / calcOfferPresentation und
   werden für die Anzeige so gerundet, dass jede Summe aufgeht
   (displayOfferGroups / displayTotals).
   ───────────────────────────────────────────────────────────────────────── */

/** Firmen- und Dokumentfelder aus dem Store, die das Angebot braucht. */
export interface OfferCompany {
  companyName: string;
  companyStreet: string;
  companyZip: string;
  companyCity: string;
  companyPhone: string;
  companyEmail: string;
  companyTaxNumber: string;
  companyVatId: string;
  companyManagingDirector: string;
  companyLogo: string;
  /** USt-Satz in % (0 = keine USt ausweisen). */
  vatRate: number;
  pdfHeader: string;
  pdfFooter: string;
}

/** Firmenfelder aus dem Store (referenzstabil, solange sich nichts ändert). */
export function useOfferCompany(): OfferCompany {
  const companyName = useStore((s) => s.companyName);
  const companyStreet = useStore((s) => s.companyStreet);
  const companyZip = useStore((s) => s.companyZip);
  const companyCity = useStore((s) => s.companyCity);
  const companyPhone = useStore((s) => s.companyPhone);
  const companyEmail = useStore((s) => s.companyEmail);
  const companyTaxNumber = useStore((s) => s.companyTaxNumber);
  const companyVatId = useStore((s) => s.companyVatId);
  const companyManagingDirector = useStore((s) => s.companyManagingDirector);
  const companyLogo = useStore((s) => s.companyLogo);
  const vatRate = useStore((s) => s.vatRate);
  const pdfHeader = useStore((s) => s.pdfHeader);
  const pdfFooter = useStore((s) => s.pdfFooter);
  return useMemo(
    () => ({
      companyName, companyStreet, companyZip, companyCity, companyPhone, companyEmail,
      companyTaxNumber, companyVatId, companyManagingDirector, companyLogo, vatRate, pdfHeader, pdfFooter,
    }),
    [companyName, companyStreet, companyZip, companyCity, companyPhone, companyEmail,
      companyTaxNumber, companyVatId, companyManagingDirector, companyLogo, vatRate, pdfHeader, pdfFooter],
  );
}

/* ── Papier-Primitive (auch für die interne Kalkulation) ──────────────── */

/** Helle Tokens + Grundschrift 10 pt; gilt für den ganzen Dokumentbaum. */
export const PAPER_STYLE = {
  ...PAPER_TOKENS,
  colorScheme: "light",
  fontSize: "10pt",
  lineHeight: 1.45,
} as React.CSSProperties;

export function PaperDocument({
  label,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement> & { label: string }) {
  return (
    <article
      aria-label={label}
      style={PAPER_STYLE}
      className={cn("space-y-6 text-foreground print:space-y-0", className)}
      {...props}
    >
      {children}
    </article>
  );
}

/** Ein A4-Blatt: auf dem Bildschirm 210 mm breit mit Rand, im Druck randlos (Ränder via @page). */
export function PaperSheet({
  breakBefore = false,
  className,
  children,
}: {
  breakBefore?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative mx-auto flex min-h-[297mm] w-[210mm] flex-col rounded-xs border border-border bg-card px-[14mm] py-[16mm] text-card-foreground shadow-raised",
        "print:min-h-0 print:w-auto print:rounded-none print:border-0 print:p-0 print:shadow-none",
        breakBefore && "break-before-page",
        className,
      )}
    >
      {children}
    </div>
  );
}

export type DocHeadingTag = "h2" | "h3" | "h4";

/** Abschnittsüberschrift im Dokument (Überline-Stil in Papiergrößen). */
export function DocHeading({
  as: Tag = "h2",
  id,
  className,
  children,
}: {
  as?: DocHeadingTag;
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Tag id={id} className={cn("mb-[0.5em] break-after-avoid text-[1.1em] font-semibold text-foreground", className)}>
      {children}
    </Tag>
  );
}

/** Basisklassen der Dokumenttabellen (9 pt). */
export const DOC_TABLE = "w-full border-collapse text-[0.9em]";
export const DOC_TH =
  "py-[0.4em] pr-[0.8em] text-left align-bottom text-[0.85em] font-semibold uppercase tracking-wide text-muted-foreground last:pr-0";
export const DOC_TD = "py-[0.35em] pr-[0.8em] align-top last:pr-0";
export const DOC_NUM = "text-right tabular-nums whitespace-nowrap";
export const DOC_ROW = "break-inside-avoid border-b border-border";
export const DOC_HEAD_ROW = "border-b border-border-strong";
export const DOC_FOOT_ROW = "break-inside-avoid border-t-2 border-border-strong font-semibold";

/* ── Angebot ──────────────────────────────────────────────────────────── */

export interface OfferDocumentProps {
  project: Project;
  economics: ObjectEconomics;
  company: OfferCompany;
  /** Kompakt (Standard) oder mit Leistungsdaten (m²/h, Std./Mo). */
  detail?: OfferDetail;
  /** „Erstellt mit CleanCalc Pro“ (Basic-Plan). */
  watermark: boolean;
  /** Überschriften-Ebene des Titels (Standard h1; in Dialogen h2). */
  titleAs?: "h1" | "h2";
  /** Ausstellungsdatum (Standard: heute). */
  now?: Date;
  className?: string;
}

interface ColumnFlags {
  detailed: boolean;
  count: number;
}

function PositionRow({
  position,
  pos,
  cols,
}: {
  position: OfferPosition;
  pos: string;
  cols: ColumnFlags;
}) {
  const isSetup = position.kind === "ruestzeit" || position.kind === "wegezeit";
  const sub = isSetup ? undefined : position.sublabel;
  return (
    <tr className={DOC_ROW}>
      <td className={cn(DOC_TD, "tabular-nums text-muted-foreground")}>{pos}</td>
      <td className={DOC_TD}>
        <span className="font-medium">{position.label}</span>
        {sub && <span className="block text-[0.9em] text-muted-foreground">{sub}</span>}
      </td>
      <td className={cn(DOC_TD, "whitespace-nowrap tabular-nums")}>{formatOfferQuantity(position)}</td>
      <td className={DOC_TD}>{position.frequencyLabel ?? ""}</td>
      {cols.detailed && (
        <>
          <td className={cn(DOC_TD, DOC_NUM)}>
            {position.performanceM2h ? formatNumber(position.performanceM2h, 0) : "–"}
          </td>
          <td className={cn(DOC_TD, DOC_NUM)}>
            {position.hoursMonthly > 0 ? formatNumber(position.hoursMonthly, 1) : "–"}
          </td>
        </>
      )}
      <td className={cn(DOC_TD, DOC_NUM, "font-medium")}>{formatCurrency(position.priceMonthly)}</td>
    </tr>
  );
}

function GroupTable({
  group,
  groupIndex,
  cols,
  areaTotal,
  caption,
}: {
  group: OfferPositionGroup;
  groupIndex: number;
  cols: ColumnFlags;
  areaTotal?: number;
  caption: string;
}) {
  const hasDetails = group.details.length > 0;
  const subRowClass = "break-inside-avoid border-b border-border bg-surface-sunken";
  const subHeadClass = cn(DOC_TD, "text-left text-[0.85em] font-semibold uppercase tracking-wide text-muted-foreground");
  return (
    <table className={DOC_TABLE}>
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className={DOC_HEAD_ROW}>
          <th scope="col" className={cn(DOC_TH, "w-[3.2em]")}>Pos</th>
          <th scope="col" className={DOC_TH}>Leistung</th>
          <th scope="col" className={DOC_TH}>Menge</th>
          <th scope="col" className={DOC_TH}>Turnus</th>
          {cols.detailed && (
            <>
              <th scope="col" className={cn(DOC_TH, "text-right")}>m²/h</th>
              <th scope="col" className={cn(DOC_TH, "text-right")}>Std./Mo</th>
            </>
          )}
          <th scope="col" className={cn(DOC_TH, "text-right")}>Preis/Monat</th>
        </tr>
      </thead>
      <tbody>
        {hasDetails && (
          <>
            <tr className={subRowClass}>
              <th scope="colgroup" colSpan={cols.count} className={subHeadClass}>Flächen im Leistungsumfang</th>
            </tr>
            {group.details.map((d, i) => (
              <tr key={`${d.label}-${i}`} className={DOC_ROW}>
                <td className={DOC_TD} />
                <td className={DOC_TD}>
                  <span className="font-medium">{d.label}</span>
                  <span className="block text-[0.9em] text-muted-foreground">{d.text}</span>
                </td>
                <td className={cn(DOC_TD, "whitespace-nowrap tabular-nums")}>{d.quantity ?? ""}</td>
                <td className={DOC_TD}>je Einsatz</td>
                {cols.detailed && (
                  <>
                    <td className={DOC_TD} />
                    <td className={DOC_TD} />
                  </>
                )}
                <td className={cn(DOC_TD, DOC_NUM, "text-muted-foreground")}>inklusive</td>
              </tr>
            ))}
            <tr className={subRowClass}>
              <th scope="colgroup" colSpan={cols.count} className={subHeadClass}>Vergütung</th>
            </tr>
          </>
        )}
        {group.positions.map((p, i) => (
          <PositionRow key={p.id} position={p} pos={`${groupIndex + 1}.${i + 1}`} cols={cols} />
        ))}
      </tbody>
      <tfoot>
        <tr className={DOC_FOOT_ROW}>
          <td className={DOC_TD} />
          <th scope="row" className={cn(DOC_TD, "text-left font-semibold")}>
            Summe {group.label}
            {group.module === "winterdienst" && (
              <span className="block text-[0.9em] font-normal text-muted-foreground">Ø pro Monat (Jahresmittel)</span>
            )}
          </th>
          <td className={cn(DOC_TD, "whitespace-nowrap tabular-nums")}>
            {areaTotal !== undefined && areaTotal > 0 ? `${formatNumber(areaTotal, 0)} m²` : ""}
          </td>
          <td className={DOC_TD} />
          {cols.detailed && (
            <>
              <td className={DOC_TD} />
              <td className={cn(DOC_TD, DOC_NUM)}>{formatNumber(group.hoursMonthly, 1)}</td>
            </>
          )}
          <td className={cn(DOC_TD, DOC_NUM)}>{formatCurrency(group.subtotalMonthly)}</td>
        </tr>
      </tfoot>
    </table>
  );
}

function ModuleNotes({ lines }: { lines: (string | null | undefined)[] }) {
  const items = lines.filter((l): l is string => !!l);
  if (items.length === 0) return null;
  return (
    <div className="mt-[0.8em] break-inside-avoid space-y-[0.3em] rounded-xs border-l-2 border-border-strong pl-[0.8em] text-[0.95em]">
      {items.map((t) => (
        <p key={t}>{t}</p>
      ))}
    </div>
  );
}

function TotalsRow({
  label,
  value,
  strong = false,
  muted = false,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-[1em]", strong && "font-semibold", muted && "text-muted-foreground")}>
      <dt>{label}</dt>
      <dd className="tabular-nums whitespace-nowrap">{value}</dd>
    </div>
  );
}

function TotalsBox({
  op,
  economics,
  vatRate,
  headingTag,
}: {
  op: OfferPresentation;
  economics: ObjectEconomics;
  vatRate: number;
  headingTag: DocHeadingTag;
}) {
  const totals = economics.totals;
  // Angezeigte Beträge: USt auf den gerundeten Nettobetrag; Jahreswert wie im Arbeitsbereich (priceAnnual, einmal gerundet).
  const d = displayTotals({
    fixedMonthly: op.fixedMonthly,
    averageMonthly: totals.priceMonthly,
    vatRatePct: vatRate,
    annualNet: op.expectedAnnual,
  });
  const hasVat = vatRate > 0;
  const winterLine = winterTotalsLine(op);
  const showAverage = hasSeasonalShare(totals.priceMonthly, op.fixedMonthly, totals.hasModules);
  const vatLabel = formatNumber(vatRate, Number.isInteger(vatRate) ? 0 : 1);
  const headingId = React.useId();

  return (
    <section aria-labelledby={headingId} className="ml-auto mt-[1.5em] w-[85mm] max-w-full break-inside-avoid rounded-xs border border-border-strong p-[0.9em]">
      <DocHeading as={headingTag} id={headingId} className="sr-only">Summen</DocHeading>
      <dl className="space-y-[0.3em]">
        <TotalsRow label="Monatlich netto" value={formatCurrency(d.netMonthly)} strong />
        {hasVat && (
          <>
            <TotalsRow label={`zzgl. USt (${vatLabel} %)`} value={formatCurrency(d.vatMonthly)} muted />
            <TotalsRow label="Monatlich brutto" value={formatCurrency(d.grossMonthly)} strong />
          </>
        )}
      </dl>
      {winterLine && (
        <p className="mt-[0.3em] border-t border-border pt-[0.3em]">{winterLine}</p>
      )}
      <dl className="mt-[0.3em] space-y-[0.3em] border-t border-border pt-[0.3em]">
        {showAverage && (
          <TotalsRow label="Ø pro Monat (Jahresmittel) netto" value={formatCurrency(d.averageMonthly)} muted />
        )}
        <TotalsRow label="Erwarteter Jahreswert netto" value={formatCurrency(d.annualNet)} />
        {hasVat && <TotalsRow label="Erwarteter Jahreswert brutto" value={formatCurrency(d.annualGross)} strong />}
      </dl>
    </section>
  );
}

/** Winterdienst nicht in jedem Monat fällig (Saisonpauschale bzw. je Einsatz): Ø-Monat ≠ „Monatlich netto“. */
function hasSeasonalShare(priceMonthly: number, fixedMonthly: number, hasModules: boolean): boolean {
  return hasModules && Math.abs(priceMonthly - fixedMonthly) >= 0.005;
}

export function OfferDocument({
  project,
  economics,
  company,
  detail = "compact",
  watermark,
  titleAs = "h1",
  now,
  className,
}: OfferDocumentProps) {
  const totals = economics.totals;
  const op = useMemo(() => calcOfferPresentation(totals, project), [totals, project]);
  // Anzeige: Zeilen auf Cent, Rest-Cents nach größtem Rest — Σ Zeilen = Summe Modul,
  // Σ Module = Ø-Monatspreis; dieselbe Rundung wie Prüfschritt und Arbeitsbereich.
  const groups = useMemo(
    () => displayOfferGroups(buildOfferPositions(project, totals, economics.effectiveRate), totals.priceMonthly),
    [project, totals, economics.effectiveRate],
  );
  const issued = now ?? new Date();
  const dates = offerDates(issued);
  const number = offerNumber(project, issued);

  const uid = React.useId();
  const TitleTag = titleAs;
  const sectionTag: DocHeadingTag = titleAs === "h1" ? "h2" : "h3";
  const cols: ColumnFlags = { detailed: detail === "detailed", count: detail === "detailed" ? 7 : 5 };

  const addressLine = [company.companyStreet, [company.companyZip, company.companyCity].filter(Boolean).join(" ")]
    .filter((s) => s && s.trim() !== "")
    .join(", ");
  const senderLine = [company.companyName, company.companyStreet, [company.companyZip, company.companyCity].filter(Boolean).join(" ")]
    .filter((s) => s && s.trim() !== "")
    .join(" · ");
  const hasLegal = !!(company.companyManagingDirector || company.companyTaxNumber || company.companyVatId || company.pdfFooter);
  const roomPositions = groups.find((g) => g.module === "unterhalt")?.positions.filter((p) => p.kind === "room") ?? [];
  const unterhaltIndex = groups.findIndex((g) => g.module === "unterhalt");
  const hasWinter = !!totals.winterdienst;
  const wdNotes = (() => {
    const wd = totals.winterdienst;
    if (!wd) return [];
    return [
      winterBillingText(op, wd, project),
      winterCapText(op),
      winterSeasonLine(wd),
      verkehrssicherungText(project.winterdienst, wd),
    ];
  })();

  const watermarkLine = watermark ? (
    <p className="mt-[1.5em] text-[0.8em] text-muted-foreground">
      Erstellt mit CleanCalc Pro · {issued.toLocaleDateString("de-DE")}
    </p>
  ) : null;

  return (
    <PaperDocument label={`Angebot ${number}`} className={className}>
      <PaperSheet>
        {/* Briefkopf */}
        <header className="flex items-start justify-between gap-[2em] border-b border-border pb-[1em]">
          <div className="min-w-0">
            {company.companyLogo ? (
              <img
                src={company.companyLogo}
                alt={company.companyName ? `Logo ${company.companyName}` : "Firmenlogo"}
                className="h-[16mm] w-auto max-w-[70mm] object-contain object-left"
              />
            ) : (
              company.companyName && <p className="text-[1.8em] font-bold leading-tight tracking-tight">{company.companyName}</p>
            )}
          </div>
          <address className="shrink-0 text-right text-[0.9em] not-italic text-muted-foreground">
            {company.companyLogo && company.companyName && <p className="font-semibold text-foreground">{company.companyName}</p>}
            {company.companyStreet && <p>{company.companyStreet}</p>}
            {(company.companyZip || company.companyCity) && (
              <p>{[company.companyZip, company.companyCity].filter(Boolean).join(" ")}</p>
            )}
            {company.companyPhone && <p>Tel. {company.companyPhone}</p>}
            {company.companyEmail && <p>{company.companyEmail}</p>}
          </address>
        </header>

        {/* Empfänger und Angebotsdaten */}
        <div className="mt-[1.5em] grid grid-cols-[minmax(0,1fr)_auto] items-start gap-[2em]">
          <div className="min-w-0">
            {senderLine && addressLine && (
              <p className="mb-[0.6em] text-[0.75em] text-muted-foreground underline decoration-border-strong underline-offset-2">
                {senderLine}
              </p>
            )}
            <div aria-label="Empfänger" role="group" className="space-y-[0.1em]">
              {project.customer && <p className="font-semibold">{project.customer}</p>}
              {project.rpiContactName && <p>z. Hd. {project.rpiContactName}</p>}
              {project.location && <p>{project.location}</p>}
            </div>
          </div>
          <dl className="grid grid-cols-[auto_auto] gap-x-[1em] gap-y-[0.15em] text-[0.95em]">
            <dt className="text-muted-foreground">Angebot Nr.</dt>
            <dd className="text-right font-semibold tabular-nums">{number}</dd>
            <dt className="text-muted-foreground">Datum</dt>
            <dd className="text-right tabular-nums">{dates.date}</dd>
            <dt className="text-muted-foreground">Gültig bis</dt>
            <dd className="text-right tabular-nums">{dates.validUntil}</dd>
          </dl>
        </div>
        {company.pdfHeader && <p className="mt-[1em] whitespace-pre-line text-muted-foreground">{company.pdfHeader}</p>}

        {/* Titel */}
        <div className="mt-[1.8em] space-y-[0.3em]">
          <TitleTag className="text-[1.6em] font-bold leading-tight tracking-tight">Angebot</TitleTag>
          <p className="text-[1.1em] font-medium">Objekt: {project.name || "–"}</p>
          <p className="text-muted-foreground">
            Gern bieten wir Ihnen die folgenden Leistungen an. Alle Positionspreise sind Nettobeträge pro Monat
            {hasWinter ? " (bei saisonalen Leistungen Ø pro Monat im Jahresmittel)" : ""}.
          </p>
        </div>

        {/* Leistungen je Modul */}
        <div className="mt-[1.5em] space-y-[1.6em]">
          {groups.length === 0 && (
            <p className="rounded-xs border border-border p-[0.8em] text-muted-foreground">
              Für dieses Objekt sind noch keine Leistungen erfasst.
            </p>
          )}
          {groups.map((g, gi) => (
            <section key={g.module} aria-labelledby={`${uid}-group-${g.module}`}>
              <DocHeading as={sectionTag} id={`${uid}-group-${g.module}`}>{gi + 1}. {g.label}</DocHeading>
              <GroupTable
                group={g}
                groupIndex={gi}
                cols={cols}
                areaTotal={g.module === "unterhalt" ? totals.cleaning.area : undefined}
                caption={`Positionen ${g.label}`}
              />
              {g.module === "winterdienst" && <ModuleNotes lines={wdNotes} />}
              {g.module === "hms" && <ModuleNotes lines={[hmsOverageText(op)]} />}
            </section>
          ))}
        </div>

        <TotalsBox op={op} economics={economics} vatRate={company.vatRate} headingTag={sectionTag} />

        {/* Fußzeile */}
        <div className="mt-auto pt-[2em]">
          {hasLegal && (
            <footer className="border-t border-border pt-[0.8em] text-[0.8em] text-muted-foreground">
              <div className="flex flex-wrap gap-x-[1.5em] gap-y-[0.2em]">
                {company.companyManagingDirector && <span>Geschäftsführer: {company.companyManagingDirector}</span>}
                {company.companyTaxNumber && <span>Steuernummer: {company.companyTaxNumber}</span>}
                {company.companyVatId && <span>USt-IdNr.: {company.companyVatId}</span>}
              </div>
              {company.pdfFooter && <p className="mt-[0.4em] whitespace-pre-line">{company.pdfFooter}</p>}
            </footer>
          )}
          {roomPositions.length === 0 && watermarkLine}
        </div>
      </PaperSheet>

      {/* Anlage: Leistungsverzeichnis (ohne Preise) */}
      {roomPositions.length > 0 && (
        <PaperSheet breakBefore>
          <DocHeading as={sectionTag} className="text-[1.3em]">Anlage: Leistungsverzeichnis</DocHeading>
          <p className="mb-[1em] text-muted-foreground">
            zum Angebot Nr. {number} vom {dates.date} · Objekt: {project.name || "–"}
          </p>
          <table className={DOC_TABLE}>
            <caption className="sr-only">Leistungsverzeichnis Unterhaltsreinigung</caption>
            <thead>
              <tr className={DOC_HEAD_ROW}>
                <th scope="col" className={cn(DOC_TH, "w-[3.2em]")}>Pos</th>
                <th scope="col" className={DOC_TH}>Bezeichnung</th>
                <th scope="col" className={DOC_TH}>Raumgruppe</th>
                <th scope="col" className={cn(DOC_TH, "text-right")}>Fläche m²</th>
                <th scope="col" className={DOC_TH}>Turnus</th>
                <th scope="col" className={cn(DOC_TH, "text-right")}>LW m²/h</th>
              </tr>
            </thead>
            <tbody>
              {roomPositions.map((p, i) => (
                <tr key={p.id} className={DOC_ROW}>
                  <td className={cn(DOC_TD, "tabular-nums text-muted-foreground")}>{`${unterhaltIndex + 1}.${i + 1}`}</td>
                  <td className={DOC_TD}>
                    {p.label}
                    {p.sublabel && <span className="block text-[0.9em] text-muted-foreground">{p.sublabel}</span>}
                  </td>
                  <td className={cn(DOC_TD, "text-muted-foreground")}>{p.groupName ?? ""}</td>
                  <td className={cn(DOC_TD, DOC_NUM)}>{formatNumber(p.quantity?.value ?? 0, 1)}</td>
                  <td className={DOC_TD}>{p.frequencyLabel ?? ""}</td>
                  <td className={cn(DOC_TD, DOC_NUM)}>{p.performanceM2h ? formatNumber(p.performanceM2h, 0) : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-[0.6em] text-[0.8em] text-muted-foreground">
            LW = Leistungswert inkl. Zu- und Abschlägen für Verschmutzung, Möblierung und Bodenart.
          </p>
          <div className="mt-auto">{watermarkLine}</div>
        </PaperSheet>
      )}
    </PaperDocument>
  );
}
