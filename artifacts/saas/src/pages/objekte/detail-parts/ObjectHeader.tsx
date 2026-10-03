import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Link } from "wouter";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  BarChart3,
  BookmarkPlus,
  Check,
  ClipboardCheck,
  Copy,
  Ellipsis,
  Eye,
  FileSpreadsheet,
  FileText,
  Pencil,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { ModuleBadge, type ServiceModule } from "@/components/ui/module-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ObjectStatus } from "@/lib/offer-readiness";
import type { Project } from "@/store/use-store";
import { editFlowHref, type WorkspaceTab } from "./workspace-tabs";

export interface ObjectHeaderProps {
  project: Project;
  /** `getObjectStatus(project, readiness)`. */
  status: ObjectStatus | null;
  /** Aktiver Tab – „Bearbeiten“ springt in den passenden Flow-Schritt. */
  tab: WorkspaceTab;
  /** Daten werden im Hintergrund aktualisiert („Aktualisiere…“). */
  refreshing?: boolean;
  /** Speichert den neuen Namen; wirft bei Fehlern (Eingabe bleibt offen). */
  onRename: (name: string) => Promise<void>;
  /** „Angebot erstellen“ (`useOfferAction().trigger`). */
  onOffer: () => void;
  onEditInfo: () => void;
  onPreview: () => void;
  onNachkalkulation: () => void;
  onDuplicate: () => void;
  onSaveTemplate: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
}

/** Aktive Module für die Metazeile (pausierte Module zählen nicht). */
function activeModules(project: Project): ServiceModule[] {
  const list: ServiceModule[] = [];
  if (project.rooms.length > 0) list.push("unterhalt");
  if (project.winterdienst?.enabled) list.push("winterdienst");
  if (project.hms?.enabled) list.push("hms");
  return list;
}

/**
 * Kopf des Objekt-Arbeitsbereichs (§8.1): Zurück, Name mit Inline-Umbenennen,
 * Metazeile, „Angebot erstellen“, „Bearbeiten“ und das Menü „Weitere Aktionen“.
 * Gleiche Optik wie ein sticky `PageHeader`; unter md kompakt (§8.5).
 */
