import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const compose = readFileSync("docker-compose.powersync.yml", "utf8");
const serviceConfig = readFileSync("docs/spikes/powersync-prototype/service.yaml", "utf8");
const syncConfig = readFileSync("docs/spikes/powersync-prototype/sync-config.yaml", "utf8");
const initSql = readFileSync("docs/spikes/powersync-prototype/postgres-init.sql", "utf8");

assert.match(compose, /journeyapps\/powersync-service:/);
assert.match(compose, /wal_level=logical/);
assert.match(compose, /mongo-rs-init/);
assert.match(serviceConfig, /jwks_uri: http:\/\/api:3000\/powersync\/jwks/);
assert.match(syncConfig, /body_weight_logs/);
assert.match(syncConfig, /partner_links/);
assert.match(syncConfig, /workout_logs/);
assert.match(initSql, /CREATE ROLE powersync_role/);
assert.match(initSql, /CREATE PUBLICATION powersync/);
