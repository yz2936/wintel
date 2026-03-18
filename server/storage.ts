import fs from 'node:fs';
import path from 'node:path';

export type StoredUser = {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  created_at: string;
  last_login_at: string;
};

export type StoredPublicUser = {
  id: number;
  name: string;
  email: string;
  last_login_at: string;
};

type UserState = {
  selectedCompanyId: string | null;
  selectedOpCos: string[];
  selectedFunctions: string[];
  selectedYear: number | null;
  userProfile: string;
  customQuestions: string[];
  messages: any[];
};

export interface StorageAdapter {
  getUserByEmail(email: string): Promise<StoredUser | undefined>;
  getUserById(id: number): Promise<StoredUser | undefined>;
  createUser(input: Omit<StoredUser, 'id'>): Promise<number>;
  updateUserLogin(id: number, lastLoginAt: string): Promise<void>;
  createSession(token: string, userId: number, createdAt: string): Promise<void>;
  deleteSession(token: string): Promise<void>;
  deleteSessionsForUser(userId: number): Promise<void>;
  getUserBySessionToken(token: string): Promise<StoredPublicUser | undefined>;
  getUserState(userId: number): Promise<UserState | undefined>;
  upsertUserState(userId: number, state: UserState, updatedAt: string): Promise<void>;
}

let adapterPromise: Promise<StorageAdapter> | null = null;

export async function getStorage(): Promise<StorageAdapter> {
  if (!adapterPromise) {
    adapterPromise = createStorageAdapter();
  }

  return adapterPromise;
}

async function createStorageAdapter(): Promise<StorageAdapter> {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return new VercelKvStorage(process.env.KV_REST_API_URL, process.env.KV_REST_API_TOKEN);
  }

  return createSqliteStorage();
}

async function createSqliteStorage(): Promise<StorageAdapter> {
  const [{ default: Database }] = await Promise.all([import('better-sqlite3')]);
  const dataDir = path.resolve(process.cwd(), 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new Database(path.join(dataDir, 'wintel.db'));

  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_login_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_state (
      user_id INTEGER PRIMARY KEY,
      state_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
  `);

  return {
    async getUserByEmail(email) {
      return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as StoredUser | undefined;
    },
    async getUserById(id) {
      return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as StoredUser | undefined;
    },
    async createUser(input) {
      const result = db.prepare(`
        INSERT INTO users (name, email, password_hash, created_at, last_login_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(input.name, input.email, input.password_hash, input.created_at, input.last_login_at);
      return Number(result.lastInsertRowid);
    },
    async updateUserLogin(id, lastLoginAt) {
      db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(lastLoginAt, id);
    },
    async createSession(token, userId, createdAt) {
      db.prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)').run(token, userId, createdAt);
    },
    async deleteSession(token) {
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    },
    async deleteSessionsForUser(userId) {
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
    },
    async getUserBySessionToken(token) {
      return db.prepare(`
        SELECT users.id, users.name, users.email, users.last_login_at
        FROM sessions
        JOIN users ON users.id = sessions.user_id
        WHERE sessions.token = ?
      `).get(token) as StoredPublicUser | undefined;
    },
    async getUserState(userId) {
      const row = db.prepare('SELECT state_json FROM user_state WHERE user_id = ?').get(userId) as { state_json: string } | undefined;
      return row ? JSON.parse(row.state_json) as UserState : undefined;
    },
    async upsertUserState(userId, state, updatedAt) {
      db.prepare(`
        INSERT INTO user_state (user_id, state_json, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          state_json = excluded.state_json,
          updated_at = excluded.updated_at
      `).run(userId, JSON.stringify(state), updatedAt);
    }
  };
}

class VercelKvStorage implements StorageAdapter {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string
  ) {}

  async getUserByEmail(email: string) {
    return this.getJson<StoredUser>(key('users:by-email', email));
  }

  async getUserById(id: number) {
    return this.getJson<StoredUser>(key('users:by-id', String(id)));
  }

  async createUser(input: Omit<StoredUser, 'id'>) {
    const id = await this.incr(key('meta:next-user-id'));
    const user: StoredUser = { id, ...input };
    await Promise.all([
      this.setJson(key('users:by-id', String(id)), user),
      this.setJson(key('users:by-email', user.email), user)
    ]);
    return id;
  }

  async updateUserLogin(id: number, lastLoginAt: string) {
    const user = await this.getUserById(id);
    if (!user) {
      return;
    }

    const updated = { ...user, last_login_at: lastLoginAt };
    await Promise.all([
      this.setJson(key('users:by-id', String(id)), updated),
      this.setJson(key('users:by-email', updated.email), updated)
    ]);
  }

  async createSession(token: string, userId: number, createdAt: string) {
    await this.setJson(key('sessions', token), { userId, createdAt });
    const tokens = await this.getJson<string[]>(key('user-sessions', String(userId))) ?? [];
    if (!tokens.includes(token)) {
      tokens.push(token);
      await this.setJson(key('user-sessions', String(userId)), tokens);
    }
  }

  async deleteSession(token: string) {
    const session = await this.getJson<{ userId: number }>(key('sessions', token));
    await this.del(key('sessions', token));
    if (!session) {
      return;
    }

    const tokens = await this.getJson<string[]>(key('user-sessions', String(session.userId))) ?? [];
    const nextTokens = tokens.filter((value) => value !== token);
    await this.setJson(key('user-sessions', String(session.userId)), nextTokens);
  }

  async deleteSessionsForUser(userId: number) {
    const sessionKey = key('user-sessions', String(userId));
    const tokens = await this.getJson<string[]>(sessionKey) ?? [];
    await Promise.all(tokens.map((token) => this.del(key('sessions', token))));
    await this.del(sessionKey);
  }

  async getUserBySessionToken(token: string) {
    const session = await this.getJson<{ userId: number }>(key('sessions', token));
    if (!session) {
      return undefined;
    }

    const user = await this.getUserById(session.userId);
    return user ? mapPublicUser(user) : undefined;
  }

  async getUserState(userId: number) {
    return this.getJson<UserState>(key('user-state', String(userId)));
  }

  async upsertUserState(userId: number, state: UserState) {
    await this.setJson(key('user-state', String(userId)), state);
  }

  private async getJson<T>(redisKey: string): Promise<T | undefined> {
    const value = await this.exec<string | null>(['GET', redisKey]);
    if (!value) {
      return undefined;
    }

    return JSON.parse(value) as T;
  }

  private async setJson(redisKey: string, value: unknown) {
    await this.exec(['SET', redisKey, JSON.stringify(value)]);
  }

  private async del(redisKey: string) {
    await this.exec(['DEL', redisKey]);
  }

  private async incr(redisKey: string) {
    const value = await this.exec<number>(['INCR', redisKey]);
    return Number(value);
  }

  private async exec<T>(command: unknown[]): Promise<T> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(command)
    });

    if (!response.ok) {
      throw new Error(`Vercel KV request failed (${response.status}): ${await response.text()}`);
    }

    const payload = await response.json() as { result: T; error?: string };
    if (payload.error) {
      throw new Error(payload.error);
    }

    return payload.result;
  }
}

function key(...parts: string[]) {
  return ['wintel', ...parts].join(':');
}

function mapPublicUser(user: StoredUser): StoredPublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    last_login_at: user.last_login_at
  };
}
