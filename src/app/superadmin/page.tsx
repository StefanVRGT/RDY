import Link from 'next/link';

export default function SuperadminPage() {
  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold text-rdy-black">Superadmin Dashboard</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/superadmin/tenants"
          className="rounded-lg bg-rdy-gray-100 p-6 transition-colors hover:bg-rdy-gray-200"
        >
          <h2 className="mb-2 text-lg font-semibold text-rdy-black">Tenant Management</h2>
          <p className="text-sm text-rdy-gray-400">
            Create, edit, and manage tenants. View usage statistics and enable/disable tenants.
          </p>
        </Link>
      </div>
    </div>
  );
}
