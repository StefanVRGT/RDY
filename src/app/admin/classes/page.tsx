import { ClassesManagement } from './classes-management';

export default function ClassesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-rdy-black">Classes</h1>
        <p className="text-rdy-gray-400">Manage classes, members, and curriculum assignments</p>
      </div>
      <ClassesManagement />
    </div>
  );
}
