import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { requiredEnv } from "../lib/server/security";

test("secret setup replaces long placeholders and preserves existing encryption keys", async () => {
  const directory = await fs.mkdtemp(join(tmpdir(), "bonded-security-"));
  const filename = join(directory, ".env.local");
  const existingKey = "a".repeat(64);
  try {
    await fs.writeFile(filename, `CAPSULE_ENCRYPTION_KEY=${existingKey}\nCRON_SECRET=change-me-to-a-random-secret-string\nIP_HASH_SALT=replace-with-a-strong-random-secret\n`);
    const env: NodeJS.ProcessEnv = { ...process.env };
    for (const name of ["CAPSULE_ENCRYPTION_KEY", "CRON_SECRET", "IP_HASH_SALT", "__NEXT_PROCESSED_ENV"]) delete env[name];
    const run = () => spawnSync(process.execPath, [resolve("scripts/setup-security.mjs")], { cwd: directory, env, encoding: "utf8" });
    assert.equal(run().status, 0);
    const content = await fs.readFile(filename, "utf8");
    assert.match(content, new RegExp(`CAPSULE_ENCRYPTION_KEY=${existingKey}`));
    assert.match(content, /^CRON_SECRET=[a-f0-9]{64}$/m);
    assert.match(content, /^IP_HASH_SALT=[a-f0-9]{64}$/m);
    assert.equal(run().status, 0);
    assert.equal(await fs.readFile(filename, "utf8"), content);
    await fs.writeFile(filename, content.replace(existingKey, "invalid-existing-key"));
    assert.notEqual(run().status, 0);
    assert.match(await fs.readFile(filename, "utf8"), /CAPSULE_ENCRYPTION_KEY=invalid-existing-key/);
  } finally {
    await fs.unlink(filename);
    await fs.rmdir(directory);
  }
});

test("server rejects placeholder and short cron secrets", () => {
  const previous = process.env.CRON_SECRET;
  try {
    for (const value of ["change-me-to-a-random-secret-string", "changeme", "short"]) {
      process.env.CRON_SECRET = value;
      assert.throws(() => requiredEnv("CRON_SECRET"));
    }
    process.env.CRON_SECRET = "b".repeat(64);
    assert.equal(requiredEnv("CRON_SECRET"), process.env.CRON_SECRET);
  } finally {
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  }
});
