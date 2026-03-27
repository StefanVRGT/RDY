import Image from 'next/image';
import type { SidebarRole } from '@/components/app-sidebar';

function Screenshot({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="my-4 rounded-xl overflow-hidden border border-rdy-gray-200 shadow-sm">
      <Image src={src} alt={alt} width={1280} height={800} className="w-full h-auto" />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="text-xl font-semibold text-rdy-black mb-4 pb-2 border-b border-rdy-gray-200">
        {title}
      </h2>
      {children}
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-base font-semibold text-rdy-black mb-2">{title}</h3>
      {children}
    </div>
  );
}

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="list-decimal list-inside space-y-1.5 text-sm text-rdy-gray-500 ml-1">
      {items.map((item, i) => (
        <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
      ))}
    </ol>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="list-disc list-inside space-y-1.5 text-sm text-rdy-gray-500 ml-1">
      {items.map((item, i) => (
        <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
      ))}
    </ul>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-lg bg-orange-50 border border-orange-200 px-4 py-3 text-sm text-orange-800">
      <span className="font-semibold">Tip: </span>
      {children}
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-lg bg-rdy-gray-100 border border-rdy-gray-200 px-4 py-3 text-sm text-rdy-gray-500">
      <span className="font-semibold text-rdy-black">Note: </span>
      {children}
    </div>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="my-3 rounded-lg bg-rdy-gray-100 border border-rdy-gray-200 px-4 py-3 text-sm font-mono text-rdy-black overflow-x-auto whitespace-pre">
      {children}
    </pre>
  );
}

// ─── ADMIN HELP ───────────────────────────────────────────────────────────────

