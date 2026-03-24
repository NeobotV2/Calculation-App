import { Share } from "@capacitor/share";
import { isNative } from "@/lib/capacitor";

export async function sharePrintView(): Promise<void> {
  if (!isNative) {
    window.print();
    return;
  }

  await Share.share({
    title: "CleanCalc Pro – Angebot",
    text: "Angebot erstellt mit CleanCalc Pro",
    dialogTitle: "Angebot teilen",
  });
}

export async function canShareNatively(): Promise<boolean> {
  if (!isNative) return false;
  try {
    const result = await Share.canShare();
    return result.value;
  } catch {
    return false;
  }
}