export function ObjectHeader({
  project,
  status,
  tab,
  refreshing = false,
  onRename,
  onOffer,
  onEditInfo,
  onPreview,
  onNachkalkulation,
  onDuplicate,
  onSaveTemplate,
  onArchive,
  onRestore,
  onDelete,
}: ObjectHeaderProps) {
  const archived = project.status === "archived";
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pencilRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);

  useEffect(() => {
    if (editing) inputRef.current?.select();
    else if (restoreFocus.current) {
      restoreFocus.current = false;
      pencilRef.current?.focus();
    }
  }, [editing]);

  // Archivieren oder ein Sync während der Eingabe beendet das Umbenennen.
  useEffect(() => {
    if (archived) setEditing(false);
  }, [archived]);

  const startEditing = () => {
    setName(project.name);
    setEditing(true);
  };

  const cancel = () => {
    restoreFocus.current = true;
    setEditing(false);
  };

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === project.name) {
      cancel();
      return;
    }
    setSaving(true);
    try {
      await onRename(trimmed);
      restoreFocus.current = true;
      setEditing(false);
    } catch {
      inputRef.current?.focus();
    } finally {
      setSaving(false);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void save();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
  };

  const editHref = editFlowHref(project.id, tab);
  const modules = activeModules(project);

  return (
    <header className="sticky top-0 z-sticky border-b border-border bg-background pb-3 pt-[calc(var(--safe-top)+0.75rem)]">
      <PageContainer width="wide">
        <div className="flex items-start gap-3">
          <IconButton href="/objekte" label="Zurück zu Objekte" icon={ArrowLeft} className="-ml-2 shrink-0" />

          <div className="min-w-0 flex-1">
            {editing ? (
              <>
                <h1 className="sr-only">{project.name}</h1>
                <form
                  className="flex items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void save();
                  }}
                >
                  <Input
                    ref={inputRef}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={onKeyDown}
                    aria-label="Objektname"
                    autoComplete="off"
                    disabled={saving}
                    className="min-w-0 text-h3"
                  />
                  <IconButton type="submit" label="Namen speichern" icon={Check} variant="tonal" disabled={saving} />
                  <IconButton label="Umbenennen abbrechen" icon={X} onClick={cancel} disabled={saving} />
                </form>
              </>
            ) : (
              <div className="flex min-w-0 items-center gap-1">
                <h1 className="min-w-0 truncate text-h1 text-foreground md:whitespace-normal md:break-words">
                  {project.name || "Unbenanntes Objekt"}
                </h1>
                {!archived && (
                  <IconButton
                    ref={pencilRef}
                    label="Namen bearbeiten"
                    icon={Pencil}
                    size="sm"
                    onClick={startEditing}
                    className="shrink-0 text-muted-foreground"
                  />
                )}
              </div>
            )}

            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {status && <StatusBadge tone={status.tone} label={status.label} size="sm" className="md:order-last" />}
              {project.customer && <span className="min-w-0 truncate">{project.customer}</span>}
              {project.location && <span className="hidden min-w-0 truncate md:inline">{project.location}</span>}
              {project.objectType && (
                <Badge tone="outline" size="sm" className="hidden md:inline-flex">
                  {project.objectType}
                </Badge>
              )}
              {project.rpiContactName && (
                <span className="hidden md:inline">Ansprechpartner: {project.rpiContactName}</span>
              )}
              {modules.length > 0 && (
                <span className="hidden items-center gap-1 md:inline-flex">
                  {modules.map((m) => (
                    <ModuleBadge key={m} module={m} size="sm" />
                  ))}
                </span>
              )}
              {refreshing && (
                <span role="status" className="text-xs md:order-last">
                  Aktualisiere…
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {!archived && (
              <div className="hidden items-center gap-2 md:flex">
                <Button asChild variant="secondary">
                  <Link href={editHref}>
                    <Pencil aria-hidden="true" />
                    Bearbeiten
                  </Link>
                </Button>
                <Button type="button" onClick={onOffer}>
                  <FileText aria-hidden="true" />
                  Angebot erstellen
                </Button>
              </div>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <IconButton label="Weitere Aktionen" icon={Ellipsis} variant="secondary" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-56">
                {!archived && (
                  <>
                    <DropdownMenuItem onSelect={onOffer} className="md:hidden">
                      <FileText aria-hidden="true" />
                      Angebot erstellen
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="md:hidden">
                      <Link href={editHref}>
                        <Pencil aria-hidden="true" />
                        Kalkulation bearbeiten
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="md:hidden" />
                    <DropdownMenuItem onSelect={onEditInfo}>
                      <SlidersHorizontal aria-hidden="true" />
                      Objektdaten bearbeiten
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem onSelect={onPreview}>
                  <Eye aria-hidden="true" />
                  Angebot-Vorschau
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/print/${project.id}/intern`}>
                    <FileSpreadsheet aria-hidden="true" />
                    Interne Kalkulation
                  </Link>
                </DropdownMenuItem>
                {!archived && (
                  <DropdownMenuItem onSelect={onNachkalkulation}>
                    <ClipboardCheck aria-hidden="true" />
                    Nachkalkulation erfassen
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link href={`/auswertung/${project.id}`}>
                    <BarChart3 aria-hidden="true" />
                    Controlling-Details
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onDuplicate}>
                  <Copy aria-hidden="true" />
                  Duplizieren
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onSaveTemplate} disabled={project.rooms.length === 0}>
                  <BookmarkPlus aria-hidden="true" />
                  Als Vorlage speichern
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {archived ? (
                  <DropdownMenuItem onSelect={onRestore}>
                    <ArchiveRestore aria-hidden="true" />
                    Wiederherstellen
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onSelect={onArchive}>
                    <Archive aria-hidden="true" />
                    Archivieren
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem destructive onSelect={onDelete}>
                  <Trash2 aria-hidden="true" />
                  Löschen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </PageContainer>
    </header>
  );
}

