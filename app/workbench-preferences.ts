import { createContext } from "react";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = Exclude<ThemePreference, "system">;

export const ThemeContext = createContext<ResolvedTheme>("light");

export function isCommandPaletteShortcut(event: Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey">) {
  return event.key.toLocaleLowerCase() === "k" && (event.metaKey || event.ctrlKey);
}

export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): ResolvedTheme {
  return preference === "system" ? (systemPrefersDark ? "dark" : "light") : preference;
}
