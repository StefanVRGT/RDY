import { LevelsManagement } from './levels-management';

export default function AdminLevelsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-rdy-black">Module</h1>
        <p className="mt-1 text-rdy-gray-400">
          Module für das RDY Programm verwalten
        </p>
      </div>
      <LevelsManagement />
    </div>
  );
}
