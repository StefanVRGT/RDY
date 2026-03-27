import { ExercisesManagement } from './exercises-management';

export default function AdminExercisesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-rdy-black">Exercises</h1>
        <p className="mt-1 text-rdy-gray-400">
          Manage the content library with video, audio, and text exercises
        </p>
      </div>
      <ExercisesManagement />
    </div>
  );
}