function AdminHelp() {
  return (
    <>
      <p className="text-sm text-rdy-gray-500 mb-8">
        As an admin you have full control over all content, users, and settings in your
        tenant. <strong>Admins are also mentors</strong> — you can lead classes and see mentee
        data in addition to managing the platform.
      </p>

      {/* ── Dashboard ── */}
      <Section title="Dashboard">
        <Screenshot src="/help/admin-dashboard.png" alt="Admin Dashboard" />
        <p className="text-sm text-rdy-gray-500 mb-3">
          The dashboard gives you an instant status overview of your platform.
        </p>
        <Bullets
          items={[
            '<strong>Active classes</strong> — total number of running classes',
            '<strong>Total mentees</strong> — all enrolled users across all classes',
            '<strong>Pending invitations</strong> — invitations sent but not yet accepted',
            '<strong>Recent activity</strong> — latest diary entries and exercise completions',
            'Use the quick-links at the top to jump directly to frequently visited areas',
          ]}
        />
      </Section>

      {/* ── Exercises ── */}
      <Section title="Exercises">
        <Screenshot src="/help/admin-exercises.png" alt="Exercise Management" />
        <p className="text-sm text-rdy-gray-500 mb-4">
          Exercises are the building blocks of every curriculum. Each exercise is bilingual
          (German + English) and can contain video, audio, or formatted text.
        </p>

        <SubSection title="Exercise types">
          <div className="overflow-x-auto">
            <table className="text-sm w-full border-collapse">
              <thead>
                <tr className="border-b border-rdy-gray-200">
                  <th className="text-left py-2 pr-6 font-semibold text-rdy-black">Type</th>
                  <th className="text-left py-2 font-semibold text-rdy-black">Description</th>
                </tr>
              </thead>
              <tbody className="text-rdy-gray-500">
                <tr className="border-b border-rdy-gray-100">
                  <td className="py-2 pr-6 font-medium">Video</td>
                  <td>
                    Links to a hosted video file. Supports separate DE and EN video URLs so
                    mentees see the correct language version.
                  </td>
                </tr>
                <tr className="border-b border-rdy-gray-100">
                  <td className="py-2 pr-6 font-medium">Audio</td>
                  <td>Links to an audio file (guided meditation, breathing exercises, etc.).</td>
                </tr>
                <tr>
                  <td className="py-2 pr-6 font-medium">Text</td>
                  <td>Markdown-formatted text content shown inline — ideal for reading exercises or instructions.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </SubSection>

        <SubSection title="Creating an exercise">
          <Steps
            items={[
              'Click <strong>+ Create Exercise</strong> in the top-right corner',
              'Choose the <strong>type</strong>: Video, Audio, or Text',
              'Enter <strong>Title (DE)</strong> — the primary German title',
              'Enter <strong>Description (DE)</strong> — a brief summary shown in the exercise list',
              'For <strong>Video</strong>: paste the German video URL; optionally add a separate English video URL',
              'For <strong>Audio</strong>: paste the audio file URL',
              'For <strong>Text</strong>: write or paste the German content in the Markdown editor',
              'Enter a <strong>duration</strong> in minutes (shown to mentees before they start)',
              'Click <strong>AI Translate</strong> — the AI fills in the English Title, Description, and Text fields automatically',
              'Review and adjust the English translation if needed',
              'Click <strong>Save</strong>',
            ]}
          />
          <Tip>
            If AI translation is not yet configured, go to <strong>AI Settings</strong> first and
            enter your API key.
          </Tip>
        </SubSection>

        <SubSection title="Editing or deleting an exercise">
          <Bullets
            items={[
              'Click the <strong>pencil icon</strong> on any exercise row to open the edit dialog',
              'Change any field and click <strong>Save</strong>',
              'To delete, click the <strong>trash icon</strong> — you will be asked to confirm',
              'Deleting an exercise also removes it from all weeks in the curriculum',
            ]}
          />
          <Note>
            Exercises that are currently scheduled for class members cannot be deleted — remove them
            from the curriculum first, then regenerate the schedule before deleting.
          </Note>
        </SubSection>

        <SubSection title="Searching and filtering">
          <Bullets
            items={[
              'Use the <strong>search bar</strong> to filter by title',
              'Use the <strong>type filter</strong> (Video / Audio / Text) to narrow down the list',
              'The exercise count is shown at the top of the list',
            ]}
          />
        </SubSection>
      </Section>

      {/* ── Curriculum Builder ── */}
      <Section title="Programm Builder">
        <p className="text-sm text-rdy-gray-500 mb-4">
          The RDY Programm is organised as a three-level hierarchy. Each level is described below.
        </p>
        <CodeBlock>{`Modul  (one per month)
  └── Week  (up to 4 weeks per Modul)
        └── Exercise  (drag-and-drop from the exercise library)`}</CodeBlock>

        <Screenshot src="/help/admin-curriculum-builder.png" alt="Programm Builder" />

        <SubSection title="Step 1 — Create a Modul">
          <p className="text-sm text-rdy-gray-500 mb-2">
            A <em>Modul</em> represents one month&apos;s theme. Each class month is
            assigned exactly one Modul.
          </p>
          <Steps
            items={[
              'Click <strong>+ Add Modul</strong> in the left panel',
              'Enter the <strong>German title</strong> (e.g. "Achtsamkeit" or "Körperbewusstsein")',
              'Click <strong>AI Generate</strong> — the AI creates the <em>Herkunft</em> (origin), <em>Ziel</em> (goal), and English title automatically',
              'Review the generated text and adjust if needed',
              'Click <strong>Save</strong>',
              'The Modul now appears in the left panel — click it to start building its weeks',
            ]}
          />
          <Tip>
            Write a precise German title before clicking AI Generate — the richer the title, the
            better the generated content.
          </Tip>
        </SubSection>

        <SubSection title="Step 2 — Create weeks">
          <Steps
            items={[
              'With a Modul selected in the left panel, click <strong>+ Add Week</strong>',
              'Enter the <strong>week title (DE)</strong> and optionally a short description',
              'Click <strong>AI Translate</strong> to generate the English version',
              'Click <strong>Save Week</strong>',
              'Repeat for up to 4 weeks',
              'Weeks can be reordered by dragging the grip handle on the left',
            ]}
          />
        </SubSection>

        <SubSection title="Step 3 — Add exercises to a week">
          <Bullets
            items={[
              'The <strong>Exercise Library</strong> panel on the right lists all your exercises',
              'Use the search bar in the library to find exercises quickly',
              'Drag an exercise from the library and drop it onto a week — it is added at the bottom',
              'Reorder exercises within a week by dragging their grip handle',
              'Click the <strong>Req / Opt toggle</strong> to mark an exercise as Obligatory or Optional',
              'Click the <strong>× button</strong> to remove an exercise from a week (it stays in the library)',
            ]}
          />
        </SubSection>

        <SubSection title="Step 4 — Set the day-of-week schedule">
          <p className="text-sm text-rdy-gray-500 mb-2">
            Each exercise row shows a compact 7-button day picker below the title. This controls
            which days of the week the exercise is scheduled for class members.
          </p>
          <CodeBlock>{`M  T  W  T  F  S  S\n●  ●  ●  ○  ●  ○  ○   ← Mon, Tue, Wed, Fri only`}</CodeBlock>
          <Bullets
            items={[
              '<strong>Filled (orange)</strong> — exercise is scheduled on that day',
              '<strong>Empty (gray)</strong> — exercise is skipped on that day',
              'All 7 filled = exercise runs every day (default)',
              'Click a day button to toggle it on or off',
              'Changes are saved automatically after a short delay',
            ]}
          />
          <Tip>
            Combine day pickers creatively: strength exercises on Mon/Wed/Fri, mobility on
            Tue/Thu, reflection exercises on Sunday.
          </Tip>
        </SubSection>

        <SubSection title="Translating week and Modul text">
          <p className="text-sm text-rdy-gray-500">
            Click the <strong>Translate</strong> button on any week or Modul card to
            open a dialog showing the German source and the AI-generated English translation
            side-by-side. Edit the English text directly in the dialog, then click{' '}
            <strong>Save Translation</strong>.
          </p>
        </SubSection>
      </Section>

      {/* ── Classes ── */}
      <Section title="Classes">
        <Screenshot src="/help/admin-classes.png" alt="Classes" />
        <p className="text-sm text-rdy-gray-500 mb-4">
          A class is a cohort of mentees who follow the same curriculum, led by one mentor over a
          fixed number of months. Everything — schedule generation, group sessions, 1:1 bookings —
          is tied to a class.
        </p>

        <SubSection title="Creating a class">
          <Steps
            items={[
              'Click <strong>+ Create Class</strong>',
              'Enter the <strong>class name</strong> (e.g. "Spring 2026 Cohort")',
              'Choose a <strong>mentor</strong> from the dropdown (you can assign yourself)',
              'Set the <strong>duration</strong> in months',
              'Set the <strong>start date</strong> — end date is calculated automatically',
              'Configure the <strong>session settings</strong>: session length and how many days in advance mentees can book',
              '<strong>Programm (optional):</strong> the form shows one dropdown per month — assign a Modul to each month directly. You can skip this and assign it later.',
              'Click <strong>Create Class</strong>',
            ]}
          />
        </SubSection>

        <SubSection title="Managing the Programm after creation">
          <Steps
            items={[
              'Open the class by clicking its row',
              'Go to the <strong>Program</strong> tab',
              'For each month, open the dropdown and select a Modul',
              'The assignment is saved immediately',
              'You can change or reassign any month at any time',
            ]}
          />
          <Note>
            Changing the Programm after the schedule has been generated requires clicking{' '}
            <strong>Generate Schedule</strong> again to apply the changes.
          </Note>
        </SubSection>

        <SubSection title="Generating the exercise schedule">
          <p className="text-sm text-rdy-gray-500 mb-2">
            Once the Programm is assigned and mentees are enrolled, generate the full exercise
            schedule with one click.
          </p>
          <Steps
            items={[
              'Open the class → <strong>Program tab</strong>',
              'Check that all months have a Modul assigned',
              'Click <strong>Generate Schedule for All Members</strong>',
              'The system calculates one exercise entry per member, per exercise, per scheduled day, for the entire class duration',
              'A confirmation appears: <em>"240 exercises scheduled for 8 members"</em>',
            ]}
          />
          <Bullets
            items={[
              'Re-running the button wipes the previous schedule and creates a clean one — safe to run after Programm changes',
              'Exercises appear on the mentee calendar immediately after generation',
              'The schedule respects the day-of-week picker set in the curriculum builder',
            ]}
          />
          <Note>
            The system uses <strong>28-day months</strong> (not calendar months) starting from the
            class start date, so weeks are always predictable regardless of month length.
          </Note>
        </SubSection>

        <SubSection title="Adding mentees to a class">
          <Steps
            items={[
              'Open the class → <strong>Members tab</strong>',
              'Click <strong>Add Mentee</strong>',
              'Search by name or email',
              'Click the mentee to add them',
              'After adding new members, click <strong>Generate Schedule</strong> again so new mentees receive their exercise plan',
            ]}
          />
        </SubSection>

        <SubSection title="Class detail tabs">
          <div className="overflow-x-auto">
            <table className="text-sm w-full border-collapse">
              <thead>
                <tr className="border-b border-rdy-gray-200">
                  <th className="text-left py-2 pr-6 font-semibold text-rdy-black">Tab</th>
                  <th className="text-left py-2 font-semibold text-rdy-black">Contents</th>
                </tr>
              </thead>
              <tbody className="text-rdy-gray-500">
                <tr className="border-b border-rdy-gray-100">
                  <td className="py-2 pr-6 font-medium">Overview</td>
                  <td>Class info, mentor, dates, session config</td>
                </tr>
                <tr className="border-b border-rdy-gray-100">
                  <td className="py-2 pr-6 font-medium">Members</td>
                  <td>Enrolled mentees, completion stats, add/remove</td>
                </tr>
                <tr className="border-b border-rdy-gray-100">
                  <td className="py-2 pr-6 font-medium">Program</td>
                  <td>Month-by-month Modul assignments + Generate Schedule button</td>
                </tr>
                <tr>
                  <td className="py-2 pr-6 font-medium">Sessions</td>
                  <td>All group sessions linked to this class</td>
                </tr>
              </tbody>
            </table>
          </div>
        </SubSection>
      </Section>

      {/* ── Users ── */}
      <Section title="Users">
        <Screenshot src="/help/admin-users.png" alt="User Management" />
        <p className="text-sm text-rdy-gray-500 mb-3">
          The Users page lists all accounts in your tenant — admins, mentors, and mentees.
        </p>
        <Bullets
          items={[
            'See each user&apos;s <strong>role</strong>, <strong>email</strong>, and <strong>activation status</strong>',
            'See which class a mentee belongs to',
            'Click a user row to open their detail view',
            '<strong>Deactivate</strong> an account to prevent login without deleting the user (all data is preserved)',
            '<strong>Reactivate</strong> the account at any time',
            'User accounts are created via the Invitations flow — not directly from this page',
          ]}
        />
        <Note>
          User identities (email, password) are managed in Keycloak. The RDY Users page shows
          the application-level profile. To reset a password, ask the user to use the{' '}
          <em>Forgot Password</em> flow on the login page, or contact your system administrator.
        </Note>
      </Section>

      {/* ── Invitations ── */}
      <Section title="Invitations">
        <Screenshot src="/help/admin-invitations.png" alt="Invitations" />
        <p className="text-sm text-rdy-gray-500 mb-3">
          Invite new users to your tenant by email. Invitations create a one-time sign-up link
          that the recipient uses to set their password and join the platform.
        </p>
        <SubSection title="Sending an invitation">
          <Steps
            items={[
              'Click <strong>+ Invite User</strong>',
              'Enter the recipient&apos;s <strong>email address</strong>',
              'Choose their <strong>role</strong>: Admin, Mentor, or Mentee',
              'Optionally select which <strong>class</strong> to enroll them in (mentees only)',
              'Click <strong>Send Invitation</strong> — an email is dispatched with a sign-up link',
            ]}
          />
        </SubSection>
        <Bullets
          items={[
            'Pending invitations are shown with a <strong>Pending</strong> badge',
            'Click <strong>Resend</strong> if the invitation email was missed',
            'Click <strong>Revoke</strong> to cancel an invitation before it is accepted',
            'Once the user accepts, the status changes to <strong>Accepted</strong>',
          ]}
        />
        <Tip>
          You can invite multiple users at once by sending invitations one at a time — the list
          will update automatically and you can immediately send the next one.
        </Tip>
      </Section>

      {/* ── Analytics ── */}
      <Section title="Analytics">
        <Screenshot src="/help/admin-analytics.png" alt="Admin Analytics" />
        <p className="text-sm text-rdy-gray-500 mb-3">
          The Analytics page gives you a platform-wide view of engagement across all classes and
          users.
        </p>
        <Bullets
          items={[
            '<strong>Exercise completion rate</strong> — percentage of scheduled exercises completed, across all mentees',
            '<strong>Diary activity</strong> — total diary entries per week, with trend line',
            '<strong>Active mentees</strong> — how many mentees logged in or completed an exercise in the last 7 days',
            '<strong>Session attendance</strong> — group session and 1:1 session participation rates',
            '<strong>Emotional patterns</strong> — AI-detected sentiment trends from diary entries (requires AI to be enabled)',
            'Use the <strong>date range picker</strong> to focus on a specific period',
            'Use the <strong>class filter</strong> to isolate one cohort&apos;s metrics',
          ]}
        />
        <Note>
          Sentiment data is anonymised and aggregated — individual diary text is never shown on the
          analytics page.
        </Note>
      </Section>

      {/* ── AI Settings ── */}
      <Section title="AI Settings">
        <Screenshot src="/help/admin-ai-settings.png" alt="AI Settings" />
        <p className="text-sm text-rdy-gray-500 mb-3">
          Configure the AI provider that powers exercise translation, content generation, and
          diary transcription.
        </p>
        <Steps
          items={[
            'Choose your <strong>default provider</strong>: Anthropic Claude or Google Gemini',
            'Paste your <strong>API key</strong> into the input field',
            'Click <strong>Test Connection</strong> to verify the key is valid',
            'Click <strong>Save</strong>',
            'Toggle <strong>AI Enabled</strong> to ON — AI features are now active throughout the platform',
          ]}
        />
        <div className="mt-4 overflow-x-auto">
          <table className="text-sm w-full border-collapse">
            <thead>
              <tr className="border-b border-rdy-gray-200">
                <th className="text-left py-2 pr-6 font-semibold text-rdy-black">Task</th>
                <th className="text-left py-2 font-semibold text-rdy-black">Recommended model</th>
              </tr>
            </thead>
            <tbody className="text-rdy-gray-500">
              <tr className="border-b border-rdy-gray-100">
                <td className="py-2 pr-6">Translation (exercises, weeks, Module)</td>
                <td className="font-mono text-xs">gemini-1.5-flash</td>
              </tr>
              <tr className="border-b border-rdy-gray-100">
                <td className="py-2 pr-6">Content generation (Herkunft, Ziel)</td>
                <td className="font-mono text-xs">claude-3-5-sonnet-20241022</td>
              </tr>
              <tr>
                <td className="py-2 pr-6">Voice transcription (diary notes)</td>
                <td className="font-mono text-xs">gemini-1.5-flash</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── AI Prompts ── */}
      <Section title="AI Prompts">
        <Screenshot src="/help/admin-ai-prompts.png" alt="AI Prompts" />
        <p className="text-sm text-rdy-gray-500 mb-3">
          AI prompts are the templates the system uses when calling the AI. You can customise
          three of them to match your organisation&apos;s tone and terminology.
        </p>
        <div className="overflow-x-auto">
          <table className="text-sm w-full border-collapse">
            <thead>
              <tr className="border-b border-rdy-gray-200">
                <th className="text-left py-2 pr-6 font-semibold text-rdy-black">Prompt</th>
                <th className="text-left py-2 font-semibold text-rdy-black">What it controls</th>
              </tr>
            </thead>
            <tbody className="text-rdy-gray-500">
              <tr className="border-b border-rdy-gray-100">
                <td className="py-2 pr-6 font-medium">Translation</td>
                <td>How the AI translates German content to English</td>
              </tr>
              <tr className="border-b border-rdy-gray-100">
                <td className="py-2 pr-6 font-medium">Herkunft Generation</td>
                <td>The background / origin description for a Modul</td>
              </tr>
              <tr className="border-b border-rdy-gray-100">
                <td className="py-2 pr-6 font-medium">Ziel Generation</td>
                <td>The goal / aim description for a Modul</td>
              </tr>
              <tr>
                <td className="py-2 pr-6 font-medium">Transcription</td>
                <td>How voice recordings are converted to text (read-only)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <Steps
            items={[
              'Click <strong>Edit</strong> on any configurable prompt',
              'Modify the template — keep the required <strong>placeholder variable</strong> shown in the description (e.g. <code>{title}</code>)',
              'Click <strong>Save Prompt</strong>',
            ]}
          />
        </div>
        <p className="text-sm text-rdy-gray-500 mt-3">
          The badge shows <strong>Default</strong> (built-in wording) or <strong>Custom</strong>{' '}
          (your edited version). Click <strong>Reset to Default</strong> at any time to revert.
        </p>
      </Section>
    </>
  );
}

