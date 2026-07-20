"use client";

import { Suspense, useMemo, useState, useEffect } from "react";
import {
  Binary,
  Braces,
  CalendarClock,
  FileDiff,
  Fingerprint,
  GitCompareArrows,
  Hash,
  KeyRound,
  Keyboard,
  Monitor,
  Moon,
  RefreshCw,
  Regex,
  Search,
  Sun,
  Star,
  type LucideIcon,
} from "lucide-react";
import { toolLoaders } from "./tool-loaders";
import {
  DEFAULT_TOOL_ID,
  TOOL_CATEGORIES,
  filterTools,
  isToolId,
  normalizeToolId,
  tools,
  type ToolCategoryFilter,
  type ToolIconName,
  type ToolId,
} from "./tools";
import { isCommandPaletteShortcut, resolveTheme, ThemeContext, type ResolvedTheme, type ThemePreference } from "./workbench-preferences";

const FAVORITES_KEY = "dev-tools-box:favorites";
const RECENT_KEY = "dev-tools-box:recent";
const THEME_KEY = "dev-tools-box:theme";

const toolIcons: Record<ToolIconName, LucideIcon> = {
  "file-diff": FileDiff,
  braces: Braces,
  "git-compare": GitCompareArrows,
  key: KeyRound,
  binary: Binary,
  fingerprint: Fingerprint,
  hash: Hash,
  "calendar-clock": CalendarClock,
  regex: Regex,
  refresh: RefreshCw,
};

function readToolIds(key: string): ToolId[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(stored) ? stored.filter((value): value is ToolId => isToolId(value)) : [];
  } catch {
    return [];
  }
}

function storeToolIds(key: string, values: ToolId[]) {
  window.localStorage.setItem(key, JSON.stringify(values));
}

function readTheme(): ThemePreference {
  if (typeof window === "undefined") return "system";
  const value = window.localStorage.getItem(THEME_KEY);
  return value === "light" || value === "dark" ? value : "system";
}

export type DevToolsWorkbenchProps = {
  initialTool?: string | null;
  onToolChange?: (toolId: ToolId) => void;
};

