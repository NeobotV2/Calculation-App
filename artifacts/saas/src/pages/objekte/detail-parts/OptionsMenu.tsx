import { Edit3, Copy, BookOpen, Eye, FileText, Archive, Trash2 } from "lucide-react";

export function OptionsMenu({
  onClose,
  onEditInfo,
  onDuplicate,
  onSaveAsTemplate,
  onPdfPreview,
  onOpenPDF,
  onArchive,
  onDelete,
}: {
  onClose: () => void;
  onEditInfo: () => void;
  onDuplicate: () => void;
  onSaveAsTemplate: () => void;
  onPdfPreview: () => void;
  onOpenPDF: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-20" onClick={onClose} aria-hidden="true" />
      <div role="menu" className="absolute top-24 right-4 z-30 bg-card border border-border/40 rounded-xl shadow-xl shadow-black/20 overflow-hidden min-w-[200px]">
        <button role="menuitem" onClick={onEditInfo} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-secondary"><Edit3 size={16} className="text-muted-foreground" aria-hidden="true" /> Info bearbeiten</button>
        <button role="menuitem" onClick={onDuplicate} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-secondary"><Copy size={16} className="text-muted-foreground" aria-hidden="true" /> Duplizieren</button>
        <button role="menuitem" onClick={onSaveAsTemplate} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-secondary"><BookOpen size={16} className="text-muted-foreground" aria-hidden="true" /> Als Vorlage speichern</button>
        <button role="menuitem" onClick={onPdfPreview} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-secondary"><Eye size={16} className="text-muted-foreground" aria-hidden="true" /> PDF-Vorschau</button>
        <button role="menuitem" onClick={onOpenPDF} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-secondary"><FileText size={16} className="text-muted-foreground" aria-hidden="true" /> Angebot als PDF</button>
        <button role="menuitem" onClick={onArchive} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-secondary"><Archive size={16} className="text-muted-foreground" aria-hidden="true" /> Archivieren</button>
        <button role="menuitem" onClick={onDelete} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-destructive hover:bg-destructive/10"><Trash2 size={16} aria-hidden="true" /> Löschen</button>
      </div>
    </>
  );
}
