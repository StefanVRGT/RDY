import { SchwerpunktebenenManagement } from './schwerpunktebenen-management';

export default function AdminSchwerpunktebenenPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Focus Areas (Schwerpunktebenen)</h1>
        <p className="mt-1 text-gray-400">
          Manage monthly themes for the 3-month program cycle
        </p>
      </div>
      <SchwerpunktebenenManagement />
    </div>
  );
}
