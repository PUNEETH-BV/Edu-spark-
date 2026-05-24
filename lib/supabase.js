// Mock Supabase Client using localStorage – fully chainable (select, insert, update, delete)
import { detectPlatform, getYouTubeThumbnail } from './videoUtils';

/* ─── Thenable helper ─────────────────────────────────────────── */
function makeThenable(promiseFn) {
  const obj = {
    then(onFulfilled, onRejected) {
      return promiseFn().then(onFulfilled, onRejected);
    },
    catch(onRejected) {
      return promiseFn().catch(onRejected);
    },
  };
  return obj;
}

/* ─── Query Builder ───────────────────────────────────────────── */
class SupabaseQueryBuilder {
  constructor(table) {
    this.table      = table;
    this._filters   = [];
    this._orderField = null;
    this._orderAsc  = true;
    this._limitCount = null;
    this._isSingle  = false;
    this._doCount   = false;
    this._pendingInsert = null;
    this._pendingUpdate = null;
    this._pendingDelete = false;
  }

  // ── Chainable query helpers ──────────────────────────────────
  select(fields, options = {}) {
    if (options.count) this._doCount = true;
    return this;
  }

  eq(field, value) {
    this._filters.push(item => item[field] == value);
    return this;
  }

  order(field, options = {}) {
    this._orderField = field;
    this._orderAsc   = options.ascending !== false;
    return this;
  }

  limit(count) {
    this._limitCount = count;
    return this;
  }

  single() {
    this._isSingle = true;
    return this;
  }

  // ── Mutation helpers ─────────────────────────────────────────
  insert(records) {
    this._pendingInsert = records;
    return this; // return self so .select().single() chains work
  }

  update(fields) {
    this._pendingUpdate = fields;
    return this;
  }

  delete() {
    this._pendingDelete = true;
    return this;
  }

  // ── Execution (called when awaited) ─────────────────────────
  then(resolve, reject) {
    this._execute().then(resolve, reject);
  }

  catch(reject) {
    return this._execute().catch(reject);
  }

  async _execute() {
    if (typeof window === 'undefined') return { data: null, error: null };

    // INSERT
    if (this._pendingInsert !== null) {
      return this._doInsert(this._pendingInsert);
    }

    // UPDATE
    if (this._pendingUpdate !== null) {
      return this._doUpdate(this._pendingUpdate);
    }

    // DELETE
    if (this._pendingDelete) {
      return this._doDelete();
    }

    // SELECT
    return this._doSelect();
  }

  _readTable() {
    return JSON.parse(localStorage.getItem(`db_${this.table}`) || '[]');
  }

  _writeTable(items) {
    localStorage.setItem(`db_${this.table}`, JSON.stringify(items));
  }

  _applyFilters(items) {
    for (const f of this._filters) items = items.filter(f);
    return items;
  }

  _applyOrder(items) {
    if (!this._orderField) return items;
    return items.sort((a, b) => {
      const va = a[this._orderField], vb = b[this._orderField];
      if (typeof va === 'string') return this._orderAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      return this._orderAsc ? va - vb : vb - va;
    });
  }

  async _doSelect() {
    let items = this._readTable();
    items = this._applyFilters(items);
    items = this._applyOrder(items);
    if (this._limitCount !== null) items = items.slice(0, this._limitCount);

    if (this._isSingle) {
      const data = items[0] || null;
      return { data, error: null };
    }

    const response = { data: items, error: null };
    if (this._doCount) response.count = items.length;
    return response;
  }

  async _doInsert(records) {
    let items = this._readTable();
    const isArray = Array.isArray(records);
    const newRecords = (isArray ? records : [records]).map(r => ({
      id: Math.random().toString(36).substring(2, 9),
      created_at: new Date().toISOString(),
      ...r,
    }));
    items.push(...newRecords);
    this._writeTable(items);

    const data = this._isSingle ? newRecords[0] : (isArray ? newRecords : newRecords[0]);
    return { data, error: null };
  }

  async _doUpdate(fields) {
    let items = this._readTable();
    let updated = [];
    items = items.map(item => {
      if (this._applyFilters([item]).length > 0) {
        const u = { ...item, ...fields };
        updated.push(u);
        return u;
      }
      return item;
    });
    this._writeTable(items);

    const data = this._isSingle ? (updated[0] || null) : updated;
    return { data, error: null };
  }

  async _doDelete() {
    let items = this._readTable();
    items = items.filter(item => this._applyFilters([item]).length === 0);
    this._writeTable(items);
    return { data: null, error: null };
  }
}

/* ─── Supabase client ─────────────────────────────────────────── */
export const supabase = {
  auth: {
    async signUp({ email, password, options }) {
      if (typeof window === 'undefined') return { data: { user: null }, error: null };
      const username = options?.data?.username || email.split('@')[0];
      let users = JSON.parse(localStorage.getItem('db_users') || '[]');
      if (users.some(u => u.email === email)) {
        return { data: { user: null }, error: { message: 'User already exists' } };
      }
      const user = { id: Math.random().toString(36).substring(2, 9), email };
      users.push({ ...user, password, username });
      localStorage.setItem('db_users', JSON.stringify(users));

      let profiles = JSON.parse(localStorage.getItem('db_profiles') || '[]');
      profiles.push({ id: user.id, username, xp: 120, streak_days: 1, level: 1, hours_studied: 0, courses_completed: 0 });
      localStorage.setItem('db_profiles', JSON.stringify(profiles));
      localStorage.setItem('session_user', JSON.stringify(user));

      return { data: { user }, error: null };
    },

    async signInWithPassword({ email, password }) {
      if (typeof window === 'undefined') return { data: { user: null }, error: null };
      const users = JSON.parse(localStorage.getItem('db_users') || '[]');
      const user  = users.find(u => u.email === email && u.password === password);
      if (!user) return { data: { user: null }, error: { message: 'Invalid email or password' } };
      const safeUser = { id: user.id, email: user.email };
      localStorage.setItem('session_user', JSON.stringify(safeUser));
      return { data: { user: safeUser }, error: null };
    },

    async signOut() {
      if (typeof window === 'undefined') return { error: null };
      localStorage.removeItem('session_user');
      return { error: null };
    },

    async getUser() {
      if (typeof window === 'undefined') return { data: { user: null }, error: null };
      const user = JSON.parse(localStorage.getItem('session_user') || 'null');
      return { data: { user }, error: null };
    },
  },

  from(table) {
    return new SupabaseQueryBuilder(table);
  },
};

