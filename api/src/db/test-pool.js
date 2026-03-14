// In-memory mock pool for testing without PostgreSQL
class MockPool {
  constructor() {
    this.tables = {
      employees: [],
      projects: [],
      time_entries: [],
      anomaly_flags: [],
      payroll_reports: []
    };
    this._idCounter = 0;
  }

  generateId() {
    return `test-uuid-${++this._idCounter}`;
  }

  async query(text, params) {
    // Simple mock - return empty results by default
    return { rows: [], rowCount: 0 };
  }

  async end() {
    // noop
  }
}

module.exports = new MockPool();
