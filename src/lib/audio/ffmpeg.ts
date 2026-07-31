import { spawn } from "node:child_process";

export class FfmpegError extends Error {}

function run(bin: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", (err) =>
      reject(
        new FfmpegError(
          `No se pudo ejecutar "${bin}". ¿Está ffmpeg instalado y en el PATH? (${err.message})`,
        ),
      ),
    );
    child.on("close", (code) => {
      if (code === 0) resolve(stdout.trim());
      // ffmpeg escribe todo su log en stderr; con código != 0 la cola es el error real.
      else reject(new FfmpegError(`${bin} salió con código ${code}:\n${stderr.slice(-2000)}`));
    });
  });
}

export const ffmpeg = (args: string[]) => run("ffmpeg", args);
export const ffprobe = (args: string[]) => run("ffprobe", args);

export async function durationMs(file: string): Promise<number> {
  const out = await ffprobe([
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    file,
  ]);
  const seconds = Number.parseFloat(out);
  return Number.isFinite(seconds) ? Math.round(seconds * 1000) : 0;
}

export async function assertAvailable(): Promise<void> {
  await run("ffmpeg", ["-version"]);
  await run("ffprobe", ["-version"]);
}
