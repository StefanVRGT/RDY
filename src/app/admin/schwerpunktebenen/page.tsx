import { SchwerpunktebenenManagement } from './schwerpunktebenen-management';

export default function AdminSchwerpunktebenenPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-rdy-black">Module</h1>
        <p className="mt-1 text-rdy-gray-400">
          Module für den Programmzyklus verwalten
        </p>
      </div>
      <SchwerpunktebenenManagement />
    </div>
  );
}
