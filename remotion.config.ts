/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import { Config } from "@remotion/cli/config";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

Config.setRspack(true);
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);

// In sandboxed environments (e.g. Claude Code on the web) Remotion cannot
// download its own Chrome Headless Shell. Use REMOTION_BROWSER_EXECUTABLE or
// a pre-installed Playwright headless shell if one is available.
const findBrowserExecutable = (): string | null => {
  const fromEnv = process.env.REMOTION_BROWSER_EXECUTABLE;
  if (fromEnv && existsSync(fromEnv)) {
    return fromEnv;
  }

  const playwrightDir =
    process.env.PLAYWRIGHT_BROWSERS_PATH ?? "/opt/pw-browsers";
  if (!existsSync(playwrightDir)) {
    return null;
  }

  const candidates = readdirSync(playwrightDir)
    .filter((dir) => dir.startsWith("chromium_headless_shell-"))
    .sort()
    .reverse()
    .map((dir) => join(playwrightDir, dir, "chrome-linux", "headless_shell"));

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
};

const browserExecutable = findBrowserExecutable();
if (browserExecutable) {
  Config.setBrowserExecutable(browserExecutable);
}