// ─── MENTOR HELP ──────────────────────────────────────────────────────────────

function MentorHelp() {
  return (
    <>
      <p className="text-sm text-rdy-gray-500 mb-8">
        As a mentor, you guide your mentees through their personal development journey. You run
        group sessions, track individual progress, and can view mentee diary entries to provide
        richer support.
      </p>

      {/* ── Home ── */}
      <Section title="Mentor Home">
        <Screenshot src="/help/mentor-home.png" alt="Mentor Home" />
        <p className="text-sm text-rdy-gray-500 mb-3">
          Your home screen gives you a quick overview of what&apos;s happening today and this week.
        </p>
        <Bullets
          items={[
            '<strong>Today&apos;s sessions</strong> — group sessions and 1:1 bookings scheduled for today',
            '<strong>Your classes</strong> — a summary card for each class you lead with mentee count and curriculum month',
            '<strong>Recent mentee activity</strong> — who completed exercises or wrote diary entries recently',
            '<strong>Upcoming group sessions</strong> — next 3 sessions across all your classes',
          ]}
        />
      </Section>

      {/* ── Classes ── */}
      <Section title="Classes">
        <Screenshot src="/help/mentor-classes.png" alt="Mentor Classes" />
        <p className="text-sm text-rdy-gray-500 mb-3">
          Your classes are the cohorts of mentees you lead. Click any class card to open the
          detail view.
        </p>

        <SubSection title="Class overview">
          <Bullets
            items={[
              'See all enrolled mentees and their overall <strong>exercise completion rate</strong>',
              'Track which curriculum month the class is currently in',
              'View the list of upcoming group sessions for this class',
            ]}
          />
        </SubSection>

        <SubSection title="Individual mentee drill-down">
          <Steps
            items={[
              'Click on a mentee&apos;s name in the class member list',
              'See their <strong>exercise completion</strong> history — which exercises were done, skipped, or pending',
              'View their <strong>diary activity</strong> (if the mentee has enabled sharing)',
              'See their <strong>session attendance</strong> record for group sessions',
              'Check their <strong>1:1 booking history</strong>',
            ]}
          />
        </SubSection>

        <SubSection title="Viewing a mentee&apos;s diary">
          <p className="text-sm text-rdy-gray-500">
            From the mentee detail view, click the <strong>Diary</strong> tab to read entries in
            read-only mode. Voice recordings are playable and the AI transcription is shown below
            each entry.
          </p>
          <Note>
            Mentees control diary sharing in their Settings. If sharing is disabled, their entries
            will not appear in your view.
          </Note>
        </SubSection>
      </Section>

      {/* ── Group Sessions ── */}
      <Section title="Group Sessions">
        <Screenshot src="/help/mentor-group-sessions.png" alt="Group Sessions" />
        <p className="text-sm text-rdy-gray-500 mb-3">
          Group sessions are live meetings with all mentees in a class. You can manage the full
          lifecycle — scheduling, conducting, and documenting — inside RDY.
        </p>

        <SubSection title="Creating a session">
          <Steps
            items={[
              'Go to <strong>Group Sessions</strong> in the sidebar',
              'Click <strong>+ New Session</strong>',
              'Select the <strong>class</strong> this session is for',
              'Set the <strong>date</strong> and <strong>start time</strong>',
              'Set the <strong>duration</strong> in minutes',
              'Add a <strong>title</strong> (e.g. "Week 3 Check-in") and optional description',
              'Click <strong>Save</strong>',
            ]}
          />
        </SubSection>

        <SubSection title="Opening a session detail page">
          <Steps
            items={[
              'Click any session in the list to open its detail page',
              'The page shows the session info, attendance list, and the notes area',
            ]}
          />
        </SubSection>

        <SubSection title="During a session — attendance">
          <Bullets
            items={[
              'The <strong>attendance list</strong> shows all enrolled mentees',
              'Check each mentee as <strong>Present</strong> or leave unchecked for absent',
              'Attendance is saved immediately — no need to submit',
            ]}
          />
        </SubSection>

        <SubSection title="During a session — notes and voice recording">
          <Steps
            items={[
              'Use the <strong>text area</strong> to type session notes or a summary',
              'Click the <strong>microphone button</strong> to record a voice note',
              'Choose your microphone from the dropdown if more than one is connected',
              'Click <strong>Start Recording</strong> — speak your notes',
              'Click <strong>Stop</strong> when done — the AI transcribes the recording automatically',
              'The transcription is added to the notes area where you can edit it',
              'Click <strong>Save Notes</strong>',
            ]}
          />
          <Tip>
            Voice notes are ideal for capturing the energy and key moments of a session without
            typing during the meeting. Transcriptions appear within a few seconds.
          </Tip>
        </SubSection>

        <SubSection title="Attaching follow-up exercises">
          <p className="text-sm text-rdy-gray-500">
            At the bottom of the session detail page you can link additional exercises for mentees
            to complete before the next session. These appear on their calendar.
          </p>
        </SubSection>
      </Section>

      {/* ── Calendar ── */}
      <Section title="Calendar">
        <Screenshot src="/help/mentor-calendar.png" alt="Mentor Calendar" />
        <p className="text-sm text-rdy-gray-500 mb-3">
          Your calendar shows your full schedule: group sessions, 1:1 bookings, and available
          slots.
        </p>
        <Bullets
          items={[
            '<strong>Green blocks</strong> — open slots where mentees can book a 1:1 session',
            '<strong>Orange blocks</strong> — confirmed 1:1 sessions with a specific mentee',
            '<strong>Blue blocks</strong> — group sessions',
            'Click any event to see the details or jump to the session page',
            'Use the <strong>month / week toggle</strong> to switch views',
          ]}
        />
      </Section>

      {/* ── Availability ── */}
      <Section title="Availability">
        <Screenshot src="/help/mentor-availability.png" alt="Mentor Availability" />
        <p className="text-sm text-rdy-gray-500 mb-3">
          Set your weekly availability so mentees can book 1:1 sessions in the time slots you
          have open.
        </p>
        <Steps
          items={[
            'Go to <strong>Availability</strong> in the sidebar',
            'Click a day column (Mon, Tue, …) to add a time slot',
            'Set the <strong>start time</strong> and <strong>end time</strong>',
            'Click <strong>Save</strong>',
            'The slot now appears on your calendar and mentees can book it',
            'Click an existing slot to <strong>edit</strong> or <strong>delete</strong> it',
          ]}
        />
        <Bullets
          items={[
            'You can have multiple slots per day (e.g. 09:00–11:00 and 14:00–16:00)',
            'Slots repeat weekly — set them once and they appear on every calendar week',
            'Already-booked slots are automatically blocked for further bookings',
          ]}
        />
        <Tip>
          Set your availability at the start of each course and update it only when your schedule
          changes — it saves time and avoids double-bookings.
        </Tip>
      </Section>

      {/* ── Analytics ── */}
      <Section title="Analytics">
        <Screenshot src="/help/mentor-analytics.png" alt="Mentor Analytics" />
        <p className="text-sm text-rdy-gray-500 mb-3">
          Track your mentees&apos; progress and engagement over time.
        </p>
        <Bullets
          items={[
            '<strong>Exercise completion rate</strong> — per mentee and as a class average',
            '<strong>Diary engagement</strong> — entries per week with trend',
            '<strong>Emotional pattern trends</strong> — AI-detected sentiment from diary entries (aggregate, anonymised)',
            '<strong>Session attendance</strong> — who attended which group sessions',
            'Use the <strong>mentee selector</strong> to drill down into one person&apos;s data',
            'Use the <strong>date range picker</strong> to focus on a specific period',
          ]}
        />
      </Section>

      {/* ── Mentee Tracking Curves ── */}
      <Section title="Mentee Tracking-Daten">
        <p className="text-sm text-rdy-gray-500 mb-3">
          Für jeden Mentee kannst du die Tracking-Daten als <strong>Kurven</strong> einsehen.
          Die Daten zeigen, wie oft der Mentee seine Tracking-Themen im Alltag bemerkt hat.
        </p>
        <Steps
          items={[
            'Öffne eine Klasse und wähle einen Mentee',
            'Gehe auf <strong>Tracking</strong> im Mentee-Detail',
            'Du siehst Sparkline-Kurven für die letzten 21 Tage pro Kategorie',
            'Nutze diese Daten als Gesprächsgrundlage in der 1:1 Session',
          ]}
        />
      </Section>

      {/* ── Tracking Categories ── */}
      <Section title="Tracking-Themen konfigurieren">
        <p className="text-sm text-rdy-gray-500 mb-3">
          Du kannst für jeden Mentee individuelle Tracking-Themen festlegen. Diese erscheinen
          auf der Reflect-Seite des Mentees.
        </p>
        <Steps
          items={[
            'Navigiere zu <strong>Mentee Settings</strong> (/mentor/mentee/[id]/settings)',
            'Bearbeite die Kategorien — jede hat einen Namen und ein Icon',
            'Füge neue Kategorien hinzu oder entferne bestehende',
            'Tippe auf <strong>Speichern</strong>',
          ]}
        />
        <Tip>
          Standard-Kategorien (Stresslevel, Atmung, Körper, Gedanken) werden verwendet wenn
          du nichts konfigurierst. Passe sie nach dem 1:1 Check-In individuell an.
        </Tip>
      </Section>

      {/* ── Reflection Feedback ── */}
      <Section title="Reflection Feedback geben">
        <p className="text-sm text-rdy-gray-500 mb-3">
          Wenn ein Mentee sein Reflection Sheet eingereicht hat, kannst du Feedback geben.
        </p>
        <Steps
          items={[
            'Gehe zu <strong>Reflections</strong> im Mentee-Detail',
            'Du siehst alle eingereichten Reflection Sheets nach Modul gruppiert',
            'Lies die Antworten des Mentees',
            'Tippe auf <strong>Feedback geben</strong> und schreibe deine Rückmeldung',
            'Tippe auf <strong>Speichern</strong> — der Mentee sieht dein Feedback auf seiner Reflection-Seite',
          ]}
        />
      </Section>

      {/* ── Profile ── */}
      <Section title="Profile">
        <Bullets
          items={[
            'Update your <strong>display name</strong> and <strong>bio</strong>',
            'Upload a <strong>profile photo</strong>',
            'Add your <strong>contact details</strong>',
          ]}
        />
      </Section>
    </>
  );
}

