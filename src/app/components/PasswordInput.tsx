"use client";

import { useId, useState } from "react";
import { IconEye, IconEyeOff } from "./Icons";

// A password input with a reveal / hide toggle. The toggle swaps the field
// between type="password" and type="text" and announces its current state
// via aria-pressed + aria-label. Used on /login and /signup; happy to use
// elsewhere (password change, etc.) if we add those flows later.
export function PasswordInput({
  value,
  onChange,
  autoComplete,
  minLength,
  required,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  autoComplete: "current-password" | "new-password";
  minLength?: number;
  required?: boolean;
  id?: string;
}) {
  const [revealed, setRevealed] = useState(false);
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <div className="relative">
      <input
        id={inputId}
        type={revealed ? "text" : "password"}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        // pe-10 / ps-3 is RTL-aware padding: the reveal button sits in the
        // trailing edge (end) of the field.
        className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 pe-10 text-ink outline-none transition-colors focus:border-teal focus:ring-2 focus:ring-teal/20"
      />
      <button
        type="button"
        onClick={() => setRevealed((r) => !r)}
        aria-pressed={revealed}
        aria-label={revealed ? "Hide password" : "Show password"}
        aria-controls={inputId}
        className="absolute inset-y-0 end-2 top-1 flex items-center rounded-md px-2 text-muted transition-colors hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-teal"
      >
        {revealed ? <IconEyeOff /> : <IconEye />}
      </button>
    </div>
  );
}
