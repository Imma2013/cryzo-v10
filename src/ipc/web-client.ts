/**
 * Web-compatible IPC client.
 * Replaces Electron IPC with REST API calls for the web app.
 * Stubs out features that aren't available in the browser.
 */

import {
  createWebClient,
  createWebEventClient,
  createWebStreamClient,
} from "../lib/web-ipc";

import { settingsContracts } from "./types/settings";
import { appContracts } from "./types/app";
import { chatContracts, chatStreamContract } from "./types/chat";
import { agentContracts, agentEvents } from "./types/agent";
import { githubContracts, gitContracts, githubEvents } from "./types/github";
import { mcpContracts, mcpEvents } from "./types/mcp";
import { vercelContracts } from "./types/vercel";
import { supabaseContracts } from "./types/supabase";
import { neonContracts } from "./types/neon";
import { migrationContracts } from "./types/migration";
import { systemContracts, systemEvents } from "./types/system";
import { versionContracts } from "./types/version";
import { languageModelContracts } from "./types/language-model";
import { promptContracts } from "./types/prompts";
import { templateContracts } from "./types/templates";
import { proposalContracts } from "./types/proposals";
import { importContracts } from "./types/import";
import { helpContracts, helpStreamContract } from "./types/help";
import { capacitorContracts } from "./types/capacitor";
import { contextContracts } from "./types/context";
import { upgradeContracts } from "./types/upgrade";
import { visualEditingContracts } from "./types/visual-editing";
import { securityContracts } from "./types/security";
import { miscContracts, miscEvents } from "./types/misc";
import { freeAgentQuotaContracts } from "./types/free_agent_quota";
import { audioContracts } from "./types/audio";
import { mediaContracts } from "./types/media";
import { imageGenerationContracts } from "./types/image_generation";

export const webIpc = {
  settings: createWebClient(settingsContracts),
  app: createWebClient(appContracts),
  chat: createWebClient(chatContracts),
  agent: createWebClient(agentContracts),

  chatStream: createWebStreamClient(chatStreamContract),
  helpStream: createWebStreamClient(helpStreamContract),

  github: createWebClient(githubContracts),
  git: createWebClient(gitContracts),
  mcp: createWebClient(mcpContracts),
  vercel: createWebClient(vercelContracts),
  supabase: createWebClient(supabaseContracts),
  neon: createWebClient(neonContracts),
  migration: createWebClient(migrationContracts),

  system: createWebClient(systemContracts),
  version: createWebClient(versionContracts),
  languageModel: createWebClient(languageModelContracts),
  prompt: createWebClient(promptContracts),
  template: createWebClient(templateContracts),
  proposal: createWebClient(proposalContracts),
  import: createWebClient(importContracts),
  help: createWebClient(helpContracts),
  capacitor: createWebClient(capacitorContracts),
  context: createWebClient(contextContracts),
  upgrade: createWebClient(upgradeContracts),
  visualEditing: createWebClient(visualEditingContracts),
  security: createWebClient(securityContracts),
  misc: createWebClient(miscContracts),
  freeAgentQuota: createWebClient(freeAgentQuotaContracts),
  audio: createWebClient(audioContracts),
  media: createWebClient(mediaContracts),
  imageGeneration: createWebClient(imageGenerationContracts),

  events: {
    agent: createWebEventClient(agentEvents),
    github: createWebEventClient(githubEvents),
    mcp: createWebEventClient(mcpEvents),
    system: createWebEventClient(systemEvents),
    misc: createWebEventClient(miscEvents),
  },
} as const;
