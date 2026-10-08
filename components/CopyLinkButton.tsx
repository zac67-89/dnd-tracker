"use client";

import { useState } from "react";

export default function CopyLinkButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard access denied — user can still select/copy the text manually
    }
  }

  return (
    <button type="button" onClick={handleCopy} className="btn btn-ghost text-xs whitespace-nowrap">
      {copied ? "Copied ✓" : "Copy"}
    </button>
  );
}
