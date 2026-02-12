'use client';

import { trpc } from '@/lib/trpc/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function AnalyticsDashboard() {
  const exerciseQuery = trpc.analytics.getExerciseCompletionRates.useQuery();
  const sessionQuery = trpc.analytics.getSessionUtilization.useQuery();
  const mentorQuery = trpc.analytics.getMentorWorkload.useQuery();
  const menteeQuery = trpc.analytics.getMenteeProgress.useQuery();

  const isLoading =
    exerciseQuery.isLoading ||
    sessionQuery.isLoading ||
    mentorQuery.isLoading ||
    menteeQuery.isLoading;

  const hasError =
    exerciseQuery.error || sessionQuery.error || mentorQuery.error || menteeQuery.error;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-rdy-gray-400">Loading analytics...</div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-500">
        Error loading analytics:{' '}
        {exerciseQuery.error?.message ||
          sessionQuery.error?.message ||
          mentorQuery.error?.message ||
          menteeQuery.error?.message}
      </div>
    );
  }

  const exerciseData = exerciseQuery.data!;
  const sessionData = sessionQuery.data!;
  const mentorData = mentorQuery.data!;
  const menteeData = menteeQuery.data!;

  return (
    <div className="space-y-8">
      {/* Exercise Completion Rates Section */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-rdy-black">Exercise Completion Rates</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard
            title="Total Exercises"
            value={exerciseData.totalExercises}
            description="Content library size"
          />
          <MetricCard
            title="Assigned to Curriculum"
            value={exerciseData.assignedExercisesCount}
            description={`${exerciseData.curriculumCoverage}% coverage`}
          />
          <MetricCard
            title="Enrolled Mentees"
            value={exerciseData.enrolledMenteesCount}
            description="In active classes"
          />
          <MetricCard
            title="Exercise Types"
            value={exerciseData.exercisesByType.length}
            description={exerciseData.exercisesByType
              .map((t) => `${t.type}: ${t.count}`)
              .join(', ')}
          />
        </div>

        {exerciseData.exercisesPerSchwerpunktebene.length > 0 && (
          <div className="mt-4 rounded-lg border border-rdy-gray-200 bg-rdy-gray-100">
            <Table>
              <TableHeader>
                <TableRow className="border-rdy-gray-200 hover:bg-transparent">
                  <TableHead className="text-rdy-gray-400">Schwerpunktebene</TableHead>
                  <TableHead className="text-rdy-gray-400">Month</TableHead>
                  <TableHead className="text-right text-rdy-gray-400">Total Exercises</TableHead>
                  <TableHead className="text-right text-rdy-gray-400">Obligatory</TableHead>
                  <TableHead className="text-right text-rdy-gray-400">Optional</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exerciseData.exercisesPerSchwerpunktebene.map((s) => (
                  <TableRow key={s.id} className="border-rdy-gray-200">
                    <TableCell className="font-medium text-rdy-black">{s.title}</TableCell>
                    <TableCell className="text-rdy-gray-400">Month {s.monthNumber}</TableCell>
                    <TableCell className="text-right text-rdy-gray-600">{s.exerciseCount}</TableCell>
                    <TableCell className="text-right text-green-400">{s.obligatoryCount}</TableCell>
                    <TableCell className="text-right text-rdy-gray-400">{s.optionalCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* Session Utilization Section */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-rdy-black">Session Utilization</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard
            title="Total Classes"
            value={sessionData.summary.totalClasses}
            description={`${sessionData.summary.activeClasses} active`}
          />
          <MetricCard
            title="Active Classes"
            value={sessionData.summary.activeClasses}
            description="Currently running"
          />
          <MetricCard
            title="Completed Classes"
            value={sessionData.summary.completedClasses}
            description="Finished programs"
          />
          <MetricCard
            title="Avg Session Hours/Month"
            value={sessionData.summary.avgSessionHoursPerMonth}
            description="Per class average"
          />
        </div>

        {sessionData.classes.length > 0 && (
          <div className="mt-4 rounded-lg border border-rdy-gray-200 bg-rdy-gray-100">
            <Table>
              <TableHeader>
                <TableRow className="border-rdy-gray-200 hover:bg-transparent">
                  <TableHead className="text-rdy-gray-400">Class Name</TableHead>
                  <TableHead className="text-rdy-gray-400">Status</TableHead>
                  <TableHead className="text-right text-rdy-gray-400">Members</TableHead>
                  <TableHead className="text-right text-rdy-gray-400">Completed</TableHead>
                  <TableHead className="text-right text-rdy-gray-400">Sessions/Month</TableHead>
                  <TableHead className="text-right text-rdy-gray-400">Duration (min)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessionData.classes.slice(0, 10).map((cls) => (
                  <TableRow key={cls.id} className="border-rdy-gray-200">
                    <TableCell className="font-medium text-rdy-black">{cls.name}</TableCell>
                    <TableCell>
                      <StatusBadge
                        isActive={cls.isActive}
                        isCompleted={cls.isCompleted}
                        isUpcoming={cls.isUpcoming}
                      />
                    </TableCell>
                    <TableCell className="text-right text-rdy-gray-600">{cls.totalMembers}</TableCell>
                    <TableCell className="text-right text-rdy-gray-600">{cls.completedMembers}</TableCell>
                    <TableCell className="text-right text-rdy-gray-600">
                      {cls.monthlySessionCount}
                    </TableCell>
                    <TableCell className="text-right text-rdy-gray-600">
                      {cls.sessionDurationMinutes}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* Mentor Workload Section */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-rdy-black">Mentor Workload Overview</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard
            title="Total Mentors"
            value={mentorData.totalMentors}
            description="Active in tenant"
          />
          <MetricCard
            title="Avg Mentees/Mentor"
            value={mentorData.avgMenteesPerMentor}
            description="Assignment ratio"
          />
          <MetricCard
            title="Avg Classes/Mentor"
            value={mentorData.avgClassesPerMentor}
            description="Teaching load"
          />
          <MetricCard
            title="Workload Distribution"
            value={mentorData.workloadDistribution.optimal}
            description={`${mentorData.workloadDistribution.underloaded} under, ${mentorData.workloadDistribution.overloaded} over`}
          />
        </div>

        {mentorData.mentors.length > 0 && (
          <div className="mt-4 rounded-lg border border-rdy-gray-200 bg-rdy-gray-100">
            <Table>
              <TableHeader>
                <TableRow className="border-rdy-gray-200 hover:bg-transparent">
                  <TableHead className="text-rdy-gray-400">Mentor</TableHead>
                  <TableHead className="text-rdy-gray-400">Email</TableHead>
                  <TableHead className="text-right text-rdy-gray-400">Mentees</TableHead>
                  <TableHead className="text-right text-rdy-gray-400">Classes</TableHead>
                  <TableHead className="text-right text-rdy-gray-400">Active Classes</TableHead>
                  <TableHead className="text-rdy-gray-400">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mentorData.mentors.map((mentor) => (
                  <TableRow key={mentor.id} className="border-rdy-gray-200">
                    <TableCell className="font-medium text-rdy-black">
                      {mentor.name || 'Unnamed'}
                    </TableCell>
                    <TableCell className="text-rdy-gray-400">{mentor.email}</TableCell>
                    <TableCell className="text-right text-rdy-gray-600">{mentor.menteeCount}</TableCell>
                    <TableCell className="text-right text-rdy-gray-600">{mentor.totalClasses}</TableCell>
                    <TableCell className="text-right text-rdy-gray-600">
                      {mentor.activeClasses}
                    </TableCell>
                    <TableCell>
                      <WorkloadBadge status={mentor.workloadStatus} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* Mentee Progress Section */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-rdy-black">Mentee Progress Aggregates</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard
            title="Total Mentees"
            value={menteeData.summary.totalMentees}
            description={`${menteeData.summary.assignedMentees} assigned`}
          />
          <MetricCard
            title="Enrolled in Classes"
            value={menteeData.summary.enrolledMentees}
            description={`${menteeData.summary.notEnrolledMentees} not enrolled`}
          />
          <MetricCard
            title="Completion Rate"
            value={`${menteeData.summary.completionRate}%`}
            description={`${menteeData.summary.completedEnrollments} of ${menteeData.summary.totalEnrollments}`}
          />
          <MetricCard
            title="Payment Rate"
            value={`${menteeData.summary.paymentRate}%`}
            description={`${menteeData.summary.paidEnrollments} paid`}
          />
        </div>

        {menteeData.recentEnrollments.length > 0 && (
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-medium text-rdy-gray-400">Recent Enrollments</h3>
            <div className="rounded-lg border border-rdy-gray-200 bg-rdy-gray-100">
              <Table>
                <TableHeader>
                  <TableRow className="border-rdy-gray-200 hover:bg-transparent">
                    <TableHead className="text-rdy-gray-400">Mentee</TableHead>
                    <TableHead className="text-rdy-gray-400">Class</TableHead>
                    <TableHead className="text-rdy-gray-400">Enrolled</TableHead>
                    <TableHead className="text-rdy-gray-400">Status</TableHead>
                    <TableHead className="text-rdy-gray-400">Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {menteeData.recentEnrollments.map((enrollment, idx) => (
                    <TableRow key={`${enrollment.userId}-${idx}`} className="border-rdy-gray-200">
                      <TableCell className="font-medium text-rdy-black">
                        {enrollment.userName || enrollment.userEmail}
                      </TableCell>
                      <TableCell className="text-rdy-gray-400">{enrollment.className}</TableCell>
                      <TableCell className="text-rdy-gray-400">
                        {formatDate(enrollment.enrolledAt)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            enrollment.status === 'completed'
                              ? 'bg-rdy-orange-500/10 text-green-400'
                              : 'bg-rdy-orange-500/10 text-rdy-orange-500'
                          }`}
                        >
                          {enrollment.status === 'completed' ? 'Completed' : 'In Progress'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            enrollment.paid
                              ? 'bg-rdy-orange-500/10 text-green-400'
                              : 'bg-yellow-900/30 text-yellow-400'
                          }`}
                        >
                          {enrollment.paid ? 'Paid' : 'Pending'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function MetricCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string | number;
  description: string;
}) {
  return (
    <Card className="border-rdy-gray-200 bg-rdy-gray-100">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-rdy-gray-400">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-rdy-black">{value}</div>
        <p className="text-xs text-rdy-gray-500">{description}</p>
      </CardContent>
    </Card>
  );
}

function StatusBadge({
  isActive,
  isCompleted,
  isUpcoming,
}: {
  isActive: boolean;
  isCompleted: boolean;
  isUpcoming: boolean;
}) {
  if (isActive) {
    return (
      <span className="inline-flex items-center rounded-full bg-rdy-orange-500/10 px-2 py-1 text-xs font-medium text-green-400">
        Active
      </span>
    );
  }
  if (isCompleted) {
    return (
      <span className="inline-flex items-center rounded-full bg-rdy-gray-200/30 px-2 py-1 text-xs font-medium text-rdy-gray-400">
        Completed
      </span>
    );
  }
  if (isUpcoming) {
    return (
      <span className="inline-flex items-center rounded-full bg-rdy-orange-500/10 px-2 py-1 text-xs font-medium text-rdy-orange-500">
        Upcoming
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-rdy-gray-200/30 px-2 py-1 text-xs font-medium text-rdy-gray-400">
      Inactive
    </span>
  );
}

function WorkloadBadge({ status }: { status: 'underloaded' | 'optimal' | 'overloaded' }) {
  const styles = {
    underloaded: 'bg-yellow-900/30 text-yellow-400',
    optimal: 'bg-rdy-orange-500/10 text-green-400',
    overloaded: 'bg-red-900/30 text-red-400',
  };

  const labels = {
    underloaded: 'Under',
    optimal: 'Optimal',
    overloaded: 'Over',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
