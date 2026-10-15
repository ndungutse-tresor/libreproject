import { getPool } from '@/lib/db'
import { getSessionUserId } from '@/lib/session'

type UserRow = { name: string; email: string; role: string; created_at: Date }

export default async function AdminUsersPage() {
  const userId = await getSessionUserId()
  if (!userId) return <Message text="Log in with an administrator account to view users." />

  try {
    const pool = getPool()
    const { rows: accessRows } = await pool.query(
      'SELECT role, perms FROM profiles WHERE id = $1',
      [userId]
    )
    const profile = accessRows[0]
    if (!profile || !(profile.role === 'super' || (profile.role === 'admin' && profile.perms.includes('users')))) {
      return <Message text="You do not have permission to view users." />
    }

    const { rows } = await pool.query(
      'SELECT name, email, role, created_at FROM profiles ORDER BY created_at DESC'
    )
    return (
      <main style={{ maxWidth: 1000, margin: '0 auto', padding: 32 }}>
        <h1>Users</h1>
        <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr>{['Name', 'Email', 'Role', 'Joined'].map((label) => <th key={label} style={{ padding: 12 }}>{label}</th>)}</tr>
            </thead>
            <tbody>
              {(rows as UserRow[]).map((user) => (
                <tr key={user.email}>
                  <td style={cellStyle}>{user.name}</td>
                  <td style={cellStyle}>{user.email}</td>
                  <td style={cellStyle}>{user.role}</td>
                  <td style={cellStyle}>{new Date(user.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td style={cellStyle} colSpan={4}>No users yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </main>
    )
  } catch (error) {
    console.error('Unable to load admin user list:', error)
    return <Message text="Unable to load users. Check the Neon database connection." />
  }
}

function Message({ text }: { text: string }) {
  return <main style={{ maxWidth: 900, margin: '0 auto', padding: 32 }}><h1>Users</h1><p>{text}</p></main>
}

const cellStyle = { padding: 12, borderTop: '1px solid #e2e8f0' }
