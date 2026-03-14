require('dotenv').config();
const pool = require('./pool');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function seed() {
  try {
    // Create projects
    const project1Id = uuidv4();
    const project2Id = uuidv4();
    const project3Id = uuidv4();

    await pool.query(`
      INSERT INTO projects (id, name, description) VALUES
        ($1, 'HVAC Installation - Johnson Residence', 'Full HVAC system install'),
        ($2, 'Plumbing Repair - Main Street Office', 'Emergency pipe repair'),
        ($3, 'Electrical Upgrade - Sunrise Mall', 'Panel upgrade and rewiring')
      ON CONFLICT DO NOTHING
    `, [project1Id, project2Id, project3Id]);

    // Create employees
    const adminPass = await bcrypt.hash('admin123', 10);
    const managerPass = await bcrypt.hash('manager123', 10);
    const empPass = await bcrypt.hash('employee123', 10);

    const adminId = uuidv4();
    const managerId = uuidv4();
    const emp1Id = uuidv4();
    const emp2Id = uuidv4();

    await pool.query(`
      INSERT INTO employees (id, email, name, password_hash, role, hourly_rate, overtime_rate) VALUES
        ($1, 'admin@servicecore.com', 'Sarah Admin', $5, 'admin', 45.00, 67.50),
        ($2, 'manager@servicecore.com', 'Mike Manager', $6, 'manager', 35.00, 52.50),
        ($3, 'john@servicecore.com', 'John Worker', $7, 'employee', 25.00, 37.50),
        ($4, 'jane@servicecore.com', 'Jane Technician', $8, 'employee', 28.00, 42.00)
      ON CONFLICT (email) DO NOTHING
    `, [adminId, managerId, emp1Id, emp2Id, adminPass, managerPass, empPass, empPass]);

    // Create some time entries for the employees
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - now.getDay() + 1); // This week's Monday

    for (let day = 0; day < 5; day++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + day);

      const clockIn = new Date(date);
      clockIn.setHours(8, 0, 0, 0);
      const clockOut = new Date(date);
      clockOut.setHours(16, 30, 0, 0);

      // John's entries
      await pool.query(`
        INSERT INTO time_entries (employee_id, project_id, clock_in, clock_out, break_minutes, notes, status, gps_lat, gps_lng)
        VALUES ($1, $2, $3, $4, 30, $5, 'draft', 40.7128, -74.0060)
      `, [emp1Id, project1Id, clockIn.toISOString(), clockOut.toISOString(), `Regular shift day ${day + 1}`]);

      // Jane's entries
      if (day < 4) {
        const janeIn = new Date(date);
        janeIn.setHours(7, 0, 0, 0);
        const janeOut = new Date(date);
        janeOut.setHours(15, 30, 0, 0);

        await pool.query(`
          INSERT INTO time_entries (employee_id, project_id, clock_in, clock_out, break_minutes, notes, status, gps_lat, gps_lng)
          VALUES ($1, $2, $3, $4, 30, $5, 'draft', 40.7580, -73.9855)
        `, [emp2Id, project2Id, janeIn.toISOString(), janeOut.toISOString(), `Service call day ${day + 1}`]);
      }
    }

    console.log('Seed completed successfully');
    console.log('Test accounts:');
    console.log('  admin@servicecore.com / admin123 (admin)');
    console.log('  manager@servicecore.com / manager123 (manager)');
    console.log('  john@servicecore.com / employee123 (employee)');
    console.log('  jane@servicecore.com / employee123 (employee)');
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  seed();
}

module.exports = { seed };
