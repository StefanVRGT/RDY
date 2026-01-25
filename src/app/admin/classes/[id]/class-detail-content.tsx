'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ClassMembersTab } from './class-members-tab';
import { ClassCurriculumTab } from './class-curriculum-tab';

interface ClassDetailContentProps {
  classId: string;
}

export function ClassDetailContent({ classId }: ClassDetailContentProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: classData, isLoading, error } = trpc.classes.getById.useQuery({ id: classId });

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-900/30 text-green-400';
      case 'disabled':
        return 'bg-gray-900/30 text-gray-400';
      default:
        return 'bg-gray-900/30 text-gray-400';
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-400">Loading class details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-900/20 p-4 text-red-400">
        Error loading class: {error.message}
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="rounded-lg bg-yellow-900/20 p-4 text-yellow-400">Class not found</div>
    );
  }

  const sessionConfig = classData.sessionConfig as {
    monthlySessionCount?: number;
    sessionDurationMinutes?: number;
  } | null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/admin/classes')}
              className="text-gray-400 hover:text-white"
            >
              &larr; Back to Classes
            </Button>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-white">{classData.name}</h1>
          <p className="text-gray-400">
            Managed by {classData.mentor?.name || classData.mentor?.email || 'Unknown'}
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${getStatusBadgeClass(classData.status)}`}
        >
          {classData.status === 'active' ? 'Active' : 'Disabled'}
        </span>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="border-gray-800 bg-gray-900">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-gray-800 data-[state=active]:text-white"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="members"
            className="data-[state=active]:bg-gray-800 data-[state=active]:text-white"
          >
            Members ({classData.memberCount})
          </TabsTrigger>
          <TabsTrigger
            value="curriculum"
            className="data-[state=active]:bg-gray-800 data-[state=active]:text-white"
          >
            Curriculum
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Class Details */}
            <Card className="border-gray-800 bg-gray-900">
              <CardHeader>
                <CardTitle className="text-white">Class Details</CardTitle>
                <CardDescription className="text-gray-400">
                  Basic information about this class
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between border-b border-gray-800 pb-2">
                  <span className="text-gray-400">Duration</span>
                  <span className="text-white">{classData.durationMonths} months</span>
                </div>
                <div className="flex justify-between border-b border-gray-800 pb-2">
                  <span className="text-gray-400">Start Date</span>
                  <span className="text-white">{formatDate(classData.startDate)}</span>
                </div>
                <div className="flex justify-between border-b border-gray-800 pb-2">
                  <span className="text-gray-400">End Date</span>
                  <span className="text-white">{formatDate(classData.endDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Members</span>
                  <span className="text-white">{classData.memberCount}</span>
                </div>
              </CardContent>
            </Card>

            {/* Session Configuration */}
            <Card className="border-gray-800 bg-gray-900">
              <CardHeader>
                <CardTitle className="text-white">Session Configuration</CardTitle>
                <CardDescription className="text-gray-400">
                  Mentoring session settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between border-b border-gray-800 pb-2">
                  <span className="text-gray-400">Sessions per month</span>
                  <span className="text-white">{sessionConfig?.monthlySessionCount ?? 2}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Session duration</span>
                  <span className="text-white">
                    {sessionConfig?.sessionDurationMinutes ?? 60} minutes
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Mentor Info */}
            <Card className="border-gray-800 bg-gray-900 md:col-span-2">
              <CardHeader>
                <CardTitle className="text-white">Mentor</CardTitle>
                <CardDescription className="text-gray-400">
                  Assigned mentor for this class
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-900/30 text-blue-400">
                    {(classData.mentor?.name || classData.mentor?.email || 'M').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-white">
                      {classData.mentor?.name || 'No name set'}
                    </p>
                    <p className="text-gray-400">{classData.mentor?.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="members" className="mt-6">
          <ClassMembersTab classId={classId} />
        </TabsContent>

        <TabsContent value="curriculum" className="mt-6">
          <ClassCurriculumTab classId={classId} durationMonths={classData.durationMonths} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
