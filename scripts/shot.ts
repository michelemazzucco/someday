import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9333;

type Shot = { path: string; url: string; width: number; height: number; scheme: "light" | "dark"; mobile?: boolean };

class Cdp {
  private socket!: WebSocket;
  private id = 0;
  private pending = new Map<number, (value: Record<string, unknown>) => void>();

  async connect(wsUrl: string) {
    this.socket = new WebSocket(wsUrl);
    await new Promise<void>((resolve, reject) => {
      this.socket.addEventListener("open", () => resolve(), { once: true });
      this.socket.addEventListener("error", () => reject(new Error("cdp connect failed")), { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data));
      const resolve = this.pending.get(message.id);
      if (resolve) {
        this.pending.delete(message.id);
        resolve(message.result ?? {});
      }
    });
  }

  send(method: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    const id = ++this.id;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve) => this.pending.set(id, resolve));
  }

  close() {
    this.socket.close();
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const shots: Shot[] = JSON.parse(process.argv[2]);

  const chrome = spawn(CHROME, [
    "--headless",
    "--disable-gpu",
    "--hide-scrollbars",
    `--remote-debugging-port=${PORT}`,
    "--user-data-dir=/tmp/someday-shot-profile",
    "about:blank",
  ], { stdio: "ignore" });

  try {
    let target: { webSocketDebuggerUrl: string } | undefined;
    for (let attempt = 0; attempt < 40 && !target; attempt++) {
      await wait(250);
      try {
        const list = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()) as {
          type: string;
          webSocketDebuggerUrl: string;
        }[];
        target = list.find((entry) => entry.type === "page");
      } catch {
        // Chrome is not listening yet.
      }
    }
    if (!target) throw new Error("no debuggable page target");

    const cdp = new Cdp();
    await cdp.connect(target.webSocketDebuggerUrl);
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");

    for (const shot of shots) {
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width: shot.width,
        height: shot.height,
        deviceScaleFactor: 2,
        mobile: shot.mobile ?? false,
      });
      await cdp.send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-color-scheme", value: shot.scheme }],
      });

      await cdp.send("Page.navigate", { url: shot.url });
      await wait(2500);

      const probe = (await cdp.send("Runtime.evaluate", {
        expression: `JSON.stringify({
          inner: window.innerWidth,
          scroll: document.documentElement.scrollWidth,
          widest: (() => {
            let worst = { tag: null, width: 0 };
            for (const el of document.querySelectorAll('body *')) {
              const box = el.getBoundingClientRect();
              if (box.right > worst.width) worst = { tag: el.tagName + (el.className ? '.' + String(el.className).split(' ')[0] : ''), width: Math.round(box.right) };
            }
            return worst;
          })(),
        })`,
        returnByValue: true,
      })) as { result: { value: string } };

      const metrics = JSON.parse(probe.result.value);
      const overflow = metrics.scroll > metrics.inner;
      console.log(
        `${overflow ? "OVERFLOW" : "ok      "} ${shot.path.split("/").pop()!.padEnd(24)} viewport ${metrics.inner} scrollWidth ${metrics.scroll}` +
          (overflow ? `  widest: ${metrics.widest.tag} @ ${metrics.widest.width}px` : ""),
      );

      const capture = (await cdp.send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: true,
      })) as { data: string };

      mkdirSync(dirname(shot.path), { recursive: true });
      writeFileSync(shot.path, Buffer.from(capture.data, "base64"));
    }

    cdp.close();
  } finally {
    chrome.kill();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
