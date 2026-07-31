import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";
import { lazyProxy } from "@/lib/lazy";

export const MODEL = "claude-opus-5";

export const anthropic = lazyProxy(() => new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }));
