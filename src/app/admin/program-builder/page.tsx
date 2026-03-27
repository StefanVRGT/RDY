import { ProgramBuilder } from './program-builder';

export default function ProgramBuilderPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-rdy-black">RDY Program Builder</h1>
        <p className="mt-1 text-rdy-gray-400">
          Structure your RDY Programm: Module &gt; Weeks &gt; Exercises
        </p>
      </div>

      <ProgramBuilder />
    </div>
  );
}
