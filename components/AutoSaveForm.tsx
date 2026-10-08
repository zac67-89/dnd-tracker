"use client";

import { useRef, type ReactNode } from "react";

export function AutoSaveForm({
  action,
  className,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  className?: string;
  children: ReactNode;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={action}
      className={className}
      onBlur={() => formRef.current?.requestSubmit()}
      onChange={(e) => {
        const target = e.target as unknown as HTMLInputElement;
        if (target.type === "checkbox" || target.type === "radio" || target.tagName === "SELECT") {
          formRef.current?.requestSubmit();
        }
      }}
    >
      {children}
    </form>
  );
}