export function DevToolsWorkbench({
  initialTool = DEFAULT_TOOL_ID,
  onToolChange,
}: DevToolsWorkbenchProps) {
  const normalizedInitialTool = normalizeToolId(initialTool);
  const [activeTool, setActiveTool] = useState<ToolId>(normalizedInitialTool);
  const [isRailExpanded, setIsRailExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ToolCategoryFilter>("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<ToolId[]>(() => readToolIds(FAVORITES_KEY));
  const [theme, setTheme] = useState<ThemePreference>(readTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [commandIndex, setCommandIndex] = useState(0);
  const [recentTools, setRecentTools] = useState<ToolId[]>(() => [
    normalizedInitialTool,
    ...readToolIds(RECENT_KEY).filter((id) => id !== normalizedInitialTool),
  ].slice(0, 5));

  useEffect(() => {
    storeToolIds(RECENT_KEY, recentTools);
  }, [recentTools]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      const nextTheme = resolveTheme(theme, media.matches);
      document.documentElement.dataset.theme = nextTheme;
      setResolvedTheme(nextTheme);
      window.localStorage.setItem(THEME_KEY, theme);
    };
    applyTheme();
    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [theme]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isCommandPaletteShortcut(event)) {
        event.preventDefault();
        setIsCommandOpen((open) => !open);
      } else if (event.key === "Escape") {
        setIsCommandOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const visibleTools = useMemo(() => {
    const matched = filterTools(tools, query, category);
    return favoritesOnly ? matched.filter((tool) => favorites.includes(tool.id)) : matched;
  }, [category, favorites, favoritesOnly, query]);
  const recentDefinitions = recentTools
    .map((toolId) => tools.find((tool) => tool.id === toolId))
    .filter((tool) => tool !== undefined);
  const ActiveTool = toolLoaders[activeTool];
  const activeDefinition = tools.find((tool) => tool.id === activeTool) ?? tools[0];
  const commandTools = filterTools(tools, commandQuery);

  function selectTool(toolId: ToolId) {
    setActiveTool(toolId);
    setRecentTools((current) => {
      return [toolId, ...current.filter((id) => id !== toolId)].slice(0, 5);
    });
    onToolChange?.(toolId);
    setIsCommandOpen(false);
    setCommandQuery("");
  }

  function cycleTheme() {
    setTheme((current) => current === "system" ? "light" : current === "light" ? "dark" : "system");
  }

  function toggleFavorite(toolId: ToolId) {
    setFavorites((current) => {
      const next = current.includes(toolId)
        ? current.filter((id) => id !== toolId)
        : [...current, toolId];
      storeToolIds(FAVORITES_KEY, next);
      return next;
    });
  }

  return (
    <ThemeContext.Provider value={resolvedTheme}>
    <main className={isRailExpanded ? "app-shell rail-expanded" : "app-shell"}>
      <aside className="tool-rail" aria-label="开发者工具">
        <div className="brand-block">
          <div className="brand-mark">DT</div>
          <div className="rail-copy"><p className="eyebrow">Developer Tools</p><h1>开发者工具箱</h1></div>
        </div>
        <button
          className="rail-toggle"
          type="button"
          aria-controls="tool-navigation"
          aria-expanded={isRailExpanded}
          aria-label={isRailExpanded ? "收起工具栏" : "展开工具栏"}
          title={isRailExpanded ? "收起工具栏" : "展开工具栏"}
          onClick={() => setIsRailExpanded((expanded) => !expanded)}
        >
          <span aria-hidden="true">{isRailExpanded ? "‹" : "›"}</span>
        </button>

        {isRailExpanded && (
          <section className="rail-controls" aria-label="筛选工具">
            <label className="tool-search"><Search aria-hidden="true" size={16} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索工具或关键词" /></label>
            <div className="category-filter">
              {TOOL_CATEGORIES.map((item) => <button className={category === item.id ? "selected" : ""} type="button" key={item.id} onClick={() => setCategory(item.id)}>{item.label}</button>)}
              <button className={favoritesOnly ? "selected" : ""} type="button" onClick={() => setFavoritesOnly((current) => !current)}><Star aria-hidden="true" size={13} />收藏</button>
            </div>
            {recentDefinitions.length > 0 && <div className="recent-tools"><span>最近使用</span><div>{recentDefinitions.map((tool) => <button type="button" key={tool.id} onClick={() => selectTool(tool.id)}>{tool.label}</button>)}</div></div>}
          </section>
        )}

        <nav className="tool-nav" id="tool-navigation">
          {visibleTools.map((tool) => {
            const ToolIcon = toolIcons[tool.icon];
            const favorite = favorites.includes(tool.id);
            return (
              <div className="tool-nav-item" key={tool.id}>
                <button className={activeTool === tool.id ? "tool-tab active" : "tool-tab"} onClick={() => selectTool(tool.id)} aria-label={tool.label} title={isRailExpanded ? undefined : tool.label} type="button">
                  <span className="tool-icon"><ToolIcon aria-hidden="true" size={24} strokeWidth={1.9} /></span>
                  <span className="tool-copy"><strong>{tool.label}</strong><small>{tool.description}</small></span>
                </button>
                {isRailExpanded && <button className={favorite ? "favorite-button selected" : "favorite-button"} type="button" aria-label={favorite ? `取消收藏${tool.label}` : `收藏${tool.label}`} aria-pressed={favorite} onClick={() => toggleFavorite(tool.id)}><Star aria-hidden="true" size={15} fill={favorite ? "currentColor" : "none"} /></button>}
              </div>
            );
          })}
          {visibleTools.length === 0 && isRailExpanded && <div className="tool-nav-empty">没有匹配的工具</div>}
        </nav>
      </aside>

      <section className="workspace">
        <header className="workspace-header">
          <div><p className="eyebrow">Browser-only utility suite · {TOOL_CATEGORIES.find((item) => item.id === activeDefinition.category)?.label}</p><h2>{activeDefinition.label}</h2></div>
          <div className="workspace-actions">
            <button type="button" className="header-action" onClick={() => setIsCommandOpen(true)} title="搜索工具（⌘/Ctrl K）"><Keyboard aria-hidden="true" size={17} /><span>搜索工具</span><kbd>⌘K</kbd></button>
            <button type="button" className="header-action theme-action" onClick={cycleTheme} aria-label={`当前主题：${theme}，点击切换`} title={`主题：${theme}`}>
              {theme === "system" ? <Monitor aria-hidden="true" size={17} /> : theme === "dark" ? <Moon aria-hidden="true" size={17} /> : <Sun aria-hidden="true" size={17} />}
            </button>
            <div className="status-pills"><span>离线可用</span><span>无上传</span></div>
          </div>
        </header>
        <Suspense fallback={<div className="tool-loading" role="status">正在加载工具…</div>}>
          <ActiveTool />
        </Suspense>
      </section>
    </main>
    {isCommandOpen && (
      <div className="command-backdrop" role="presentation" onMouseDown={() => setIsCommandOpen(false)}>
        <section className="command-palette" role="dialog" aria-modal="true" aria-label="搜索工具" onMouseDown={(event) => event.stopPropagation()}>
          <label className="command-search"><Search aria-hidden="true" size={19} /><input autoFocus type="search" placeholder="输入工具名、用途或关键词" value={commandQuery} onChange={(event) => { setCommandQuery(event.target.value); setCommandIndex(0); }} onKeyDown={(event) => {
            if (event.key === "ArrowDown") { event.preventDefault(); setCommandIndex((index) => Math.min(index + 1, commandTools.length - 1)); }
            if (event.key === "ArrowUp") { event.preventDefault(); setCommandIndex((index) => Math.max(index - 1, 0)); }
            if (event.key === "Enter" && commandTools[commandIndex]) { event.preventDefault(); selectTool(commandTools[commandIndex].id); }
          }} /></label>
          <div className="command-results" role="listbox">
            {commandTools.map((tool, index) => {
              const ToolIcon = toolIcons[tool.icon];
              return <button type="button" role="option" aria-selected={index === commandIndex} className={index === commandIndex ? "selected" : ""} key={tool.id} onMouseEnter={() => setCommandIndex(index)} onClick={() => selectTool(tool.id)}><ToolIcon aria-hidden="true" size={20} /><span><strong>{tool.label}</strong><small>{tool.description}</small></span></button>;
            })}
            {commandTools.length === 0 && <p className="command-empty">没有匹配的工具</p>}
          </div>
          <footer><span>↑↓ 选择</span><span>Enter 打开</span><span>Esc 关闭</span></footer>
        </section>
      </div>
    )}
    </ThemeContext.Provider>
  );
}
