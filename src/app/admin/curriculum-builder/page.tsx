import { CurriculumBuilder } from './curriculum-builder';

export default function CurriculumBuilderPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Curriculum Builder</h1>
        <p className="mt-1 text-gray-400">
          Structure your 3-month program: Schwerpunktebenen &gt; Weeks &gt; Exercises
        </p>
      </div>

      <CurriculumBuilder />
    </div>
  );
}
