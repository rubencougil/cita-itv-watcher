import fs from "node:fs/promises";
import path from "node:path";

export async function readState(statePath) {
  try {
    const contents = await fs.readFile(path.resolve(statePath), "utf8");
    return JSON.parse(contents);
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

export async function writeState(statePath, state) {
  const absolutePath = path.resolve(statePath);
  await fs.writeFile(absolutePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}