/* ─── Seed mock data ──────────────────────────────────────────── */
if (typeof window !== 'undefined') {
  const isSeeded = localStorage.getItem('db_seeded');
  if (!isSeeded) {
    const elenaUser = { id: 'elena_id', email: 'elena@eduspark.ai', password: 'password', username: 'Elena Rodriguez' };
    const elenaProfile = { id: 'elena_id', username: 'Elena Rodriguez', xp: 8420, streak_days: 24, level: 18, hours_studied: 124.5, courses_completed: 12 };

    localStorage.setItem('db_users',    JSON.stringify([elenaUser]));
    localStorage.setItem('db_profiles', JSON.stringify([
      elenaProfile,
      { id: 'u1', username: 'Alexander Hunt', xp: 24120, streak_days: 42, level: 24 },
      { id: 'u2', username: 'Sofia Patel',    xp: 22840, streak_days: 15, level: 22 },
      { id: 'u3', username: 'Marcus Vance',   xp: 21500, streak_days: 8,  level: 21 },
    ]));

    const webDevVid = {
      id: 'web_dev_id', user_id: 'elena_id',
      url: 'https://www.youtube.com/watch?v=Ke90Tje7VS0', platform: 'youtube',
      thumbnail: 'https://img.youtube.com/vi/Ke90Tje7VS0/hqdefault.jpg',
      title: 'Web Development from Scratch', subject: 'Web Development',
      expert_role: 'Senior Web Engineer', duration: 5400, progress: 65,
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    };
    const neuralVid = {
      id: 'neural_net_id', user_id: 'elena_id',
      url: 'https://www.youtube.com/watch?v=aircAruvnKk', platform: 'youtube',
      thumbnail: 'https://img.youtube.com/vi/aircAruvnKk/hqdefault.jpg',
      title: 'Neural Networks from Scratch', subject: 'Machine Learning',
      expert_role: 'AI Research Scientist', duration: 7200, progress: 28,
      created_at: new Date(Date.now() - 86400000).toISOString(),
    };
    localStorage.setItem('db_videos', JSON.stringify([webDevVid, neuralVid]));

    localStorage.setItem('db_segments', JSON.stringify([
      { id: 's1', video_id: 'web_dev_id', start_time: 0,    end_time: 900,  title: 'Introduction & Setup',           topics: ['Prerequisites', 'IDE Config', 'Node.js'] },
      { id: 's2', video_id: 'web_dev_id', start_time: 900,  end_time: 2700, title: 'Java Basics: Syntax & Types',    topics: ['Variable types', 'Classes', 'Methods'] },
      { id: 's3', video_id: 'web_dev_id', start_time: 2700, end_time: 4050, title: 'Object Oriented Programming',   topics: ['Inheritance', 'Polymorphism', 'Interfaces'] },
      { id: 's4', video_id: 'web_dev_id', start_time: 4050, end_time: 5400, title: 'Java Collection Framework',     topics: ['ArrayList', 'HashMap', 'Complexity'] },

      { id: 'n1', video_id: 'neural_net_id', start_time: 0,    end_time: 1200, title: 'Biological vs Artificial Neurons', topics: ['Axon & Dendrites', 'Weights & Biases', 'Activation Functions'] },
      { id: 'n2', video_id: 'neural_net_id', start_time: 1200, end_time: 3000, title: 'Forward Propagation',             topics: ['Matrix Multiplication', 'Dot Products', 'Loss Functions'] },
      { id: 'n3', video_id: 'neural_net_id', start_time: 3000, end_time: 5400, title: 'Backpropagation & Chain Rule',    topics: ['Partial Derivatives', 'Gradient Descent', 'Learning Rate'] },
      { id: 'n4', video_id: 'neural_net_id', start_time: 5400, end_time: 7200, title: 'Training Loops & Optimization',   topics: ['Epochs', 'Batches', 'Adam Optimizer'] },
    ]));

    localStorage.setItem('db_bookmarks', JSON.stringify([
      { id: 'b1', video_id: 'web_dev_id', user_id: 'elena_id', timestamp: 920,  note: 'Important Java compilation tips' },
      { id: 'b2', video_id: 'web_dev_id', user_id: 'elena_id', timestamp: 2850, note: 'Polymorphism definition summary' },
    ]));

    localStorage.setItem('db_badges', JSON.stringify([
      { id: 'bg1', user_id: 'elena_id', badge_key: 'first_watch', earned_at: new Date().toISOString() },
      { id: 'bg2', user_id: 'elena_id', badge_key: 'streak_7',    earned_at: new Date().toISOString() },
      { id: 'bg3', user_id: 'elena_id', badge_key: 'quiz_master', earned_at: new Date().toISOString() },
    ]));

    // Auto-login to Elena
    localStorage.setItem('session_user', JSON.stringify({ id: 'elena_id', email: 'elena@eduspark.ai' }));
    localStorage.setItem('db_seeded', 'true');
  }
}
