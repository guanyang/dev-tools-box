import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { DevToolsWorkbench } from "../../app/dev-tools-workbench";
import Home from "../../app/page";
import DocDiffTool from "../../app/tool-panels/doc-diff-tool";
import JsonDiffTool from "../../app/tool-panels/json-diff-tool";
import { JsonEditor } from "../../app/tool-panels/json-editor";
import CodeGeneratorTool from "../../app/tool-panels/qr-generator-tool";
import TimeCronTool from "../../app/tool-panels/time-cron-tool";
import { ToolRuntimeProvider } from "../../app/tool-runtime";
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
  Object.defineProperty(window, "scrollTo", {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(cleanup);

describe("workbench keyboard and theme interactions", () => {
  test("switches code generator tabs and updates barcode format guidance", () => {
    const canvasContext = {
      save: vi.fn(),
      restore: vi.fn(),
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      translate: vi.fn(),
      measureText: vi.fn(() => ({ width: 80 })),
      fillStyle: "",
      font: "",
      textAlign: "start",
    } as unknown as CanvasRenderingContext2D;
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(canvasContext);
    const toDataUrl = vi.spyOn(HTMLCanvasElement.prototype, "toDataURL")
      .mockReturnValue("data:image/png;base64,barcode");

    render(
      <ToolRuntimeProvider value={{
        incoming: null,
        sendToTool: vi.fn(),
        consumeTransfer: vi.fn(),
      }}>
        <CodeGeneratorTool />
      </ToolRuntimeProvider>,
    );

    expect(screen.getByRole("tab", { name: "二维码" }).getAttribute("aria-selected")).toBe("true");
    expect((screen.getByLabelText("二维码前景色") as HTMLInputElement).value).toBe("#000000");
    expect(screen.getByText("默认无图标，可上传 PNG、JPEG 或 WebP，最大 2 MB")).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "条形码" }));
    expect(screen.getByRole("heading", { name: "条形码生成" })).toBeTruthy();
    expect(screen.getByText("Code 128 格式要求")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("条形码格式"), { target: { value: "EAN13" } });
    expect(screen.getByText("EAN-13 格式要求")).toBeTruthy();
    expect(screen.getByText(/12 位数字可自动补校验位/)).toBeTruthy();
    expect((screen.getByLabelText("条形码内容") as HTMLInputElement).value).toBe("400638133393");
    fireEvent.click(screen.getByRole("button", { name: "生成条形码" }));
    expect(screen.getByAltText("生成的 EAN-13 条形码")).toBeTruthy();
    expect(screen.getByText("4006381333931")).toBeTruthy();

    getContext.mockRestore();
    toDataUrl.mockRestore();
  });

  test("defaults the time-zone converter to the current local time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 31, 11, 22, 33));

    try {
      render(<TimeCronTool />);
      fireEvent.click(screen.getByRole("tab", { name: "时区转换" }));
      expect((screen.getByLabelText("本地日期时间") as HTMLInputElement).value)
        .toMatch(/^2026-07-31T11:22:33(?:\.000)?$/);
    } finally {
      vi.useRealTimers();
    }
  });

  test("updates the cron description from the current input", () => {
    render(<TimeCronTool />);
    fireEvent.click(screen.getByRole("tab", { name: "Cron 后续时间" }));

    fireEvent.change(screen.getByLabelText("分 时 日 月 周"), {
      target: { value: "30 9 * * 1-5" },
    });

    expect(screen.getByText("工作日 09:30")).toBeTruthy();
    expect(screen.queryByText("工作日 09:00–18:59，每 15 分钟")).toBeNull();
  });

  test("calculates cron runs in the selected time zone", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-12T23:00:00.000Z"));

    try {
      render(<TimeCronTool />);
      fireEvent.click(screen.getByRole("tab", { name: "Cron 后续时间" }));
      fireEvent.change(screen.getByLabelText("分 时 日 月 周"), { target: { value: "0 9 * * 1-5" } });
      fireEvent.change(screen.getByLabelText("计算时区"), { target: { value: "Asia/Tokyo" } });
      fireEvent.click(screen.getByRole("button", { name: "计算后续 8 次" }));

      expect(screen.getAllByText(/UTC\+9/).length).toBe(8);
      expect(screen.getByText(/2026-07-13T00:00:00.000Z/)).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  test("switches cron field formats and explains each field", () => {
    render(<TimeCronTool />);
    fireEvent.click(screen.getByRole("tab", { name: "Cron 后续时间" }));

    const formatSelect = screen.getByLabelText("Cron 格式");
    expect((formatSelect as HTMLSelectElement).value).toBe("5");
    expect(screen.getByLabelText("分 时 日 月 周")).toBeTruthy();

    fireEvent.change(formatSelect, { target: { value: "6" } });
    expect((screen.getByLabelText("秒 分 时 日 月 周") as HTMLInputElement).value)
      .toBe("0 */15 9-18 * * 1-5");
    expect(screen.getByText("执行秒数")).toBeTruthy();

    fireEvent.change(formatSelect, { target: { value: "7" } });
    expect((screen.getByLabelText("秒 分 时 日 月 周 年") as HTMLInputElement).value)
      .toBe("0 */15 9-18 * * 1-5 *");
    expect(screen.getByText("1970–2199")).toBeTruthy();
    expect(screen.getByText("执行年份")).toBeTruthy();
  });

  test("calculates time differences and calendar-aware date shifts", () => {
    render(<TimeCronTool />);
    fireEvent.click(screen.getByRole("tab", { name: "时间计算" }));

    fireEvent.change(screen.getByLabelText("开始时间"), { target: { value: "2026-07-31T10:20:30" } });
    fireEvent.change(screen.getByLabelText("结束时间"), { target: { value: "2026-08-01T11:22:33" } });
    fireEvent.click(screen.getByRole("button", { name: "计算时间差" }));
    expect(screen.getByText("1 天 01 时 02 分 03 秒")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("基准时间"), { target: { value: "2026-01-31T12:00:00" } });
    fireEvent.change(screen.getByLabelText("月"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("日"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "计算结果" }));
    expect(screen.getByText("2026-02-28 12:00:00")).toBeTruthy();
  });

  test("switches between the four time and cron tabs", () => {
    render(<TimeCronTool />);

    expect(screen.getByRole("tab", { name: "时间戳转换" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tabpanel").getAttribute("aria-labelledby")).toBe("time-cron-tab-timestamp");

    fireEvent.click(screen.getByRole("tab", { name: "时区转换" }));
    expect(screen.getByRole("heading", { name: "源时区 → 目标时区" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Unix 时间戳转换" })).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: "Cron 后续时间" }));
    expect(screen.getByRole("heading", { name: "Cron 后续时间" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "源时区 → 目标时区" })).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: "时间计算" }));
    expect(screen.getByRole("heading", { name: "时间差计算" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "时间加减运算" })).toBeTruthy();
  });

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

  test("keeps a tool draft in memory and returns to the top when switching tools", async () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    const user = userEvent.setup();
    render(<DevToolsWorkbench initialTool="regex-tester" />);

    const pattern = await screen.findByLabelText("正则表达式");
    await user.clear(pattern);
    await user.type(pattern, "AUDIT_MARKER");
    await user.click(screen.getByRole("button", { name: "哈希与文件校验" }));
    await user.click(screen.getByRole("button", { name: "正则表达式测试" }));

    expect((screen.getByLabelText("正则表达式") as HTMLInputElement).value).toBe("AUDIT_MARKER");
    expect(scrollTo).toHaveBeenCalledWith({ behavior: "auto", top: 0 });
  });

  test("explains the intent of each regex flag", async () => {
    render(<DevToolsWorkbench initialTool="regex-tester" />);

    const globalFlag = await screen.findByRole("button", { name: /g 全局匹配/ });
    const multilineFlag = screen.getByRole("button", { name: /m 多行模式/ });
    expect(globalFlag.getAttribute("title")).toBe("查找全部匹配，而不是只返回第一处");
    expect(multilineFlag.getAttribute("title")).toBe("让 ^ 和 $ 分别匹配每一行的开头与结尾");
    expect(globalFlag.getAttribute("aria-pressed")).toBe("true");
    expect(multilineFlag.getAttribute("aria-pressed")).toBe("false");
  });

  test("applies a compact regex preset without replacing test text", async () => {
    const user = userEvent.setup();
    render(<DevToolsWorkbench initialTool="regex-tester" />);

    const testText = await screen.findByLabelText("测试文本") as HTMLTextAreaElement;
    await user.clear(testText);
    await user.type(testText, "联系 dev@example.com 获取帮助");
    await user.selectOptions(screen.getByLabelText("常用正则"), "email");

    expect((screen.getByLabelText("正则表达式") as HTMLInputElement).value).toBe("[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}");
    expect(screen.getByRole("button", { name: /i 忽略大小写/ }).getAttribute("aria-pressed")).toBe("true");
    expect(testText.value).toBe("联系 dev@example.com 获取帮助");
    expect((screen.getByLabelText("替换表达式") as HTMLInputElement).value).toBe("");
    expect(screen.queryByRole("button", { name: /邮箱地址/ })).toBeNull();
  });

  test("offers compatibility hashes without allowing HMAC-MD5", async () => {
    const user = userEvent.setup();
    render(<DevToolsWorkbench initialTool="hash-checksum" />);

    const algorithm = await screen.findByLabelText("算法") as HTMLSelectElement;
    expect(screen.getByRole("option", { name: "MD5（旧校验）" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "SHA-1（旧校验）" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "SHA-384" })).toBeTruthy();

    await user.selectOptions(algorithm, "MD5");
    expect(screen.getByRole("note").textContent).toContain("不适合密码存储或数字签名");
    await user.selectOptions(screen.getByLabelText("输入类型"), "hmac");

    expect(algorithm.value).toBe("SHA-256");
    expect(screen.queryByRole("option", { name: "MD5（旧校验）" })).toBeNull();
  });

  test("opens a web deep link and keeps browser history in sync", async () => {
    window.history.replaceState({}, "", "/?tool=json-format");
    const user = userEvent.setup();
    render(<Home />);

    expect(await screen.findByRole("heading", { name: "JSON 格式化" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "正则表达式测试" }));
    expect(window.location.search).toBe("?tool=regex-tester");

    window.history.replaceState({}, "", "/?tool=json-format");
    fireEvent(window, new PopStateEvent("popstate"));
    expect(await screen.findByRole("heading", { name: "JSON 格式化" })).toBeTruthy();
  });

  test("opens and dismisses the mobile tool drawer", async () => {
    vi.mocked(window.matchMedia).mockImplementation(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }) as unknown as MediaQueryList);
    const user = userEvent.setup();
    render(<DevToolsWorkbench />);

    const trigger = screen.getByRole("button", { name: "打开工具菜单" });
    await user.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(document.body.style.overflow).toBe("hidden");
    await user.click(screen.getByRole("button", { name: "关闭工具菜单" }));
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.body.style.overflow).toBe("");
    await waitFor(() => expect(document.activeElement).toBe(trigger));

    await user.click(trigger);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  test("exposes selectable tool states and localized errors", async () => {
    const user = userEvent.setup();
    render(<DevToolsWorkbench initialTool="id-generator" />);

    const uuidV7 = await screen.findByRole("button", { name: /UUID v7/ });
    expect(uuidV7.getAttribute("aria-pressed")).toBe("true");
    await user.click(screen.getByRole("button", { name: /UUID v4/ }));
    expect(uuidV7.getAttribute("aria-pressed")).toBe("false");

    await user.click(screen.getByRole("button", { name: "正则表达式测试" }));
    fireEvent.change(await screen.findByLabelText("正则表达式"), { target: { value: "(" } });
    expect(screen.getByRole("alert").textContent).toContain("正则表达式无效");
    expect(screen.getByRole("button", { name: /g 全局匹配/ }).getAttribute("aria-pressed")).toBe("true");

    await user.click(screen.getByRole("button", { name: "JWT / JWK 校验" }));
    fireEvent.change(await screen.findByLabelText("JWT Token"), { target: { value: "abc.def.ghi" } });
    await user.click(screen.getByRole("button", { name: "解析声明" }));
    expect(screen.getByRole("alert").textContent).toContain("JWT 内容无法解析");
  });

  test("restores focus after closing a global dialog", async () => {
    const user = userEvent.setup();
    render(<DevToolsWorkbench />);
    const trigger = screen.getByRole("button", { name: /搜索工具/ });

    await user.click(trigger);
    expect(screen.getByPlaceholderText("输入工具名、用途或关键词")).toBe(document.activeElement);
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  test("filters codec methods and separates JSONPath into its own tab", async () => {
    const user = userEvent.setup();
    render(<DevToolsWorkbench initialTool="codec" />);

    const search = await screen.findByPlaceholderText("搜索转换方式");
    await user.type(search, "Base64");
    expect(screen.getByRole("button", { name: /Base64编码/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Base64解码/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Unicode编码/ })).toBeNull();

    await user.click(screen.getByRole("button", { name: "结构化数据工作台" }));
    expect(await screen.findByRole("tab", { name: "JSONPath 查询" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "JSONPath 查询" })).toBeNull();
    await user.click(screen.getByRole("tab", { name: "JSONPath 查询" }));
    expect(screen.getByRole("heading", { name: "JSONPath 查询" })).toBeTruthy();
  });

  test("uses explicit action copy, UTC offsets and focus layout types", async () => {
    const user = userEvent.setup();
    const { container } = render(<DevToolsWorkbench initialTool="time-cron" />);
    expect((await screen.findByRole("option", { name: "UTC+08:00 · Asia/Shanghai" })).getAttribute("value")).toBe("Asia/Shanghai");

    await user.click(screen.getByRole("button", { name: "码生成器" }));
    await user.click(await screen.findByRole("button", { name: "专注模式" }));
    expect(container.querySelector(".app-shell")?.classList.contains("focus-layout-split-preview")).toBe(true);

    await user.click(screen.getByRole("button", { name: "退出专注" }));
    await user.click(screen.getByRole("button", { name: "JSON 格式化" }));
    await user.click(await screen.findByRole("button", { name: "格式化" }));
    expect(await screen.findByRole("button", { name: "发送并打开" })).toBeTruthy();
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

  test("enters focus mode and exits it with Escape", async () => {
    const { container } = render(<DevToolsWorkbench initialTool="password" />);
    const focusButton = await screen.findByRole("button", { name: "专注模式" });

    fireEvent.click(focusButton);
    expect(container.querySelector(".app-shell")?.classList.contains("focus-mode")).toBe(true);
    expect(screen.getByRole("toolbar", { name: "专注模式" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "退出专注" })).toBeTruthy();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(container.querySelector(".app-shell")?.classList.contains("focus-mode")).toBe(false);
  });

  test("uses equal title rows for the JSON formatter panes", async () => {
    const { container } = render(<DevToolsWorkbench initialTool="json-format" />);

    await screen.findByLabelText("输入 JSON");
    expect(container.querySelectorAll(".json-format-workspace .editor-block-header")).toHaveLength(2);
  });

  test("resizes document editors with the keyboard", () => {
    render(<DocDiffTool />);
    const separator = screen.getByRole("separator", { name: "调整原始文档和新文档大小" });

    expect(separator.getAttribute("aria-valuenow")).toBe("50");
    fireEvent.keyDown(separator, { key: "ArrowRight" });
    expect(separator.getAttribute("aria-valuenow")).toBe("55");
  });

  test("keeps both document editors when focusing on the input pane", () => {
    render(<DocDiffTool />);

    fireEvent.click(screen.getByRole("button", { name: "只看输入" }));
    expect(screen.getByLabelText("原始文档")).toBeTruthy();
    expect(screen.getByLabelText("新文档")).toBeTruthy();
    expect(screen.queryByRole("table", { name: "文档差异结果" })).toBeNull();
  });

  test("lets JSON diff focus on the result and restore the split view", () => {
    render(
      <ToolRuntimeProvider value={{ incoming: null, sendToTool: vi.fn(), consumeTransfer: vi.fn() }}>
        <JsonDiffTool />
      </ToolRuntimeProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "只看差异" }));
    expect(screen.queryByLabelText("左侧 JSON")).toBeNull();
    expect(screen.getByRole("table", { name: "JSON 差异结果" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "恢复分栏" }));
    expect(screen.getByLabelText("左侧 JSON")).toBeTruthy();
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

  test("places transferred JSON into the left diff editor", async () => {
    const consumeTransfer = vi.fn();
    render(
      <ToolRuntimeProvider value={{
        incoming: {
          id: "transfer-1",
          sourceToolId: "json-format",
          targetToolId: "json-diff",
          value: '{"service":"transferred"}',
          valueType: "json",
        },
        sendToTool: vi.fn(),
        consumeTransfer,
      }}>
        <JsonDiffTool />
      </ToolRuntimeProvider>,
    );

    await waitFor(() => expect(consumeTransfer).toHaveBeenCalledWith("transfer-1"));
    expect(screen.getByLabelText("左侧 JSON").textContent).toContain("transferred");
  });
});
