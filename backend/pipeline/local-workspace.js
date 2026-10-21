import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, realpath } from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { AssetStore, DEFAULT_DATA_DIR } from "./media.js";
import { writePrivateJson } from "./private-files.js";
import { fail } from "./contracts.js";
export const LOCAL_DB_NAME = "wedding_pipeline_local_dev";
export const DEFAULT_LOCAL_ROOT = path.join(DEFAULT_DATA_DIR, "local-dev");

export function localOrigin(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    fail("LOCAL_SESSION_TARGET", "A loopback HTTP origin is required");
  }
  if (
    url.protocol !== "http:" ||
    !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    fail(
      "LOCAL_SESSION_TARGET",
      "Development sessions may only target an exact loopback HTTP origin",
    );
  return url.origin;
}
export async function prepareLocalWorkspace(root = DEFAULT_LOCAL_ROOT) {
  root = path.resolve(root);
  new AssetStore(path.join(root, "assets")); // Refuse known publicly served roots before writing secrets.
  await mkdir(root, { recursive: true, mode: 0o700 });
  const actual = await realpath(root);
  if (actual.toLowerCase() !== root.toLowerCase())
    fail(
      "LOCAL_WORKSPACE_PATH",
      "Local workspace must not resolve through a directory alias",
      503,
    );
  const file = path.join(root, "workspace.json");
  const plannedAccount = (role, label) => ({
    userId: randomBytes(12).toString("hex"),
    role,
    email: `pipeline-${label}@local.test`,
    password: randomBytes(24).toString("base64url"),
  });
  const initial = {
    formatVersion: 1,
    workspaceId: randomUUID(),
    databaseName: LOCAL_DB_NAME,
    jwtSecret: randomBytes(48).toString("hex"),
    accounts: {
      owner: plannedAccount("planner", "owner"),
      vendor: plannedAccount("vendor", "vendor"),
    },
  };
  try {
    await writeFile(file, JSON.stringify(initial, null, 2) + "\n", {
      flag: "wx",
      mode: 0o600,
    });
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
  let config;
  try {
    config = JSON.parse(await readFile(file, "utf8"));
  } catch {
    fail(
      "LOCAL_WORKSPACE_INVALID",
      "Private local workspace configuration is invalid",
      503,
    );
  }
  if (
    config.formatVersion !== 1 ||
    config.databaseName !== LOCAL_DB_NAME ||
    !/^[a-f0-9]{96}$/.test(config.jwtSecret) ||
    !/^[a-f0-9-]{36}$/.test(config.workspaceId)
  )
    fail(
      "LOCAL_WORKSPACE_INVALID",
      "Private local workspace configuration is invalid",
      503,
    );
  for (const [label, role] of [
    ["owner", "planner"],
    ["vendor", "vendor"],
  ]) {
    const a = config.accounts?.[label];
    if (
      !a ||
      !/^[a-f0-9]{24}$/.test(a.userId) ||
      a.role !== role ||
      a.email !== `pipeline-${label}@local.test` ||
      typeof a.password !== "string" ||
      a.password.length < 32
    )
      fail(
        "LOCAL_WORKSPACE_INVALID",
        "Private fixture account configuration is invalid",
        503,
      );
  }
  const databasePath = path.join(root, "database"),
    assetsPath = path.join(root, "assets");
  await Promise.all([
    mkdir(databasePath, { recursive: true }),
    mkdir(assetsPath, { recursive: true }),
  ]);
  return {
    root,
    config,
    databasePath,
    assetsPath,
    sessionFile: path.join(root, "session.json"),
  };
}
export async function provisionLocalAccounts(workspace, { baseUrl }) {
  if (
    mongoose.connection.name !== LOCAL_DB_NAME ||
    !["127.0.0.1", "localhost", "::1"].includes(mongoose.connection.host)
  )
    fail(
      "LOCAL_PROVISIONING_REFUSED",
      "Fixture accounts may only be provisioned in the owned loopback development database",
      503,
    );
  const origin = localOrigin(baseUrl),
    sessions = {};
  await User.init();
  for (const [label, a] of Object.entries(workspace.config.accounts)) {
    let user = await User.findById(a.userId).select("+password");
    if (user) {
      if (
        user.email !== a.email ||
        user.role !== a.role ||
        user.isAdmin ||
        user.isBlocked ||
        !(await user.comparePassword(a.password))
      )
        fail(
          "LOCAL_ACCOUNT_CONFLICT",
          "An existing development fixture was changed; it will not be reset automatically",
          409,
        );
    } else {
      if (await User.exists({ email: a.email }))
        fail(
          "LOCAL_ACCOUNT_CONFLICT",
          "A fixture email belongs to another account; refusing to replace it",
          409,
        );
      user = await User.create({
        _id: a.userId,
        email: a.email,
        password: a.password,
        fullName: `Pipeline Local ${label}`,
        role: a.role,
        isAdmin: false,
        credits: 0,
      });
    }
    sessions[label] = {
      userId: String(user._id),
      email: user.email,
      role: user.role,
      token: jwt.sign(
        { id: String(user._id), email: user.email, role: user.role },
        workspace.config.jwtSecret,
        { algorithm: "HS256", expiresIn: "8h" },
      ),
    };
  }
  const session = {
    formatVersion: 1,
    workspaceId: workspace.config.workspaceId,
    baseUrl: origin,
    createdAt: new Date().toISOString(),
    ...sessions,
  };
  await writePrivateJson(workspace.sessionFile, session);
  return { provisioned: true, count: Object.keys(sessions).length };
}
