"use client";

import { Share2 } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import type { OutputFile } from "@/lib/conversion";

/** Share links need file hosting. Until that exists, offer the device's own share sheet instead of a dead link. */
export function ShareModal({ open, onClose, files }: { open: boolean; onClose: () => void; files: OutputFile[] }) {
  const toast = useToast();
  const shareable = useMemo(() => {
    if (!open || typeof navigator === "undefined" || !navigator.canShare) return null;
    const list = files.map((f) => new File([f.blob], f.name, { type: f.blob.type || "application/octet-stream" }));
    return navigator.canShare({ files: list }) ? list : null;
  }, [open, files]);

  const share = async () => {
    try {
      await navigator.share({ files: shareable! });
      onClose();
    } catch (e) {
      if ((e as Error).name !== "AbortError") toast("Sharing didn't work. Download the file and send it instead.", "error");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Share your result"
      description={<>
        <p>Links aren't available yet, because your file stays on this device and isn't stored online.</p>
        <p className="mt-2">{shareable ? "You can send the file itself with any app on your device." : "Download the file and attach it in your chat, email or group project."}</p>
      </>}>
      <div className="flex flex-wrap gap-3">
        {shareable && <Button onClick={share}><Share2 className="size-4" aria-hidden />Send file</Button>}
        <Button variant={shareable ? "ghost" : "primary"} onClick={onClose}>Got it</Button>
      </div>
    </Modal>
  );
}
