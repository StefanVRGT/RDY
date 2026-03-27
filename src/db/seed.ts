import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local BEFORE importing db
const envPath = resolve(process.cwd(), '.env.local');
config({ path: envPath });

// Verify DATABASE_URL is loaded
if (!process.env.DATABASE_URL) {
  console.error('Failed to load DATABASE_URL from .env.local');
  console.error('Looking for .env.local at:', envPath);
  process.exit(1);
}

import { db } from '@/lib/db';
import { or, eq } from 'drizzle-orm';
import {
  tenants,
  users,
  schwerpunktebenen,
  weeks,
  exercises,
  weekExercises,
  classes,
  classMembers,
  classCurriculum,
  scheduledExercises,
  mentoringSessions,
  groupSessions,
  mentorAvailability,
  diaryEntries,
  type NewTenant,
  type NewUser,
  type NewSchwerpunktebene,
  type NewWeek,
  type NewExercise,
  type NewWeekExercise,
  type NewClass,
  type NewClassMember,
  type NewClassCurriculum,
  type NewScheduledExercise,
  type NewMentoringSession,
  type NewGroupSession,
  type NewMentorAvailability,
  type NewDiaryEntry,
} from '../lib/db/schema';

async function seed() {
  console.log('🌱 Starting database seed...');

  // Create Tenants
  console.log('Creating tenants...');
  const [testTenant, realTenant] = await db
    .insert(tenants)
    .values([
      {
        name: 'Test Organization',
        slug: 'test',
        primaryColor: '#7c3aed',
        secondaryColor: '#a78bfa',
        status: 'active',
      } as NewTenant,
      {
        name: 'Real Organization',
        slug: 'real',
        primaryColor: '#7c3aed',
        secondaryColor: '#a78bfa',
        status: 'active',
      } as NewTenant,
    ])
    .returning();

  console.log(`✓ Created tenants: ${testTenant.name}, ${realTenant.name}`);

  // Focus on Test Tenant for detailed seeding
  const tenantId = testTenant.id;

  // Create Users
  console.log('Creating users...');
  const [_adminUser, mentorUser, mentee1, mentee2, mentee3] = await db
    .insert(users)
    .values([
      {
        tenantId,
        role: 'admin',
        email: 'admin@test.com',
        name: 'Admin User',
        address: 'Admin Street 1',
        plz: '1010',
        city: 'Vienna',
      } as NewUser,
      {
        tenantId,
        role: 'mentor',
        email: 'mentor@test.com',
        name: 'Maria Schneider',
        address: 'Mentor Avenue 10',
        plz: '1020',
        city: 'Vienna',
      } as NewUser,
      {
        tenantId,
        role: 'mentee',
        email: 'mentee1@test.com',
        name: 'Franz Josef',
        address: 'Student Road 5',
        plz: '1030',
        city: 'Vienna',
      } as NewUser,
      {
        tenantId,
        role: 'mentee',
        email: 'mentee2@test.com',
        name: 'Anna Mueller',
        address: 'Learning Lane 12',
        plz: '1040',
        city: 'Vienna',
      } as NewUser,
      {
        tenantId,
        role: 'mentee',
        email: 'mentee3@test.com',
        name: 'Thomas Weber',
        address: 'Growth Street 8',
        plz: '1050',
        city: 'Vienna',
      } as NewUser,
    ])
    .returning();

  // Update mentees to have the mentor
  await db
    .update(users)
    .set({ mentorId: mentorUser.id })
    .where(
      or(
        eq(users.id, mentee1.id),
        eq(users.id, mentee2.id),
        eq(users.id, mentee3.id)
      )
    );

  console.log(`✓ Created ${5} users`);

  // Create Exercises
  console.log('Creating exercises...');
  const exerciseData: NewExercise[] = [
    {
      tenantId,
      type: 'video',
      titleDe: 'Self-Alignment Meditation',
      titleEn: 'Self-Alignment Meditation',
      descriptionDe:
        'Eine geführte Meditation zur Selbstausrichtung und inneren Balance.',
      descriptionEn:
        'A guided meditation for self-alignment and inner balance.',
      durationMinutes: 15,
      videoUrl: 'https://www.youtube.com/embed/inpok4MKVLM',
      orderIndex: '1',
    },
    {
      tenantId,
      type: 'video',
      titleDe: 'Sensing Exercise',
      titleEn: 'Sensing Exercise',
      descriptionDe: 'Übung zur Wahrnehmung des gegenwärtigen Moments.',
      descriptionEn: 'Exercise for sensing the present moment.',
      durationMinutes: 10,
      videoUrl: 'https://www.youtube.com/embed/z6X5oEIg6Ak',
      orderIndex: '2',
    },
    {
      tenantId,
      type: 'audio',
      titleDe: 'Diving Deep',
      titleEn: 'Diving Deep',
      descriptionDe: 'Tiefe Entspannungsübung für innere Ruhe.',
      descriptionEn: 'Deep relaxation exercise for inner calm.',
      durationMinutes: 20,
      audioUrl: 'https://www.youtube.com/embed/lFcSrYw-ARY',
      orderIndex: '3',
    },
    {
      tenantId,
      type: 'text',
      titleDe: 'Morning Reflection',
      titleEn: 'Morning Reflection',
      descriptionDe: 'Tägliche Morgenreflexion zur Intention-Setting.',
      descriptionEn: 'Daily morning reflection for intention-setting.',
      durationMinutes: 5,
      contentDe: `# Morgenreflexion

Nehmen Sie sich 5 Minuten Zeit, um über folgende Fragen nachzudenken:

1. Wofür bin ich heute dankbar?
2. Was ist meine Hauptintention für heute?
3. Wie möchte ich mich heute fühlen?

Schreiben Sie Ihre Gedanken in Ihr Tagebuch.`,
      contentEn: `# Morning Reflection

Take 5 minutes to reflect on these questions:

1. What am I grateful for today?
2. What is my main intention for today?
3. How do I want to feel today?

Write your thoughts in your diary.`,
      orderIndex: '4',
    },
    {
      tenantId,
      type: 'video',
      titleDe: 'Breathwork Session',
      titleEn: 'Breathwork Session',
      descriptionDe: 'Atemübungen für Energie und Klarheit.',
      descriptionEn: 'Breathing exercises for energy and clarity.',
      durationMinutes: 12,
      videoUrl: 'https://www.youtube.com/embed/tybOi4hjZFQ',
      orderIndex: '5',
    },
    {
      tenantId,
      type: 'video',
      titleDe: 'Evening Wind-Down',
      titleEn: 'Evening Wind-Down',
      descriptionDe: 'Abendübung zum Loslassen und Entspannen.',
      descriptionEn: 'Evening exercise for letting go and relaxing.',
      durationMinutes: 10,
      videoUrl: 'https://www.youtube.com/embed/aEqlQvczMJQ',
      orderIndex: '6',
    },
  ];

  const createdExercises = await db
    .insert(exercises)
    .values(exerciseData)
    .returning();

  console.log(`✓ Created ${createdExercises.length} exercises`);

  // Create Schwerpunktebenen (3-month cycle)
  console.log('Creating schwerpunktebenen...');
  const [month1, month2, month3] = await db
    .insert(schwerpunktebenen)
    .values([
      {
        tenantId,
        levelNumber: '1',
        titleDe: 'Selbst-Wahrnehmung',
        titleEn: 'Self-Awareness',
        descriptionDe:
          'Entwicklung eines tieferen Verständnisses für sich selbst.',
        descriptionEn: 'Developing a deeper understanding of yourself.',
        herkunftDe:
          'Die Fähigkeit zur Selbstwahrnehmung ist die Grundlage für persönliches Wachstum.',
        herkunftEn:
          'The ability for self-awareness is the foundation for personal growth.',
        zielDe: 'Ein klares Bewusstsein für eigene Gedanken und Gefühle.',
        zielEn: 'A clear awareness of your own thoughts and feelings.',
        imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773',
      } as NewSchwerpunktebene,
      {
        tenantId,
        levelNumber: '2',
        titleDe: 'Emotionale Intelligenz',
        titleEn: 'Emotional Intelligence',
        descriptionDe: 'Verstehen und regulieren eigener Emotionen.',
        descriptionEn: 'Understanding and regulating your own emotions.',
        herkunftDe:
          'Emotionale Intelligenz ermöglicht bessere Beziehungen zu sich selbst und anderen.',
        herkunftEn:
          'Emotional intelligence enables better relationships with yourself and others.',
        zielDe: 'Gesunder Umgang mit Emotionen im Alltag.',
        zielEn: 'Healthy handling of emotions in daily life.',
        imageUrl: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88',
      } as NewSchwerpunktebene,
      {
        tenantId,
        levelNumber: '3',
        titleDe: 'Authentizität & Integration',
        titleEn: 'Authenticity & Integration',
        descriptionDe: 'Leben in Einklang mit den eigenen Werten.',
        descriptionEn: 'Living in alignment with your own values.',
        herkunftDe:
          'Authentizität führt zu einem erfüllten und sinnvollen Leben.',
        herkunftEn: 'Authenticity leads to a fulfilled and meaningful life.',
        zielDe: 'Authentisches Leben in allen Lebensbereichen.',
        zielEn: 'Authentic living in all areas of life.',
        imageUrl: 'https://images.unsplash.com/photo-1511988617509-a57c8a288659',
      } as NewSchwerpunktebene,
    ])
    .returning();

  console.log(`✓ Created ${3} schwerpunktebenen`);

  // Create Weeks for each Schwerpunktebene
  console.log('Creating weeks...');
  const weekData: NewWeek[] = [
    // Month 1 - Week 1
    {
      schwerpunktebeneId: month1.id,
      weekNumber: '1',
      orderIndex: '1',
      titleDe: 'Grundlagen der Achtsamkeit',
      titleEn: 'Foundations of Mindfulness',
      descriptionDe: 'Einführung in achtsame Selbstwahrnehmung.',
      descriptionEn: 'Introduction to mindful self-awareness.',
      herkunftDe: 'Achtsamkeit als Basis für Selbstkenntnis.',
      herkunftEn: 'Mindfulness as the basis for self-knowledge.',
      zielDe: 'Tägliche Achtsamkeitspraxis etablieren.',
      zielEn: 'Establish daily mindfulness practice.',
      measurementType: 'scale_1_10',
      measurementQuestionDe: 'Wie achtsam fühlten Sie sich diese Woche?',
      measurementQuestionEn: 'How mindful did you feel this week?',
    },
    // Month 1 - Week 2
    {
      schwerpunktebeneId: month1.id,
      weekNumber: '2',
      orderIndex: '2',
      titleDe: 'Körperwahrnehmung',
      titleEn: 'Body Awareness',
      descriptionDe: 'Verbindung mit körperlichen Empfindungen.',
      descriptionEn: 'Connecting with bodily sensations.',
      herkunftDe: 'Der Körper als Zugang zur inneren Weisheit.',
      herkunftEn: 'The body as access to inner wisdom.',
      zielDe: 'Bewusstsein für körperliche Signale entwickeln.',
      zielEn: 'Develop awareness of bodily signals.',
      measurementType: 'scale_1_10',
      measurementQuestionDe:
        'Wie verbunden fühlten Sie sich mit Ihrem Körper?',
      measurementQuestionEn: 'How connected did you feel with your body?',
    },
    // Month 1 - Week 3
    {
      schwerpunktebeneId: month1.id,
      weekNumber: '3',
      orderIndex: '3',
      titleDe: 'Gedankenmuster erkennen',
      titleEn: 'Recognizing Thought Patterns',
      descriptionDe: 'Beobachten wiederkehrender Gedanken.',
      descriptionEn: 'Observing recurring thoughts.',
      herkunftDe: 'Gedankenmuster prägen unsere Wahrnehmung.',
      herkunftEn: 'Thought patterns shape our perception.',
      zielDe: 'Automatische Gedanken bewusst wahrnehmen.',
      zielEn: 'Consciously perceive automatic thoughts.',
      measurementType: 'scale_1_10',
      measurementQuestionDe: 'Wie gut konnten Sie Ihre Gedanken beobachten?',
      measurementQuestionEn: 'How well could you observe your thoughts?',
    },
    // Month 2 - Week 1
    {
      schwerpunktebeneId: month2.id,
      weekNumber: '1',
      orderIndex: '1',
      titleDe: 'Emotionen verstehen',
      titleEn: 'Understanding Emotions',
      descriptionDe: 'Die Sprache der Emotionen lernen.',
      descriptionEn: 'Learning the language of emotions.',
      herkunftDe: 'Emotionen sind Botschafter innerer Bedürfnisse.',
      herkunftEn: 'Emotions are messengers of inner needs.',
      zielDe: 'Emotionen klar benennen können.',
      zielEn: 'Being able to clearly name emotions.',
      measurementType: 'scale_1_10',
      measurementQuestionDe: 'Wie gut verstanden Sie Ihre Emotionen?',
      measurementQuestionEn: 'How well did you understand your emotions?',
    },
    // Month 2 - Week 2
    {
      schwerpunktebeneId: month2.id,
      weekNumber: '2',
      orderIndex: '2',
      titleDe: 'Emotionsregulation',
      titleEn: 'Emotion Regulation',
      descriptionDe: 'Werkzeuge zum Umgang mit intensiven Gefühlen.',
      descriptionEn: 'Tools for dealing with intense feelings.',
      herkunftDe: 'Emotionen müssen nicht kontrolliert, sondern verstanden werden.',
      herkunftEn: 'Emotions need not be controlled, but understood.',
      zielDe: 'Gesunde Strategien zur Emotionsregulation.',
      zielEn: 'Healthy strategies for emotion regulation.',
      measurementType: 'scale_1_10',
      measurementQuestionDe: 'Wie gut konnten Sie mit Emotionen umgehen?',
      measurementQuestionEn: 'How well could you handle emotions?',
    },
  ];

  const createdWeeks = await db.insert(weeks).values(weekData).returning();

  console.log(`✓ Created ${createdWeeks.length} weeks`);

  // Create WeekExercises (link exercises to weeks)
  console.log('Creating week-exercise relationships...');
  const weekExerciseData: NewWeekExercise[] = [];

  // Week 1: Self-Alignment + Sensing + Morning Reflection
  weekExerciseData.push(
    {
      weekId: createdWeeks[0].id,
      exerciseId: createdExercises[0].id, // Self-Alignment
      orderIndex: 1,
      isObligatory: true,
      frequency: 'daily',
    },
    {
      weekId: createdWeeks[0].id,
      exerciseId: createdExercises[1].id, // Sensing
      orderIndex: 2,
      isObligatory: true,
      frequency: 'daily',
    },
    {
      weekId: createdWeeks[0].id,
      exerciseId: createdExercises[3].id, // Morning Reflection
      orderIndex: 3,
      isObligatory: true,
      frequency: 'daily',
    },
    {
      weekId: createdWeeks[0].id,
      exerciseId: createdExercises[5].id, // Evening Wind-Down
      orderIndex: 4,
      isObligatory: false,
      frequency: 'daily',
    }
  );

  // Week 2: Breathwork + Diving + Morning Reflection
  weekExerciseData.push(
    {
      weekId: createdWeeks[1].id,
      exerciseId: createdExercises[4].id, // Breathwork
      orderIndex: 1,
      isObligatory: true,
      frequency: 'daily',
    },
    {
      weekId: createdWeeks[1].id,
      exerciseId: createdExercises[2].id, // Diving
      orderIndex: 2,
      isObligatory: true,
      frequency: 'daily',
    },
    {
      weekId: createdWeeks[1].id,
      exerciseId: createdExercises[3].id, // Morning Reflection
      orderIndex: 3,
      isObligatory: true,
      frequency: 'daily',
    }
  );

  const createdWeekExercises = await db
    .insert(weekExercises)
    .values(weekExerciseData)
    .returning();

  console.log(`✓ Created ${createdWeekExercises.length} week-exercise links`);

  // Create Class
  console.log('Creating class...');
  const startDate = new Date('2026-01-01');
  const endDate = new Date('2026-03-31');

  const [testClass] = await db
    .insert(classes)
    .values([
      {
        tenantId,
        mentorId: mentorUser.id,
        name: 'Spring 2026 Cohort',
        status: 'active',
        durationLevels: 5,
        startDate,
        endDate,
        sessionConfig: {
          monthlySessionCount: 2,
          sessionDurationMinutes: 60,
        },
      } as NewClass,
    ])
    .returning();

  console.log(`✓ Created class: ${testClass.name}`);

  // Enroll Mentees in Class
  console.log('Enrolling mentees in class...');
  await db.insert(classMembers).values([
    {
      classId: testClass.id,
      userId: mentee1.id,
      paid: true,
      amount: '1200.00',
      dueDate: new Date('2026-01-15'),
    } as NewClassMember,
    {
      classId: testClass.id,
      userId: mentee2.id,
      paid: true,
      amount: '1200.00',
      dueDate: new Date('2026-01-15'),
    } as NewClassMember,
    {
      classId: testClass.id,
      userId: mentee3.id,
      paid: false,
      amount: '1200.00',
      dueDate: new Date('2026-02-01'),
    } as NewClassMember,
  ]);

  console.log(`✓ Enrolled 3 mentees in class`);

  // Assign Curriculum to Class
  console.log('Assigning curriculum to class...');
  await db.insert(classCurriculum).values([
    {
      classId: testClass.id,
      schwerpunktebeneId: month1.id,
      levelNumber: 1,
    } as NewClassCurriculum,
    {
      classId: testClass.id,
      schwerpunktebeneId: month2.id,
      levelNumber: 2,
    } as NewClassCurriculum,
    {
      classId: testClass.id,
      schwerpunktebeneId: month3.id,
      levelNumber: 3,
    } as NewClassCurriculum,
  ]);

  console.log(`✓ Assigned curriculum to class`);

  // Create Scheduled Exercises for Mentee1 (today and this week)
  console.log('Creating scheduled exercises...');
  const today = new Date();
  const scheduledExerciseData: NewScheduledExercise[] = [];

  // Today's exercises
  scheduledExerciseData.push(
    {
      userId: mentee1.id,
      exerciseId: createdExercises[0].id, // Self-Alignment
      classId: testClass.id,
      scheduledAt: new Date(today.setHours(6, 0, 0, 0)),
      completed: false,
    },
    {
      userId: mentee1.id,
      exerciseId: createdExercises[1].id, // Sensing
      classId: testClass.id,
      scheduledAt: new Date(today.setHours(9, 0, 0, 0)),
      completed: false,
    },
    {
      userId: mentee1.id,
      exerciseId: createdExercises[3].id, // Morning Reflection
      classId: testClass.id,
      scheduledAt: new Date(today.setHours(7, 30, 0, 0)),
      completed: true,
      completedAt: new Date(),
    },
    {
      userId: mentee1.id,
      exerciseId: createdExercises[5].id, // Evening Wind-Down
      classId: testClass.id,
      scheduledAt: new Date(today.setHours(20, 0, 0, 0)),
      completed: false,
    }
  );

  // Tomorrow's exercises
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  scheduledExerciseData.push(
    {
      userId: mentee1.id,
      exerciseId: createdExercises[0].id,
      classId: testClass.id,
      scheduledAt: new Date(tomorrow.setHours(6, 0, 0, 0)),
      completed: false,
    },
    {
      userId: mentee1.id,
      exerciseId: createdExercises[1].id,
      classId: testClass.id,
      scheduledAt: new Date(tomorrow.setHours(9, 0, 0, 0)),
      completed: false,
    }
  );

  await db.insert(scheduledExercises).values(scheduledExerciseData);

  console.log(`✓ Created ${scheduledExerciseData.length} scheduled exercises`);

  // Create Mentoring Sessions
  console.log('Creating mentoring sessions...');
  const sessionDate = new Date();
  sessionDate.setDate(sessionDate.getDate() + 7); // Next week

  // Create 1:1 mentoring session
  const mentoringSessionData: NewMentoringSession = {
    tenantId,
    mentorId: mentorUser.id,
    menteeId: mentee1.id,
    sessionType: '1:1',
    status: 'scheduled',
    scheduledAt: new Date(sessionDate.setHours(14, 0, 0, 0)),
    durationMinutes: 60,
    notes: 'Monthly check-in session to discuss progress and challenges.',
  };

  await db.insert(mentoringSessions).values(mentoringSessionData);
  console.log('✓ Created 1:1 mentoring session');

  // Create group session
  const groupSessionData: NewGroupSession = {
    tenantId,
    mentorId: mentorUser.id,
    classId: testClass.id,
    title: 'Group Session: Self-Awareness Workshop',
    description: 'Interactive workshop on developing self-awareness.',
    scheduledAt: new Date(sessionDate.setHours(18, 0, 0, 0)),
    durationMinutes: 90,
    maxParticipants: 10,
    location: 'https://zoom.us/j/example456',
    status: 'scheduled',
  };

  await db.insert(groupSessions).values(groupSessionData);
  console.log('✓ Created group session');

  // Create Availability Slots for Mentor
  console.log('Creating mentor availability slots...');
  const availabilityData: NewMentorAvailability[] = [];
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);

  // Create slots for next week (Mon-Fri, 2-4pm)
  for (let i = 0; i < 5; i++) {
    const slotDate = new Date(nextWeek);
    slotDate.setDate(nextWeek.getDate() + i);
    const dayOfWeek = slotDate.getDay();

    // Skip weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    availabilityData.push({
      tenantId,
      mentorId: mentorUser.id,
      startTime: new Date(slotDate.setHours(14, 0, 0, 0)),
      endTime: new Date(slotDate.setHours(15, 0, 0, 0)),
      durationMinutes: 60,
      status: 'available',
      isRecurring: false,
    } as NewMentorAvailability);

    availabilityData.push({
      tenantId,
      mentorId: mentorUser.id,
      startTime: new Date(slotDate.setHours(15, 0, 0, 0)),
      endTime: new Date(slotDate.setHours(16, 0, 0, 0)),
      durationMinutes: 60,
      status: 'available',
      isRecurring: false,
    } as NewMentorAvailability);
  }

  await db.insert(mentorAvailability).values(availabilityData);

  console.log(`✓ Created ${availabilityData.length} availability slots`);

  // Create Diary Entries
  console.log('Creating diary entries...');
  const diaryData: NewDiaryEntry[] = [
    {
      userId: mentee1.id,
      content:
        'Today I felt more present during my meditation. I noticed my thoughts wandering less, and I was able to return to my breath more easily. This practice is really starting to help me feel more grounded.',
      entryType: 'text',
      entryDate: new Date(),
    },
    {
      userId: mentee1.id,
      content:
        'I struggled today with staying focused. Work was stressful, and I found it hard to make time for my exercises. But I did complete the morning reflection, which helped me set a positive intention.',
      entryType: 'text',
      entryDate: new Date(Date.now() - 86400000), // Yesterday
    },
  ];

  await db.insert(diaryEntries).values(diaryData);

  console.log(`✓ Created ${diaryData.length} diary entries`);

  console.log('\n✅ Database seeding completed successfully!');
  console.log('\nTest Credentials:');
  console.log('Admin: admin@test.com');
  console.log('Mentor: mentor@test.com');
  console.log('Mentee: mentee1@test.com (Franz Josef)');
  console.log('Mentee: mentee2@test.com (Anna Mueller)');
  console.log('Mentee: mentee3@test.com (Thomas Weber)');
  console.log('\nNote: You need to create these users in Keycloak separately.');
}

seed()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
