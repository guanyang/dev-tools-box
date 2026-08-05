"use client";

import { Suspense, useMemo, useState, useEffect, useRef } from "react";
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
  Menu,
  Maximize2,
  Minimize2,
  Monitor,
  Moon,
  RefreshCw,
  Regex,
  QrCode,
  Search,
  ScanSearch,
  ShieldCheck,
  Sun,
  Star,
  type LucideIcon,
} from "lucide-react";
import { toolLoaders } from "./tool-loaders";
import { detectInput, type DetectionResult } from "./tool-logic/smart-detection";
import { ToolRuntimeProvider, type ToolTransfer } from "./tool-runtime";
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
  "shield-check": ShieldCheck,
  "qr-code": QrCode,
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
  const [visitedTools, setVisitedTools] = useState<ToolId[]>([normalizedInitialTool]);
  const [isRailExpanded, setIsRailExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ToolCategoryFilter>("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<ToolId[]>(() => readToolIds(FAVORITES_KEY));
  const [theme, setTheme] = useState<ThemePreference>(readTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isDetectOpen, setIsDetectOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [detectValue, setDetectValue] = useState("");
  const [detection, setDetection] = useState<DetectionResult | null>(null);
  const [incoming, setIncoming] = useState<ToolTransfer | null>(null);
  const [commandQuery, setCommandQuery] = useState("");
  const [commandIndex, setCommandIndex] = useState(0);
  const commandReturnFocusRef = useRef<HTMLElement | null>(null);
  const detectReturnFocusRef = useRef<HTMLElement | null>(null);
  const railRef = useRef<HTMLElement | null>(null);
  const mobileRailTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [recentTools, setRecentTools] = useState<ToolId[]>(() => [
    normalizedInitialTool,
    ...readToolIds(RECENT_KEY).filter((id) => id !== normalizedInitialTool),
  ].slice(0, 5));

  useEffect(() => {
    storeToolIds(RECENT_KEY, recentTools);
  }, [recentTools]);

  useEffect(() => {
    const nextTool = normalizeToolId(initialTool);
    const frame = window.requestAnimationFrame(() => {
      setActiveTool(nextTool);
      setVisitedTools((current) => current.includes(nextTool) ? current : [...current, nextTool]);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [initialTool]);

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
    if (!isRailExpanded || !window.matchMedia("(max-width: 620px)").matches) return;
    const rail = railRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : mobileRailTriggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => rail?.querySelector<HTMLElement>("button, input")?.focus());

    const containFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !rail) return;
      const focusable = Array.from(rail.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex='-1'])"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    rail?.addEventListener("keydown", containFocus);
    return () => {
      rail?.removeEventListener("keydown", containFocus);
      document.body.style.overflow = previousOverflow;
      restoreFocus(previousFocus);
    };
  }, [isRailExpanded]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isCommandPaletteShortcut(event)) {
        event.preventDefault();
        if (isCommandOpen) {
          setIsCommandOpen(false);
          restoreFocus(commandReturnFocusRef.current);
        } else {
          commandReturnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
          setIsCommandOpen(true);
        }
      } else if (event.key === "Escape") {
        if (isCommandOpen) {
          setIsCommandOpen(false);
          restoreFocus(commandReturnFocusRef.current);
        }
        if (isDetectOpen) {
          setIsDetectOpen(false);
          restoreFocus(detectReturnFocusRef.current);
        }
        setIsFocusMode(false);
        setIsRailExpanded(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isCommandOpen, isDetectOpen]);

  const visibleTools = useMemo(() => {
    const matched = filterTools(tools, query, category);
    return favoritesOnly ? matched.filter((tool) => favorites.includes(tool.id)) : matched;
  }, [category, favorites, favoritesOnly, query]);
  const recentDefinitions = recentTools
    .map((toolId) => tools.find((tool) => tool.id === toolId))
    .filter((tool) => tool !== undefined);
  const activeDefinition = tools.find((tool) => tool.id === activeTool) ?? tools[0];
  const commandTools = filterTools(tools, commandQuery);

  function selectTool(toolId: ToolId) {
    setActiveTool(toolId);
    setVisitedTools((current) => current.includes(toolId) ? current : [...current, toolId]);
    setIsFocusMode(false);
    if (window.matchMedia("(max-width: 620px)").matches) setIsRailExpanded(false);
    window.scrollTo({ behavior: "auto", top: 0 });
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

  function restoreFocus(target: HTMLElement | null) {
    window.requestAnimationFrame(() => target?.focus());
  }

  function openCommand() {
    commandReturnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setIsCommandOpen(true);
  }

  function closeCommand() {
    setIsCommandOpen(false);
    restoreFocus(commandReturnFocusRef.current);
  }

  function openDetect() {
    detectReturnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setIsDetectOpen(true);
  }

  function closeDetect() {
    setIsDetectOpen(false);
    restoreFocus(detectReturnFocusRef.current);
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

  function analyzeInput(value: string) {
    setDetectValue(value);
    setDetection(detectInput(value));
  }

  function sendToTool(sourceToolId: ToolId | null, targetToolId: ToolId, value: string, valueType: import("./tools").ToolValueType) {
    setIncoming({ id: crypto.randomUUID(), sourceToolId, targetToolId, value, valueType });
    selectTool(targetToolId);
    setIsDetectOpen(false);
  }

  async function readSelectedFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 1024 * 1024) {
      setDetectValue("");
      setDetection({ status: "too-large", byteLength: file.size, suggestions: [] });
      return;
    }
    analyzeInput(await file.text());
  }

  return (
    <ToolRuntimeProvider value={{ incoming, sendToTool, consumeTransfer: (id) => setIncoming((current) => current?.id === id ? null : current) }}>
    <ThemeContext.Provider value={resolvedTheme}>
    <main className={`${isRailExpanded ? "app-shell rail-expanded" : "app-shell"}${isFocusMode ? ` focus-mode focus-layout-${activeDefinition.focusLayout}` : ""}`}>
      {isRailExpanded && <button className="mobile-rail-backdrop" type="button" aria-label="关闭工具菜单" onClick={() => setIsRailExpanded(false)} />}
      <aside className="tool-rail" aria-label="开发者工具" ref={railRef}>
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
          <div className="workspace-heading">
            <button className="mobile-rail-trigger" ref={mobileRailTriggerRef} type="button" aria-controls="tool-navigation" aria-expanded={isRailExpanded} aria-label="打开工具菜单" onClick={() => setIsRailExpanded(true)}><Menu aria-hidden="true" size={18} /><span>工具</span></button>
            <div><p className="eyebrow">Browser-only utility suite · {TOOL_CATEGORIES.find((item) => item.id === activeDefinition.category)?.label}</p><h2>{activeDefinition.label}</h2></div>
          </div>
          <div className="workspace-actions">
            <button type="button" className="header-action" onClick={() => setIsFocusMode(true)} title="隐藏导航并铺满当前工具"><Maximize2 aria-hidden="true" size={17} /><span>专注模式</span></button>
            <button type="button" className="header-action" onClick={openDetect} title="粘贴或选择内容后推荐工具"><ScanSearch aria-hidden="true" size={17} /><span>智能识别</span></button>
            <button type="button" className="header-action" onClick={openCommand} title="搜索工具（⌘/Ctrl K）"><Keyboard aria-hidden="true" size={17} /><span>搜索工具</span><kbd>⌘K</kbd></button>
            <button type="button" className="header-action theme-action" onClick={cycleTheme} aria-label={`当前主题：${theme}，点击切换`} title={`主题：${theme}`}>
              {theme === "system" ? <Monitor aria-hidden="true" size={17} /> : theme === "dark" ? <Moon aria-hidden="true" size={17} /> : <Sun aria-hidden="true" size={17} />}
            </button>
            <div className="status-pills"><span>离线可用</span><span>无上传</span></div>
          </div>
        </header>
        {isFocusMode && (
          <div className="focus-mode-bar" role="toolbar" aria-label="专注模式">
            <div><span>专注模式</span><strong>{activeDefinition.label}</strong></div>
            <button type="button" onClick={() => setIsFocusMode(false)} title="退出专注模式（Esc）"><Minimize2 aria-hidden="true" size={16} />退出专注</button>
          </div>
        )}
        {visitedTools.map((toolId) => {
          const ToolPanel = toolLoaders[toolId];
          return <div className="tool-stage" hidden={toolId !== activeTool} key={toolId}>
            <Suspense fallback={<div className="tool-loading" role="status">正在加载工具…</div>}>
              <ToolPanel />
            </Suspense>
          </div>;
        })}
      </section>
    </main>
    {isCommandOpen && (
      <div className="command-backdrop" role="presentation" onMouseDown={closeCommand}>
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
    {isDetectOpen && (
      <div className="command-backdrop" role="presentation" onMouseDown={closeDetect}>
        <section className="detect-dialog" role="dialog" aria-modal="true" aria-label="智能内容识别" onMouseDown={(event) => event.stopPropagation()}>
          <header><div><h3>智能内容识别</h3><p>仅在你粘贴、拖放、选文件或点击识别后本地分析，最大 1 MB。</p></div><button type="button" onClick={closeDetect} aria-label="关闭">×</button></header>
          <label className="detect-drop" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void readSelectedFile(event.dataTransfer.files[0]); }}>
            <textarea autoFocus value={detectValue} placeholder="在这里粘贴 JSON、YAML、JWT、URL 等内容" onChange={(event) => setDetectValue(event.target.value)} onPaste={(event) => { const value = event.clipboardData.getData("text"); if (value) { event.preventDefault(); analyzeInput(value); } }} />
            <span>也可以拖放文件，或 <strong>选择文件</strong></span>
            <input type="file" onChange={(event) => void readSelectedFile(event.target.files?.[0])} />
          </label>
          <div className="detect-actions"><button type="button" disabled={!detectValue} onClick={() => analyzeInput(detectValue)}>识别当前输入</button><span>{detection ? `${detection.byteLength.toLocaleString()} bytes` : "内容不会上传或保存"}</span></div>
          {detection?.status === "too-large" && <div className="error-banner" role="alert">内容超过 1 MB 识别上限，请直接打开对应工具处理。</div>}
          {detection?.status === "timed-out" && <div className="error-banner" role="alert">识别超过 40 ms 时间预算，已停止分析。</div>}
          {detection?.status === "unknown" && <div className="detect-empty">暂未识别出明确格式，可继续编辑后重试。</div>}
          {detection?.suggestions.map((item) => <button className="detect-suggestion" type="button" key={`${item.kind}-${item.toolId}`} onClick={() => sendToTool(null, item.toolId, detectValue, item.kind)}><span><strong>{item.label}</strong><small>{item.kind.toUpperCase()} · 置信度 {Math.round(item.confidence * 100)}%</small></span><span>打开 →</span></button>)}
        </section>
      </div>
    )}
    </ThemeContext.Provider>
    </ToolRuntimeProvider>
  );
}
