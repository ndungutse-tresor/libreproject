export default function AdminAccessDenied() {
  return (
    <section className="admin-error-panel">
      <p className="admin-eyebrow">ACCESS RESTRICTED</p>
      <h1>This section isn’t available to your account.</h1>
      <p>Ask the super administrator to grant access if you need to use this section.</p>
    </section>
  )
}
