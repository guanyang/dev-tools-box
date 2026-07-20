import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { DevToolsWorkbench } from "../../app/dev-tools-workbench";
import { JsonEditor } from "../../app/tool-panels/json-editor";
import { ThemeContext } from "../../app/workbench-preferences";

beforeEach(() => {
  const values = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
  });
  delete document.documentElement.dataset.theme;
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
});

afterEach(cleanup);

describe("workbench keyboard and theme interactions", () => {
  test("opens with Cmd+K, filters tools and selects the result", async () => {
    const user = userEvent.setup();
    render(<DevToolsWorkbench />);

    fireEvent.keyDown(window, { key: "k", metaKey: true });
    const dialog = screen.getByRole("dialog", { name: "搜索工具" });
    expect(dialog).toBeTruthy();

    await user.type(screen.getByPlaceholderText("输入工具名、用途或关键词"), "正则");
    await user.click(screen.getByRole("option", { name: /正则表达式测试/ }));
    expect(screen.queryByRole("dialog", { name: "搜索工具" })).toBeNull();
    expect(screen.getByRole("heading", { name: "正则表达式测试" })).toBeTruthy();
  });

  test("cycles and persists the theme preference", async () => {
    const user = userEvent.setup();
    render(<DevToolsWorkbench />);
    const themeButton = screen.getByRole("button", { name: /当前主题：system/ });

    await user.click(themeButton);
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("light"));
    expect(window.localStorage.getItem("dev-tools-box:theme")).toBe("light");
  });

  test("uses distinct icons for system, light and dark themes", async () => {
    const user = userEvent.setup();
    const { container } = render(<DevToolsWorkbench />);
    let themeButton = screen.getByRole("button", { name: /当前主题：system/ });
    expect(themeButton.querySelector(".lucide-monitor")).toBeTruthy();

    await user.click(themeButton);
    themeButton = screen.getByRole("button", { name: /当前主题：light/ });
    expect(themeButton.querySelector(".lucide-sun")).toBeTruthy();

    await user.click(themeButton);
    themeButton = screen.getByRole("button", { name: /当前主题：dark/ });
    expect(themeButton.querySelector(".lucide-moon")).toBeTruthy();
    expect(container).toBeTruthy();
  });

  test("uses a dark CodeMirror theme when the document theme is dark", () => {
    const { container } = render(<ThemeContext.Provider value="dark"><JsonEditor label="JSON" value="{}" onChange={() => {}} /></ThemeContext.Provider>);
    expect(container.querySelector(".cm-theme-dark")).toBeTruthy();
  });

  test("detects explicitly pasted JSON and opens the recommended tool", async () => {
    const user = userEvent.setup();
    render(<DevToolsWorkbench />);
    await user.click(screen.getByRole("button", { name: /智能识别/ }));
    const input = screen.getByPlaceholderText("在这里粘贴 JSON、YAML、JWT、URL 等内容");
    fireEvent.paste(input, { clipboardData: { getData: () => '{"service":"api"}' } });
    await user.click(screen.getByRole("button", { name: /格式化 JSON/ }));
    expect(screen.getByRole("heading", { name: "JSON 格式化" })).toBeTruthy();
    expect(window.localStorage.getItem("dev-tools-box:recent")).not.toContain("service");
  });
});
