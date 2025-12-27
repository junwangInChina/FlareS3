import { Router } from "itty-router";
import type { Env } from "./config/env";
import { requestIdMiddleware } from "./middleware/requestId";
import { rateLimitMiddleware } from "./middleware/rateLimit";
import { bootstrapAdmin } from "./middleware/bootstrapAdmin";
import { authSessionMiddleware } from "./middleware/authSession";
import { requireAuth, requireAdmin } from "./middleware/roleGuard";
import { login, logout, status as authStatus } from "./routes/auth";
import {
  listUsers,
  createUser,
  updateUser,
  resetPassword,
  deleteUser,
} from "./routes/users";
import {
  status as setupStatus,
  saveConfig as saveSetup,
  testConfig as testSetup,
} from "./routes/setup";
import {
  listOptions as listR2Options,
  listConfigs as listR2Configs,
  createConfig as createR2Config,
  updateConfig as updateR2Config,
  deleteConfig as deleteR2Config,
  setDefault as setDefaultR2Config,
  setLegacyFiles as setLegacyFilesR2Config,
  testById as testR2Config,
} from "./routes/r2Configs";
import {
  presignUpload,
  confirmUpload,
  initMultipart,
  presignMultipart,
  completeMultipart,
} from "./routes/upload";
import { listFiles, downloadFile, deleteFile } from "./routes/files";
import { shortlink } from "./routes/shortlink";
import { getStats } from "./routes/stats";
import { listAudit } from "./routes/audit";
import { cleanupExpired } from "./jobs/cleanupExpired";
import { cleanupDeleteQueue } from "./jobs/cleanupDeleteQueue";

const router = Router();

router.post("/api/auth/login", (request, env: Env) => login(request, env));
router.post("/api/auth/logout", (request, env: Env) => {
  const auth = requireAuth(request);
  if (auth) return auth;
  return logout(request, env);
});
router.get("/api/auth/status", (request, env: Env) => {
  const auth = requireAuth(request);
  if (auth) return auth;
  return authStatus(request);
});

router.get("/api/users", (request, env: Env) => {
  const auth = requireAdmin(request);
  if (auth) return auth;
  return listUsers(request, env);
});
router.post("/api/users", (request, env: Env) => {
  const auth = requireAdmin(request);
  if (auth) return auth;
  return createUser(request, env);
});
router.patch("/api/users/:id", (request, env: Env) => {
  const auth = requireAdmin(request);
  if (auth) return auth;
  return updateUser(request, env, (request as any).params.id);
});
router.post("/api/users/:id/reset-password", (request, env: Env) => {
  const auth = requireAdmin(request);
  if (auth) return auth;
  return resetPassword(request, env, (request as any).params.id);
});
router.delete("/api/users/:id", (request, env: Env) => {
  const auth = requireAdmin(request);
  if (auth) return auth;
  return deleteUser(request, env, (request as any).params.id);
});

router.get("/api/setup/status", (request, env: Env) => {
  const auth = requireAdmin(request);
  if (auth) return auth;
  return setupStatus(request, env);
});
router.post("/api/setup/config", (request, env: Env) => {
  const auth = requireAdmin(request);
  if (auth) return auth;
  return saveSetup(request, env);
});
router.post("/api/setup/test", (request, env: Env) => {
  const auth = requireAdmin(request);
  if (auth) return auth;
  return testSetup(request);
});

router.get("/api/r2/options", (request, env: Env) => {
  const auth = requireAuth(request);
  if (auth) return auth;
  return listR2Options(request, env);
});
router.get("/api/r2/configs", (request, env: Env) => {
  const auth = requireAdmin(request);
  if (auth) return auth;
  return listR2Configs(request, env);
});
router.post("/api/r2/configs", (request, env: Env) => {
  const auth = requireAdmin(request);
  if (auth) return auth;
  return createR2Config(request, env);
});
router.patch("/api/r2/configs/:id", (request, env: Env) => {
  const auth = requireAdmin(request);
  if (auth) return auth;
  return updateR2Config(request, env, (request as any).params.id);
});
router.delete("/api/r2/configs/:id", (request, env: Env) => {
  const auth = requireAdmin(request);
  if (auth) return auth;
  return deleteR2Config(request, env, (request as any).params.id);
});
router.post("/api/r2/configs/:id/test", (request, env: Env) => {
  const auth = requireAdmin(request);
  if (auth) return auth;
  return testR2Config(request, env, (request as any).params.id);
});
router.post("/api/r2/default", (request, env: Env) => {
  const auth = requireAdmin(request);
  if (auth) return auth;
  return setDefaultR2Config(request, env);
});
router.post("/api/r2/legacy-files", (request, env: Env) => {
  const auth = requireAdmin(request);
  if (auth) return auth;
  return setLegacyFilesR2Config(request, env);
});

router.post("/api/upload/presign", (request, env: Env) => {
  const auth = requireAuth(request);
  if (auth) return auth;
  return presignUpload(request, env);
});
router.post("/api/upload/confirm", (request, env: Env) => {
  const auth = requireAuth(request);
  if (auth) return auth;
  return confirmUpload(request, env);
});
router.post("/api/upload/multipart/init", (request, env: Env) => {
  const auth = requireAuth(request);
  if (auth) return auth;
  return initMultipart(request, env);
});
router.post("/api/upload/multipart/presign", (request, env: Env) => {
  const auth = requireAuth(request);
  if (auth) return auth;
  return presignMultipart(request, env);
});
router.post("/api/upload/multipart/complete", (request, env: Env) => {
  const auth = requireAuth(request);
  if (auth) return auth;
  return completeMultipart(request, env);
});

router.get("/api/files", (request, env: Env) => {
  const auth = requireAuth(request);
  if (auth) return auth;
  return listFiles(request, env);
});
router.delete("/api/files/:id", (request, env: Env) => {
  const auth = requireAuth(request);
  if (auth) return auth;
  return deleteFile(request, env, (request as any).params.id);
});
router.get("/api/files/:id/download", (request, env: Env) =>
  downloadFile(request, env, (request as any).params.id)
);

router.get("/api/stats", (request, env: Env) => {
  const auth = requireAuth(request);
  if (auth) return auth;
  return getStats(request, env);
});

router.get("/api/audit", (request, env: Env) => {
  const auth = requireAdmin(request);
  if (auth) return auth;
  return listAudit(request, env);
});

router.get("/s/:code", (request, env: Env) =>
  shortlink(request, env, (request as any).params.code)
);

router.all("*", () => new Response("Not Found", { status: 404 }));

async function handleRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  requestIdMiddleware(request);
  const rateLimited = await rateLimitMiddleware(request, env);
  if (rateLimited) return rateLimited;
  const bootstrap = await bootstrapAdmin(request, env);
  if (bootstrap) return bootstrap;
  await authSessionMiddleware(request, env);
  return router.handle(request, env, ctx);
}

async function handleScheduled(env: Env): Promise<void> {
  await cleanupExpired(env);
  await cleanupDeleteQueue(env);
}

export default {
  fetch: handleRequest,
  scheduled: async (
    _event: ScheduledEvent,
    env: Env,
    _ctx: ExecutionContext
  ) => {
    await handleScheduled(env);
  },
};
