// Persistencia mock: un archivo JSON. Se reemplaza por una base real más adelante.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { EventEmitter } from "node:events";

const DATA_DIR = process.env.DATA_DIR || path.resolve("data");
const FILE = path.join(DATA_DIR, "db.json");

export const bus = new EventEmitter();
bus.setMaxListeners(200);

const empty = () => ({ messages: {}, tasks: [], schedules: [], deliverables: [], emails: [], activity: [], misiones: [] });

export let db = empty();
let saveTimer = null;

/** Carga la base. Devuelve true si no existía y hay que sembrar datos. */
export function load() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE)) return true;
  db = { ...empty(), ...JSON.parse(fs.readFileSync(FILE, "utf8")) };
  return false;
}

export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const tmp = FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, FILE);
  }, 150);
}

export const newId = (prefix) => `${prefix}_${crypto.randomBytes(5).toString("hex")}`;
export const now = () => new Date().toISOString();

export function changed(entity) {
  save();
  bus.emit("change", { entity });
}

export function logActivity(agentId, text, ts = now()) {
  db.activity.unshift({ id: newId("act"), ts, agentId, text });
  if (db.activity.length > 300) db.activity.length = 300;
  changed("activity");
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