// ─── MENTEE HELP ──────────────────────────────────────────────────────────────

function MenteeHelp() {
  return (
    <>
      <p className="text-sm text-rdy-gray-500 mb-8">
        Willkommen bei RDY. Hier findest du alles, was du brauchst: deine täglichen Exercises,
        Tracking, Diary, Reflection Sheets und die Buchung deiner 1:1 Sessions.
      </p>

      {/* ── Today ── */}
      <Section title="Today — Dein Tagesstart">
        <p className="text-sm text-rdy-gray-500 mb-3">
          Wenn du die App öffnest, siehst du immer den <strong>heutigen Tag</strong> mit deinen
          anstehenden Exercises. Du siehst weder vergangene noch zukünftige Tage — damit du dich
          voll auf das Jetzt konzentrieren kannst.
        </p>
        <Bullets
          items={[
            'Tippe auf eine Exercise um sie zu starten (Video, Audio oder Text)',
            'Erledigte Exercises werden ausgegraut',
            'An Ruhetagen siehst du eine entsprechende Meldung',
          ]}
        />
        <Tip>
          Versuche deine Exercises jeden Tag zur gleichen Zeit zu machen. Die Tingsha-Glocke
          erinnert dich sanft daran.
        </Tip>
      </Section>

      {/* ── Week / Programm ── */}
      <Section title="Week — Programmüberblick">
        <p className="text-sm text-rdy-gray-500 mb-3">
          Die Week-Ansicht zeigt dir den <strong>gesamten RDY Masterclass Ablauf</strong> als Timeline:
        </p>
        <Bullets
          items={[
            '<strong>BASICS</strong> — dein erster Präsenztag (Sonntag)',
            '<strong>MODUL 1–5</strong> — jeweils ein Präsenztag (Samstag), dazwischen 20 Tage Exercises',
            '<strong>END TALK</strong> — dein Abschluss-Videocall',
            'Dein aktuelles Modul ist orange hervorgehoben',
            'Gebuchte 1:1 Sessions erscheinen ebenfalls in der Timeline',
          ]}
        />
      </Section>

      {/* ── Reflect ── */}
      <Section title="Reflect — Tracking + Diary">
        <p className="text-sm text-rdy-gray-500 mb-3">
          Auf der Reflect-Seite findest du <strong>Tracking und Diary kombiniert</strong>.
        </p>
        <SubSection title="Tracking">
          <p className="text-sm text-rdy-gray-500 mb-2">
            Dein Mentor gibt dir Themen vor, die du im Alltag beobachten sollst (z.B. Stresslevel,
            Atmung, Körperliche Verfassung, Gedankenfluss). Immer wenn du eines dieser Themen
            bemerkst, tippst du einfach darauf.
          </p>
          <Bullets
            items={[
              'Ein Tap = ein Eintrag mit aktuellem Zeitstempel',
              'Du kannst mehrmals am Tag tippen — jeder Tap wird mit Uhrzeit gespeichert',
              'Unten siehst du deine heutigen Einträge als Timeline',
              'Dein Mentor sieht diese Daten als Kurven und kann Muster erkennen',
            ]}
          />
        </SubSection>
        <SubSection title="Diary">
          <p className="text-sm text-rdy-gray-500 mb-2">
            Am Ende des Tages schreibst du deine Erkenntnisse auf. Das Diary ist <strong>privat</strong> —
            niemand liest es ausser dir.
          </p>
          <Bullets
            items={[
              'Schreibe in das Textfeld oder tippe auf das Mikrofon-Symbol',
              'Sprachaufnahmen werden automatisch transkribiert',
              'Das Diary speichert automatisch wenn du das Feld verlässt',
            ]}
          />
        </SubSection>
      </Section>

      {/* ── Reflection Sheet ── */}
      <Section title="Reflection Sheet">
        <p className="text-sm text-rdy-gray-500 mb-3">
          Am Ende jedes Moduls beantwortest du Fragen zu deiner Entwicklung. Diese Antworten
          werden an deinen Mentor gesendet — im Gegensatz zum Diary ist das Reflection Sheet
          <strong> nicht privat</strong>.
        </p>
        <Steps
          items={[
            'Gehe zu <strong>Reflection</strong> im Seitenmenü',
            'Beantworte alle Fragen zu deinem aktuellen Modul',
            'Dein Entwurf wird automatisch gespeichert',
            'Wenn du fertig bist, tippe auf <strong>Einreichen</strong>',
            'Dein Mentor gibt dir Feedback — das erscheint dann unter deinen Antworten',
          ]}
        />
      </Section>

      {/* ── Booking ── */}
      <Section title="Booking — 1:1 Session buchen">
        <p className="text-sm text-rdy-gray-500 mb-3">
          In jedem Modul buchst du eine persönliche Session mit deinem Mentor.
        </p>
        <Steps
          items={[
            'Gehe zu <strong>Booking</strong> im Seitenmenü',
            'Wähle einen freien Slot aus dem Kalender deines Mentors',
            'Bestätige die Buchung',
            'Die Session erscheint in deiner Programm-Timeline',
          ]}
        />
      </Section>

      {/* ── Profile + Settings ── */}
      <Section title="Profil und Einstellungen">
        <Bullets
          items={[
            '<strong>Profil</strong> — Name, Profilbild, Klassen-Zugehörigkeit',
            '<strong>Einstellungen</strong> — Benachrichtigungen, Tingsha-Glocke, Ruhezeiten, Sprache',
            '<strong>Diary-Sharing</strong> — kontrolliere ob dein Mentor dein Diary sehen kann (Standard: aus)',
          ]}
        />
      </Section>

      {/* ── Install ── */}
      <Section title="App installieren">
        <SubSection title="Android">
          <Steps
            items={[
              'Öffne RDY in Chrome',
              'Tippe auf <strong>App installieren</strong> im Seitenmenü',
              'Bestätige mit <strong>Installieren</strong>',
            ]}
          />
        </SubSection>
        <SubSection title="iPhone / iPad">
          <Steps
            items={[
              'Öffne RDY in <strong>Safari</strong>',
              'Tippe auf das <strong>Teilen</strong>-Symbol',
              'Wähle <strong>Zum Home-Bildschirm</strong>',
            ]}
          />
        </SubSection>
      </Section>
    </>
  );
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────

export function HelpContent({ role }: { role: SidebarRole }) {
  const titles: Record<SidebarRole, string> = {
    admin: 'Admin Guide',
    mentor: 'Mentor Guide',
    mentee: 'Mentee Guide',
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold text-rdy-black mb-2">{titles[role]}</h1>
      <p className="text-sm text-rdy-gray-400 mb-10 uppercase tracking-wide">User Manual</p>
      {role === 'admin' && <AdminHelp />}
      {role === 'mentor' && <MentorHelp />}
      {role === 'mentee' && <MenteeHelp />}
    </div>
  );
}
