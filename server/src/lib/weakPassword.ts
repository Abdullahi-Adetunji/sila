// Common-password reject list. Runs at signup — never on login, so an
// existing account whose password is on this list stays signed in; the
// user can rotate on their next change flow. The list is lowercased and
// trimmed before comparison, so case and whitespace variants are caught.
// Sources: the headline entries from the public breach corpora that
// everyone cites (RockYou, "worst passwords of the year" lists, keyboard
// walks). No personal information, no third-party call.
const COMMON_PASSWORDS = new Set<string>([
  // Top-of-list classics
  "password",
  "password1",
  "password12",
  "password123",
  "password1234",
  "passw0rd",
  "p@ssword",
  "p@ssw0rd",
  "passwordpassword",
  "letmein",
  "welcome",
  "welcome1",
  "welcome123",
  "admin",
  "administrator",
  "admin123",
  "admin1234",
  "root",
  "toor",
  "default",
  "guest",
  "guest123",
  "user",
  "user123",
  "test",
  "test123",
  "testtest",
  "demo",
  "demo123",
  "temp",
  "temp123",
  "temporary",
  "changeme",
  "changeme123",
  "qwerty",
  "qwerty123",
  "qwerty1234",
  "qwertyuiop",
  "qwertyuiop[]",
  "qwerty12345",
  "asdfgh",
  "asdfghjk",
  "asdfghjkl",
  "zxcvbn",
  "zxcvbnm",
  "zxcvbnm,./",
  "1q2w3e",
  "1q2w3e4r",
  "1q2w3e4r5t",
  "qwe123",
  "qweasd",
  "qweasdzxc",

  // Digit-only runs (length 8..14)
  "12345678",
  "123456789",
  "1234567890",
  "12345678901",
  "123456789012",
  "1234567890123",
  "12345678901234",
  "0000000000",
  "000000000000",
  "11111111",
  "111111111111",
  "1234123412",
  "121212121212",
  "123123123123",
  "87654321",
  "987654321",
  "9876543210",

  // Keyboard walks
  "qwertyasdf",
  "asdfqwerty",
  "zaq12wsx",
  "zaq12wsxcde3",
  "qazwsxedc",
  "qazwsxedcrfv",
  "qazxswedc",
  "1qaz2wsx",
  "1qaz2wsx3edc",
  "mnbvcxz",
  "poiuytrewq",

  // Repeated words / years / sports
  "passwordpass",
  "letmein1",
  "letmein12",
  "iloveyou",
  "iloveyou1",
  "iloveyou12",
  "sunshine",
  "princess",
  "princess1",
  "monkey",
  "monkey123",
  "dragon",
  "dragon123",
  "football",
  "football1",
  "basketball",
  "baseball",
  "soccer123",
  "superman",
  "batman",
  "pokemon",
  "starwars",
  "chocolate",
  "trustno1",
  "master",
  "michael",
  "jennifer",
  "andrew",
  "ashley",
  "charlie",
  "jordan",
  "freedom",

  // Year patterns
  "password2020",
  "password2021",
  "password2022",
  "password2023",
  "password2024",
  "password2025",
  "password2026",
  "welcome2024",
  "welcome2025",
  "welcome2026",
  "summer2024",
  "summer2025",
  "summer2026",
  "winter2024",
  "winter2025",
  "winter2026",

  // Project-specific temptations
  "silapassword",
  "sila2026",
  "sila-pilot",
  "sila-demo",
  "sila-demo-2026",
  "cedela",
  "cedela2026",
  "cedela-pilot",
]);

export interface PasswordCheckResult {
  ok: boolean;
  reason?: string;
}

// Called by the signup zod post-validation. Returns a stable English string
// so the API message is deterministic; the client renders it as the 400
// error body.
export function checkPasswordStrength(password: string, email?: string): PasswordCheckResult {
  const trimmed = password.trim();
  if (trimmed.length < 12) {
    return { ok: false, reason: "Password must be at least 12 characters." };
  }
  const lower = trimmed.toLowerCase();

  if (COMMON_PASSWORDS.has(lower)) {
    return {
      ok: false,
      reason: "This password appears on common-password lists. Please choose a different one.",
    };
  }
  // Too few distinct characters: 'aaaaaaaaaaaa', 'abababababab', etc.
  if (new Set(lower).size < 5) {
    return { ok: false, reason: "Password has too few distinct characters." };
  }
  // All digits — trivially cracked even if long.
  if (/^\d+$/.test(trimmed)) {
    return { ok: false, reason: "Password cannot be only digits." };
  }
  // Contains the local-part of the email.
  if (email) {
    const prefix = email.toLowerCase().split("@")[0];
    if (prefix.length >= 4 && lower.includes(prefix)) {
      return { ok: false, reason: "Password must not contain your email address." };
    }
  }
  return { ok: true };
}

// Exposed for tests only.
export const __internal = { COMMON_PASSWORDS };
