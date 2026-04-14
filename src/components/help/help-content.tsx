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
            '<strong>Recent activity</strong> — latest user-joined events, invitations sent/accepted, and other platform events',
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
              'The exercise dialog stays open after saving — click the X or press Escape to close it',
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

      {/* ── RDY Program Builder ── */}
      <Section title="RDY Program Builder">
        <p className="text-sm text-rdy-gray-500 mb-4">
          The RDY Programm is organised as a three-level hierarchy. Find it in the sidebar under{' '}
          <strong>RDY Program</strong>.
        </p>
        <CodeBlock>{`Module  (Schwerpunktebene — one per month)
  └── Weeks  (up to 4 weeks per Module)
        └── Exercises  (drag-and-drop from the exercise library)`}</CodeBlock>

        <Screenshot src="/help/admin-curriculum-builder.png" alt="Program Builder" />

        <SubSection title="Step 1 — Create a Module">
          <p className="text-sm text-rdy-gray-500 mb-2">
            A <em>Module</em> represents one month&apos;s theme. Modules are managed on a dedicated
            page — go to <strong>Modules</strong> in the sidebar (or navigate to{' '}
            <strong>Admin → Modules</strong>).
          </p>
          <Steps
            items={[
              'Click <strong>Modules</strong> in the left sidebar',
              'Click <strong>Modul hinzufügen</strong> (Add Module)',
              'Enter the <strong>German title</strong> (e.g. "Achtsamkeit" or "Körperbewusstsein")',
              'Click <strong>AI Generate</strong> — the AI creates the <em>Herkunft</em> (origin), <em>Ziel</em> (goal), and English title automatically',
              'Review the generated text and adjust if needed',
              'Click <strong>Save</strong>',
              'Return to <strong>RDY Program</strong> — the Module now appears in the builder',
            ]}
          />
          <Tip>
            Write a precise German title before clicking AI Generate — the richer the title, the
            better the generated content.
          </Tip>
          <Note>
            The Program Builder shows the curriculum structure (Modules → Weeks → Exercises). To
            create or edit Modules themselves, always go to the{' '}
            <strong>Modules</strong> sidebar link first.
          </Note>
        </SubSection>

        <SubSection title="Step 2 — Create weeks">
          <Steps
            items={[
              'With a Module expanded, click <strong>+ Add Week</strong>',
              'Enter the <strong>week title (DE)</strong> and optionally a short description',
              'Optionally add <strong>Leitfragen</strong> (diary prompts) — guiding questions that appear in the mentee&apos;s daily Reflection section for this week',
              'Optionally configure <strong>tracking categories</strong> for this week — these override the mentee&apos;s default tracking buttons',
              'Click <strong>AI Translate</strong> to generate the English version',
              'Click <strong>Save Week</strong>',
              'Repeat for up to 4 weeks',
              'Weeks can be reordered by dragging the grip handle on the left',
            ]}
          />
          <Note>
            Diary prompts (Leitfragen) set on a week appear on the mentee&apos;s Reflection page
            for the entire week when that week is active. Tracking categories set on a week
            replace the default four categories (Stresslevel, Atmung, Körper, Gedanken) for that week.
          </Note>
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
              'Changes are saved automatically after a short delay (debounced)',
              'You cannot deselect all days — at least one must remain active',
            ]}
          />
          <Tip>
            Combine day pickers creatively: strength exercises on Mon/Wed/Fri, mobility on
            Tue/Thu, reflection exercises on Sunday.
          </Tip>
        </SubSection>

        <SubSection title="Builder and Preview tabs">
          <p className="text-sm text-rdy-gray-500">
            Use the <strong>Builder</strong> tab to edit the programme structure.
            Switch to <strong>Preview</strong> to see how it will appear to mentees — useful
            for a final check before generating class schedules. The Preview shows exercises
            per week, their obligatory/optional status, and estimated durations.
          </p>
        </SubSection>

        <SubSection title="Expand / Collapse controls">
          <p className="text-sm text-rdy-gray-500">
            Use <strong>Expand All</strong> and <strong>Collapse All</strong> buttons at the top of
            the builder to quickly show or hide all Modules and weeks at once. Individual Modules
            and weeks can be expanded by clicking their header row.
          </p>
        </SubSection>

        <SubSection title="Translating week and Module text">
          <p className="text-sm text-rdy-gray-500">
            Click the <strong>Translate</strong> button on any week or Module card to
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
              'Click <strong>Add Class</strong> in the top-right corner',
              'Enter the <strong>class name</strong> (e.g. "Spring 2026 Cohort")',
              'Choose a <strong>mentor</strong> from the dropdown (you can assign yourself)',
              'Set the <strong>duration</strong> in months',
              'Set the <strong>start date</strong> — end date is calculated automatically',
              'Configure the <strong>session settings</strong>: session length and how many days in advance mentees can book',
              '<strong>Programme (optional):</strong> assign a Module to each month directly. You can skip this and assign it later.',
              'Click <strong>Create Class</strong>',
            ]}
          />
        </SubSection>

        <SubSection title="Managing the Programme after creation">
          <Steps
            items={[
              'Open the class by clicking its row',
              'Go to the <strong>Program</strong> tab',
              'For each month, open the dropdown and select a Module',
              'The assignment is saved immediately',
              'You can change or reassign any month at any time',
            ]}
          />
          <Note>
            Changing the Programme after the schedule has been generated requires clicking{' '}
            <strong>Generate Schedule</strong> again to apply the changes.
          </Note>
        </SubSection>

        <SubSection title="Generating the exercise schedule">
          <p className="text-sm text-rdy-gray-500 mb-2">
            Once the Programme is assigned and mentees are enrolled, generate the full exercise
            schedule with one click.
          </p>
          <Steps
            items={[
              'Open the class → <strong>Program tab</strong>',
              'Check that all months have a Module assigned',
              'Click <strong>Generate Schedule for All Members</strong>',
              'The system calculates one exercise entry per member, per exercise, per scheduled day, for the entire class duration',
              'A confirmation appears with the number of exercises scheduled',
            ]}
          />
          <Bullets
            items={[
              'Re-running the button wipes the previous schedule and creates a clean one — safe to run after Programme changes',
              'Exercises appear on the mentee calendar immediately after generation',
              'The schedule respects the day-of-week picker set in the curriculum builder',
              'Module duration is configurable per Schwerpunktebene — the schedule uses the configured number of exercise days',
            ]}
          />
          <Note>
            The system uses the <strong>module duration</strong> (configurable in the Program Builder,
            defaults to 28 exercise days) starting from the class start date, so weeks are always
            predictable regardless of calendar month length.
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
                  <td>Month-by-month Module assignments + Generate Schedule button</td>
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
          Invite new users to your tenant by generating a secure sign-up link. You copy the link
          and share it manually — by email, messaging app, or any other channel you prefer. No
          automated email is sent by the system.
        </p>

        <SubSection title="Creating an invitation">
          <Steps
            items={[
              'Click <strong>Invite User</strong> in the top-right corner',
              'Enter the recipient&apos;s <strong>email address</strong>',
              'Choose their <strong>role</strong>: Mentor or Mentee',
              'Choose how long the invitation link remains valid: 1, 3, 7, 14, or 30 days',
              'Click <strong>Send Invitation</strong> — a unique sign-up link is generated and the invitation appears in the list',
            ]}
          />
          <Tip>
            After creating the invitation, open the <strong>Actions</strong> menu on the invitation
            row to copy the link and share it with the new user yourself.
          </Tip>
        </SubSection>

        <SubSection title="Invitation statuses">
          <div className="overflow-x-auto">
            <table className="text-sm w-full border-collapse">
              <thead>
                <tr className="border-b border-rdy-gray-200">
                  <th className="text-left py-2 pr-6 font-semibold text-rdy-black">Status</th>
                  <th className="text-left py-2 font-semibold text-rdy-black">Meaning</th>
                </tr>
              </thead>
              <tbody className="text-rdy-gray-500">
                <tr className="border-b border-rdy-gray-100">
                  <td className="py-2 pr-6 font-medium">Pending</td>
                  <td>Generated but not yet accepted by the recipient</td>
                </tr>
                <tr className="border-b border-rdy-gray-100">
                  <td className="py-2 pr-6 font-medium">Accepted</td>
                  <td>The recipient has registered and the account is active</td>
                </tr>
                <tr className="border-b border-rdy-gray-100">
                  <td className="py-2 pr-6 font-medium">Expired</td>
                  <td>The validity period elapsed before the link was used</td>
                </tr>
                <tr>
                  <td className="py-2 pr-6 font-medium">Revoked</td>
                  <td>Manually cancelled — the link is permanently invalid</td>
                </tr>
              </tbody>
            </table>
          </div>
        </SubSection>

        <SubSection title="Managing existing invitations">
          <Bullets
            items={[
              'Click <strong>Actions</strong> on a pending or expired invitation to open the actions dialog',
              '<strong>Resend</strong> — generates a new link and extends the expiry by 7 days (available for pending and expired invitations)',
              '<strong>Revoke</strong> — permanently cancels a pending invitation so the link can no longer be used',
              'Use the <strong>status filter</strong> and <strong>search</strong> to find specific invitations in large lists',
              'Sort the table by Created, Expires, Email, Role, or Status using the sort controls',
            ]}
          />
        </SubSection>
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
            '<strong>Active mentees</strong> — how many mentees logged in or completed an exercise recently',
            '<strong>Session attendance</strong> — group session and 1:1 session participation rates',
            'Use the <strong>date range picker</strong> to focus on a specific period',
            'Use the <strong>class filter</strong> to isolate one cohort&apos;s metrics',
          ]}
        />
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
                <th className="text-left py-2 font-semibold text-rdy-black">Used for</th>
              </tr>
            </thead>
            <tbody className="text-rdy-gray-500">
              <tr className="border-b border-rdy-gray-100">
                <td className="py-2 pr-6">Translation (exercises, weeks, Module)</td>
                <td>Generating English content from German source text</td>
              </tr>
              <tr className="border-b border-rdy-gray-100">
                <td className="py-2 pr-6">Content generation (Herkunft, Ziel)</td>
                <td>Creating Module origin/goal descriptions from the title</td>
              </tr>
              <tr className="border-b border-rdy-gray-100">
                <td className="py-2 pr-6">Voice transcription (diary notes)</td>
                <td>Converting mentor and mentee voice recordings to text</td>
              </tr>
              <tr>
                <td className="py-2 pr-6">Weekly motivational feedback</td>
                <td>AI-generated weekly summary shown to mentees</td>
              </tr>
            </tbody>
          </table>
        </div>
        <Note>
          API keys are stored encrypted in the database using AES-256-GCM encryption. They are
          never exposed in the interface after saving.
        </Note>
      </Section>

      {/* ── AI Prompts ── */}
      <Section title="AI Prompts">
        <Screenshot src="/help/admin-ai-prompts.png" alt="AI Prompts" />
        <p className="text-sm text-rdy-gray-500 mb-3">
          AI prompts are the templates the system uses when calling the AI. You can customise
          them to match your organisation&apos;s tone and terminology.
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
                <td>The background / origin description for a Module</td>
              </tr>
              <tr className="border-b border-rdy-gray-100">
                <td className="py-2 pr-6 font-medium">Ziel Generation</td>
                <td>The goal / aim description for a Module</td>
              </tr>
              <tr className="border-b border-rdy-gray-100">
                <td className="py-2 pr-6 font-medium">Transcription</td>
                <td>How voice recordings are converted to text</td>
              </tr>
              <tr>
                <td className="py-2 pr-6 font-medium">Weekly Feedback</td>
                <td>The motivational weekly summary generated for each mentee</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <Steps
            items={[
              'Click <strong>Edit</strong> on any configurable prompt',
              'Modify the template — keep the required <strong>placeholder variables</strong> shown in the description (e.g. <code>{title}</code>)',
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
        Als Mentor begleitest du deine Mentees auf ihrer persönlichen Entwicklungsreise.
        Du führst Gruppen-Sessions durch, verfolgst den Fortschritt der Einzelnen und
        kannst auf Reflection-Daten zugreifen, um gezielter zu unterstützen.{' '}
        <em>As a mentor, you guide your mentees through their personal development journey.
        You run group sessions, track individual progress, and can view mentee diary data
        to provide richer support.</em>
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
            '<strong>Your classes</strong> — a summary card for each class you lead, showing mentee count and current module',
            '<strong>Upcoming sessions</strong> — the next scheduled group sessions and 1:1 bookings across all your classes',
            '<strong>Recent activity</strong> — quick-access links to class details, group sessions, and analytics',
          ]}
        />
      </Section>

      {/* ── Classes ── */}
      <Section title="Classes / Klassen">
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
              'View their <strong>diary / reflection activity</strong> (if sharing is enabled by the mentee)',
              'See their <strong>session attendance</strong> record for group sessions',
              'Check their <strong>1:1 booking history</strong>',
              'Review submitted <strong>Reflection Sheets</strong> and provide feedback',
            ]}
          />
        </SubSection>

        <SubSection title="Viewing a mentee&apos;s diary entries">
          <p className="text-sm text-rdy-gray-500">
            From the mentee detail view, go to the <strong>Diary</strong> tab to read entries in
            read-only mode. Voice recordings are playable and the AI transcription is shown below
            each entry.
          </p>
          <Note>
            Mentees control diary sharing in their Settings (Weekly Summary page). If sharing is
            disabled, diary entries will not appear in your view.
          </Note>
        </SubSection>

        <SubSection title="Reflection Sheet — Feedback geben">
          <p className="text-sm text-rdy-gray-500 mb-2">
            Wenn ein Mentee sein Reflection Sheet für ein Modul eingereicht hat, kannst du
            schriftliches Feedback geben. Das Feedback erscheint direkt auf der
            Reflection-Sheet-Seite des Mentees.
          </p>
          <Steps
            items={[
              'Öffne den Mentee im Mentee-Detail',
              'Gehe auf den Tab <strong>Reflections</strong>',
              'Du siehst alle eingereichten Sheets nach Modul geordnet',
              'Lies die Antworten des Mentees',
              'Klicke <strong>Feedback geben</strong> und schreibe deine Rückmeldung',
              'Klicke <strong>Speichern</strong> — der Mentee sieht das Feedback auf seiner Reflection Sheet-Seite',
            ]}
          />
        </SubSection>
      </Section>

      {/* ── Group Sessions ── */}
      <Section title="Group Sessions / Gruppen-Sessions">
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
      </Section>

      {/* ── Calendar ── */}
      <Section title="Calendar / Kalender">
        <Screenshot src="/help/mentor-calendar.png" alt="Mentor Calendar" />
        <p className="text-sm text-rdy-gray-500 mb-3">
          Your calendar shows your full schedule: 1:1 bookings from mentees and available
          availability slots. Navigate month by month to see upcoming appointments.
        </p>
        <Bullets
          items={[
            'Days with availability slots or bookings are highlighted on the calendar',
            'Click a day to see all sessions and slots for that date',
            'Confirmed 1:1 sessions show the mentee&apos;s name, time, and duration',
            'Open slots show the time window where mentees can still book',
            'Only future dates are active — past dates are not bookable',
            'Use the month navigation arrows to move between months',
          ]}
        />
        <Note>
          The mentor calendar view is focused on availability and 1:1 bookings. Group session
          scheduling is managed from the <strong>Group Sessions</strong> page.
        </Note>
      </Section>

      {/* ── Availability ── */}
      <Section title="Availability / Verfügbarkeit">
        <Screenshot src="/help/mentor-availability.png" alt="Mentor Availability" />
        <p className="text-sm text-rdy-gray-500 mb-3">
          Set your availability so mentees can book 1:1 sessions in the time slots you have open.
          The page shows two counters: <strong>One-time slots</strong> and{' '}
          <strong>Recurring slots</strong>.
        </p>

        <SubSection title="Adding a slot">
          <Steps
            items={[
              'Go to <strong>Availability</strong> in the sidebar',
              'Click <strong>+ Add Slot</strong> to add a single one-time slot',
              'Or click <strong>Bulk Add</strong> to create multiple slots at once',
              'Set the <strong>date</strong>, <strong>start time</strong>, and <strong>end time</strong>',
              'Choose whether the slot is <strong>one-time</strong> or <strong>recurring weekly</strong>',
              'Save — the slot appears in the upcoming list and on your calendar',
            ]}
          />
        </SubSection>

        <Bullets
          items={[
            'Upcoming slots are listed chronologically below the Add buttons',
            'Click any slot row to <strong>edit</strong> or <strong>delete</strong> it',
            'Already-booked slots are automatically blocked for further bookings',
            'Recurring slots repeat weekly on the same day and time until deleted',
          ]}
        />
        <Tip>
          Use <strong>Bulk Add</strong> at the start of a new term to create recurring weekly
          slots in one go — saves time and avoids double-bookings.
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
            '<strong>Session attendance</strong> — who attended which group sessions',
            'Use the <strong>mentee selector</strong> to drill down into one person&apos;s data',
            'Use the <strong>date range picker</strong> to focus on a specific period',
          ]}
        />
      </Section>

      {/* ── Mentee Tracking Data ── */}
      <Section title="Mentee Tracking-Daten">
        <p className="text-sm text-rdy-gray-500 mb-3">
          Für jeden Mentee kannst du die Tracking-Daten einsehen. Die Daten zeigen, wie oft der
          Mentee seine Tracking-Themen im Alltag bemerkt und geloggt hat — als Zeitreihe
          mit Uhrzeit-Stempeln.
        </p>
        <Steps
          items={[
            'Öffne eine Klasse und wähle einen Mentee',
            'Gehe auf den Tab <strong>Tracking</strong> im Mentee-Detail',
            'Du siehst alle geloggten Einträge pro Kategorie mit Zeitstempel',
            'Nutze diese Daten als Gesprächsgrundlage in der 1:1 Session',
          ]}
        />
        <Note>
          Die Tracking-Kategorien können pro Woche im RDY Program Builder konfiguriert werden.
          Standard-Kategorien sind: Stresslevel, Atmung, Körper, Gedanken.
        </Note>
      </Section>

      {/* ── Profile ── */}
      <Section title="Profile / Profil">
        <Screenshot src="/help/mentor-profile.png" alt="Mentor Profile" />
        <Bullets
          items={[
            'Your <strong>name</strong> and <strong>email</strong> are shown from your account',
            'Your <strong>roles</strong> are displayed (e.g. "mentor, admin")',
            'Click <strong>Sign Out</strong> to end your session',
          ]}
        />
        <Note>
          Profile information is managed through your Keycloak account. Contact your system
          administrator to change your name or email address.
        </Note>
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
        Tracking, tägliche Notizen, das Reflection Sheet und die Buchung deiner 1:1 Sessions.
        Die App ist dein täglicher Begleiter durch das RDY Masterclass Programm.
      </p>

      {/* ── Today — Daily Calendar ── */}
      <Section title="Today — Dein Tagesstart">
        <Screenshot src="/help/mentee-home.png" alt="Today — Tagesansicht" />
        <p className="text-sm text-rdy-gray-500 mb-3">
          Wenn du die App öffnest, siehst du immer den <strong>heutigen Tag</strong> mit deinen
          anstehenden Exercises. Die Ansicht zeigt nur den aktuellen Tag — damit du dich voll
          auf das Jetzt konzentrieren kannst.
        </p>
        <Bullets
          items={[
            'Tippe auf eine Exercise, um sie zu starten (Video, Audio oder Text)',
            'Erledigte Exercises werden ausgegraut',
            'An Ruhetagen siehst du eine Ruhetag-Meldung mit einem Blatt-Symbol',
            'Das Uhren-Symbol rechts an jeder Exercise erlaubt dir, die Uhrzeit der Exercise auf heute zu verschieben',
            'Ein oranger Banner erinnert dich, wenn du in deinem aktuellen Modul noch keine 1:1 Session gebucht hast',
            'Ein weiterer Banner erinnert dich, wenn ein RDY Check-In fällig ist',
          ]}
        />
        <Tip>
          Tippe auf das <strong>Uhren-Symbol</strong> neben einer Exercise, um sie auf eine
          andere Uhrzeit für heute umzuplanen. So kannst du deine Exercises flexibel in deinen
          Tag einpassen.
        </Tip>
      </Section>

      {/* ── Exercises ── */}
      <Section title="Exercises — Übungsdetails">
        <Screenshot src="/help/mentee-exercises.png" alt="Exercise Detail" />
        <p className="text-sm text-rdy-gray-500 mb-3">
          Jede Exercise öffnet eine Detailseite, auf der du die Übung ausführst und abschliesst.
        </p>
        <Bullets
          items={[
            '<strong>Video-Exercises</strong>: Der eingebettete Videoplayer startet direkt in der App',
            '<strong>Audio-Exercises</strong>: Ein Audioplayer mit Play/Pause und Fortschrittsanzeige',
            '<strong>Text-Exercises</strong>: Formatierter Text zum Lesen — scrolle durch den Inhalt',
            'Tippe auf <strong>Abschliessen / Mark as Done</strong> wenn du fertig bist',
            'Die Exercise wird in deiner Tagesansicht als erledigt markiert',
          ]}
        />
        <Note>
          Exercises sind <strong>obligatorisch</strong> oder <strong>optional</strong> — dein
          Mentor und Admin legen dies im Programm fest. Alle Exercises erscheinen in deiner
          Tagesansicht, unabhängig vom Status.
        </Note>
      </Section>

      {/* ── Calendar / Week View ── */}
      <Section title="Calendar — Programmüberblick">
        <Screenshot src="/help/mentee-calendar.png" alt="Calendar — Programm-Timeline" />
        <p className="text-sm text-rdy-gray-500 mb-3">
          Die Calendar-Ansicht zeigt dir den <strong>gesamten RDY Masterclass Ablauf</strong>
          als Timeline mit allen Modulen und deinem Fortschritt:
        </p>
        <Bullets
          items={[
            '<strong>BASICS</strong> — dein erster Abschnitt mit den Grundlagen-Exercises',
            '<strong>MODUL 1–5</strong> — jeweils ein Modul mit mehreren Wochen Exercises bis zum nächsten Präsenztag',
            '<strong>END TALK</strong> — dein Abschluss',
            'Dein aktuelles Modul ist <strong>orange hervorgehoben</strong>',
            'Vergangene Module erscheinen abgedunkelt, zukünftige heller',
            'Tippe auf ein Modul, um die Wochen und Exercises darin zu sehen',
          ]}
        />
        <Tip>
          In der Timeline siehst du auch gebuchte 1:1 Sessions und Gruppen-Sessions, die deiner
          Klasse zugeordnet sind.
        </Tip>
      </Section>

      {/* ── Reflection (Tracking + Daily Notes) ── */}
      <Section title="Reflection — Tracking + Tagesnotizen">
        <Screenshot src="/help/mentee-diary.png" alt="Reflection — Tracking und Tagesnotizen" />
        <p className="text-sm text-rdy-gray-500 mb-3">
          Auf der Reflection-Seite (im Menü als <strong>Reflection</strong> angezeigt) findest du{' '}
          <strong>Tracking und tägliche Notizen kombiniert</strong>. Diese Seite ist dein
          tägliches Beobachtungs-Werkzeug für die aktuellen Modul-Themen.
        </p>

        <SubSection title="Tracking">
          <p className="text-sm text-rdy-gray-500 mb-2">
            Dein Mentor oder Admin legt Themen fest, die du im Alltag beobachten sollst
            (Standard: Stresslevel, Atmung, Körper, Gedanken). Immer wenn du eines dieser
            Themen bemerkst, tippst du einfach auf den entsprechenden Button.
          </p>
          <Bullets
            items={[
              'Ein Tap = ein Eintrag mit aktuellem Zeitstempel',
              'Du kannst mehrmals am Tag tippen — jeder Tap wird mit Uhrzeit gespeichert',
              'Unter den Buttons siehst du eine <strong>Timeline</strong> aller heutigen Einträge',
              'Tippe auf das <strong>× Symbol</strong> neben einem Eintrag, um ihn zu löschen',
              'Dein Mentor kann diese Daten einsehen und Muster erkennen',
              'Die Tracking-Kategorien können je Woche vom Admin oder Mentor angepasst werden',
            ]}
          />
        </SubSection>

        <SubSection title="Leitfragen der Woche">
          <p className="text-sm text-rdy-gray-500 mb-2">
            Wenn dein Mentor oder Admin für die aktuelle Woche Leitfragen konfiguriert hat,
            erscheinen diese in einem orangen Kasten oberhalb des Notiz-Felds. Nutze sie als
            Inspiration für deine täglichen Notizen.
          </p>
        </SubSection>

        <SubSection title="Tagesnotizen (Reflection)">
          <p className="text-sm text-rdy-gray-500 mb-2">
            Unter dem Tracking-Bereich findest du ein Textfeld für deine täglichen Notizen.
            Diese sind <strong>privat</strong> — niemand liest sie ausser dir.
          </p>
          <Bullets
            items={[
              'Schreibe in das Textfeld oder tippe auf das <strong>Mikrofon-Symbol</strong> für eine Sprachaufnahme',
              'Sprachaufnahmen werden automatisch transkribiert und an deinen Text angehängt',
              'Die Notizen werden automatisch gespeichert, wenn du das Textfeld verlässt',
              'Du kannst jeden Tag neue Notizen schreiben — jede Notiz ist einem Datum zugeordnet',
            ]}
          />
          <Note>
            Die täglichen Notizen (Diary) sind komplett privat und werden nicht an deinen Mentor
            übertragen, es sei denn, du aktivierst die Sharing-Funktion im Weekly Summary.
          </Note>
        </SubSection>
      </Section>

      {/* ── Reflection Sheet ── */}
      <Section title="Reflection Sheet — Modul-Abschluss">
        <Screenshot src="/help/mentee-reflection.png" alt="Reflection Sheet" />
        <p className="text-sm text-rdy-gray-500 mb-3">
          Am Ende jedes Moduls beantwortest du Fragen zu deiner Entwicklung in diesem Modul.
          Das Reflection Sheet ist erreichbar über die Programme-Timeline oder direkt im Menü.
          Im Gegensatz zu den täglichen Notizen ist das Reflection Sheet{' '}
          <strong>nicht privat</strong> — dein Mentor sieht deine Antworten.
        </p>
        <Steps
          items={[
            'Öffne das Reflection Sheet über die Programm-Timeline oder das Menü',
            'Beantworte alle Fragen zu deinem aktuellen Modul',
            'Dein Entwurf wird automatisch gespeichert, wenn du ein Textfeld verlässt',
            'Wenn du fertig bist, tippe auf <strong>Einreichen</strong>',
            'Nach dem Einreichen siehst du eine Bestätigung — dein Mentor erhält Zugriff auf deine Antworten',
            'Dein Mentor gibt dir schriftliches Feedback — das erscheint dann direkt unter deinen Antworten',
          ]}
        />
        <Bullets
          items={[
            'Die Fragen werden vom Admin oder Mentor pro Modul konfiguriert',
            'Standard-Fragen behandeln Lernerfahrungen, hilfreiche Übungen, Herausforderungen und Ziele',
            'Einmal eingereicht, kannst du das Sheet nicht mehr bearbeiten',
            'Das Feedback deines Mentors erscheint in einem eigenen Abschnitt unter deinen Antworten',
          ]}
        />
        <Tip>
          Schreibe dein Reflection Sheet zeitnah zum Modulabschluss — so sind die Erfahrungen
          noch frisch und deine Antworten werden authentischer.
        </Tip>
      </Section>

      {/* ── Weekly Summary ── */}
      <Section title="Weekly Summary — Wochenrückblick">
        <Screenshot src="/help/mentee-weekly-summary.png" alt="Weekly Summary" />
        <p className="text-sm text-rdy-gray-500 mb-3">
          Der Weekly Summary gibt dir einen <strong>Überblick über deine Woche</strong> —
          deine Exercise-Aktivität, Tracking-Daten, Diary-Einträge und eine KI-generierte
          persönliche Rückmeldung.
        </p>
        <Bullets
          items={[
            '<strong>Dein Wochen-Feedback</strong> — eine KI-generierte persönliche Rückmeldung in einem orangen Kasten ganz oben, basierend auf deiner Wochenaktivität',
            '<strong>Mood Barometer</strong> — dein emotionales Gleichgewicht der Woche, berechnet aus deinen Tracking-Einträgen',
            '<strong>Exercise-Completion</strong> — wie viele deiner Exercises du erledigt hast und welche',
            '<strong>Pattern-Häufigkeit</strong> — ein Balkendiagramm deiner Tracking-Kategorien für die Woche',
            '<strong>Diary Highlights</strong> — Zusammenfassung deiner Notiz-Aktivität',
            '<strong>Woche-über-Woche Vergleich</strong> — wie sich deine Kennzahlen über die letzten Wochen entwickeln',
          ]}
        />

        <SubSection title="Navigation">
          <Bullets
            items={[
              'Tippe auf die <strong>Pfeil-Buttons</strong> links und rechts, um durch vergangene Wochen zu blättern',
              'Tippe auf das <strong>Kalender-Symbol</strong> neben der Wochenbezeichnung, um direkt eine Woche auszuwählen',
              'Der rechte Pfeil ist für zukünftige Wochen deaktiviert',
              'Tippe auf <strong>Go to Current Week</strong> um schnell zur aktuellen Woche zu springen',
            ]}
          />
        </SubSection>

        <SubSection title="Share with Mentor">
          <p className="text-sm text-rdy-gray-500 mb-2">
            Mit dem <strong>Share with Mentor</strong> Toggle kannst du deinem Mentor Einblick
            in deinen Weekly Summary geben.
          </p>
          <Bullets
            items={[
              'Toggle <strong>aktiviert</strong>: Dein Mentor kann deine Wochen-Daten einsehen',
              'Toggle <strong>deaktiviert</strong>: Der Weekly Summary bleibt nur für dich sichtbar',
              'Du kannst diese Einstellung jederzeit ändern',
            ]}
          />
        </SubSection>
        <Note>
          Das KI-Feedback wird für die aktuelle Woche automatisch generiert. Es wird auf Basis
          deiner Exercise-Aktivität, Tracking-Einträge und Diary-Notizen erstellt — personalisiert
          und motivierend formuliert.
        </Note>
      </Section>

      {/* ── Booking ── */}
      <Section title="Booking — 1:1 Session buchen">
        <Screenshot src="/help/mentee-booking.png" alt="Booking" />
        <p className="text-sm text-rdy-gray-500 mb-3">
          In jedem Modul buchst du eine persönliche 1:1 Session mit deinem Mentor. Die Booking-Seite
          zeigt dir alle verfügbaren Termine des Monats.
        </p>

        <SubSection title="Session buchen">
          <Steps
            items={[
              'Gehe zu <strong>Booking</strong> im Menü',
              'Navigiere im Kalender zum gewünschten Monat (mit den Pfeil-Buttons)',
              'Tage mit <strong>orangem Ring</strong> haben freie Slots — tippe auf einen solchen Tag',
              'Tage mit <strong>grünem Hintergrund</strong> haben bereits gebuchte Sessions',
              'Wähle einen freien Zeitslot aus der Liste unter dem Kalender',
              'Ein Bestätigungsdialog zeigt dir Datum, Uhrzeit und Mentor an',
              'Füge optional eine <strong>Notiz für deinen Mentor</strong> hinzu',
              'Tippe auf <strong>Confirm Booking</strong>',
            ]}
          />
        </SubSection>

        <SubSection title="Monatliches Limit">
          <p className="text-sm text-rdy-gray-500 mb-2">
            Eine orangefarbene Karte ganz oben zeigt dir dein monatliches Buchungs-Budget:
          </p>
          <Bullets
            items={[
              'Die Karte zeigt <strong>gebuchte Sessions / monatliches Limit</strong> (z.B. "1 / 2")',
              'Eine Fortschrittsleiste visualisiert deinen Verbrauch',
              'Wenn das Limit erreicht ist, wird die Karte rot und du kannst keine neuen Sessions buchen',
              'Das Limit wird monatlich zurückgesetzt',
            ]}
          />
        </SubSection>

        <SubSection title="Session stornieren">
          <Bullets
            items={[
              'Tippe auf einen Tag mit grünem Hintergrund, um deine gebuchte Session zu sehen',
              'Tippe auf <strong>Cancel</strong> neben der Buchung',
              'Bestätige die Stornierung im Dialog',
              'Der Slot ist danach wieder für Buchungen verfügbar',
            ]}
          />
        </SubSection>

        <Note>
          Nur <strong>zukünftige Daten</strong> können ausgewählt werden — vergangene Tage sind
          im Kalender deaktiviert. Wenn du in deinem aktuellen Modul noch keine Session gebucht
          hast, erscheint auf der Today-Seite ein Erinnerungs-Banner.
        </Note>
      </Section>

      {/* ── Profile ── */}
      <Section title="Profil">
        <Screenshot src="/help/mentee-profile.png" alt="Mentee Profil" />
        <p className="text-sm text-rdy-gray-500 mb-3">
          Das Profil zeigt deine persönlichen Account-Informationen.
        </p>
        <Bullets
          items={[
            '<strong>Name</strong> — dein Anzeigename aus dem RDY-System',
            '<strong>Email</strong> — deine registrierte E-Mail-Adresse',
            '<strong>Rolle</strong> — zeigt "mentee" an',
            '<strong>Klasse und Modul</strong> — deine aktuelle Klasse und das aktuelle Programm-Modul',
            'Tippe auf <strong>Sign Out</strong>, um dich abzumelden',
          ]}
        />
      </Section>

      {/* ── Settings (Notifications) ── */}
      <Section title="Einstellungen — Push-Benachrichtigungen">
        <Screenshot src="/help/mentee-settings.png" alt="Einstellungen" />
        <p className="text-sm text-rdy-gray-500 mb-3">
          In den Einstellungen konfigurierst du, wann und wie die App dich erinnert.
        </p>

        <SubSection title="Push-Benachrichtigungen aktivieren">
          <Steps
            items={[
              'Tippe auf <strong>Enable Push Notifications</strong> — dein Browser fragt nach Erlaubnis',
              'Bestätige die Erlaubnis im Browser-Dialog',
              'Der Status wechselt zu "Active" — Benachrichtigungen sind nun aktiv',
            ]}
          />
        </SubSection>

        <SubSection title="Benachrichtigungs-Typen">
          <div className="overflow-x-auto">
            <table className="text-sm w-full border-collapse">
              <thead>
                <tr className="border-b border-rdy-gray-200">
                  <th className="text-left py-2 pr-6 font-semibold text-rdy-black">Typ</th>
                  <th className="text-left py-2 font-semibold text-rdy-black">Wann</th>
                </tr>
              </thead>
              <tbody className="text-rdy-gray-500">
                <tr className="border-b border-rdy-gray-100">
                  <td className="py-2 pr-6 font-medium">Exercise Reminders</td>
                  <td>Tägliche Erinnerung an deine Exercises (konfigurierbare Vorlaufzeit in Minuten)</td>
                </tr>
                <tr className="border-b border-rdy-gray-100">
                  <td className="py-2 pr-6 font-medium">Session Reminders</td>
                  <td>Erinnerung vor deiner 1:1 Session (konfigurierbare Vorlaufzeit)</td>
                </tr>
                <tr className="border-b border-rdy-gray-100">
                  <td className="py-2 pr-6 font-medium">Group Session Reminders</td>
                  <td>Erinnerung vor Gruppen-Sessions deiner Klasse</td>
                </tr>
                <tr>
                  <td className="py-2 pr-6 font-medium">Morning Reminder</td>
                  <td>Optionale Morgen-Erinnerung um eine konfigurierbare Uhrzeit</td>
                </tr>
              </tbody>
            </table>
          </div>
        </SubSection>

        <SubSection title="Benachrichtigungs-Ton">
          <p className="text-sm text-rdy-gray-500">
            Wähle zwischen verschiedenen Tingsha-Bell-Varianten oder{' '}
            <strong>Silent</strong> (nur visuell, kein Ton). Tippe auf{' '}
            <strong>Test Notification</strong>, um einen Testton abzuspielen.
          </p>
        </SubSection>
      </Section>

      {/* ── Install as App ── */}
      <Section title="App installieren">
        <p className="text-sm text-rdy-gray-500 mb-4">
          RDY ist eine Progressive Web App (PWA) — du kannst sie auf deinem Smartphone
          installieren und wie eine native App verwenden.
        </p>
        <SubSection title="Android (Chrome)">
          <Steps
            items={[
              'Öffne RDY in <strong>Chrome</strong>',
              'Tippe auf die drei Punkte oben rechts oder suche im Menü nach <strong>App installieren</strong>',
              'Bestätige mit <strong>Installieren</strong>',
              'RDY erscheint auf deinem Home-Screen',
            ]}
          />
        </SubSection>
        <SubSection title="iPhone / iPad (Safari)">
          <Steps
            items={[
              'Öffne RDY in <strong>Safari</strong> (nicht Chrome oder Firefox)',
              'Tippe auf das <strong>Teilen</strong>-Symbol (Rechteck mit Pfeil nach oben) unten in der Adressleiste',
              'Scrolle im Teilen-Menü nach unten und wähle <strong>Zum Home-Bildschirm</strong>',
              'Tippe auf <strong>Hinzufügen</strong>',
              'RDY erscheint auf deinem Home-Screen wie eine native App',
            ]}
          />
        </SubSection>
        <Tip>
          Nach der Installation startet RDY ohne Browser-Adressleiste — das sieht aus und fühlt
          sich an wie eine richtige App. Push-Benachrichtigungen funktionieren auf Android
          zuverlässig; auf iPhone/iPad benötigst du iOS 16.4 oder neuer.
        </Tip>
      </Section>
    </>
  );
}

// ─── ADMIN HELP — ESPAÑOL ────────────────────────────────────────────────────

function AdminHelpES() {
  return (
    <>
      <p className="text-sm text-rdy-gray-500 mb-8">
        Como administrador tienes control total sobre el contenido, los usuarios y la
        configuración de tu plataforma. <strong>Los administradores también son mentores</strong>{' '}
        — puedes dirigir clases y ver los datos de los aprendices, además de gestionar la plataforma.
      </p>

      {/* ── Panel de control ── */}
      <Section title="Panel de control">
        <Screenshot src="/help/admin-dashboard.png" alt="Panel de control" />
        <p className="text-sm text-rdy-gray-500 mb-3">
          El panel de control te da una visión general inmediata del estado de tu plataforma.
        </p>
        <Bullets
          items={[
            '<strong>Clases activas</strong> — número total de clases en curso',
            '<strong>Total de aprendices</strong> — todos los usuarios inscritos en todas las clases',
            '<strong>Invitaciones pendientes</strong> — invitaciones enviadas pero aún no aceptadas',
            '<strong>Actividad reciente</strong> — últimos eventos: nuevos usuarios, invitaciones enviadas/aceptadas y otros eventos de la plataforma',
            'Usa los accesos directos en la parte superior para ir rápidamente a las secciones más visitadas',
          ]}
        />
      </Section>

      {/* ── Ejercicios ── */}
      <Section title="Ejercicios">
        <Screenshot src="/help/admin-exercises.png" alt="Gestión de ejercicios" />
        <p className="text-sm text-rdy-gray-500 mb-4">
          Los ejercicios son los elementos básicos de todo plan de estudios. Cada ejercicio
          es bilingüe (alemán + inglés) y puede contener video, audio o texto con formato.
        </p>

        <SubSection title="Tipos de ejercicio">
          <div className="overflow-x-auto">
            <table className="text-sm w-full border-collapse">
              <thead>
                <tr className="border-b border-rdy-gray-200">
                  <th className="text-left py-2 pr-6 font-semibold text-rdy-black">Tipo</th>
                  <th className="text-left py-2 font-semibold text-rdy-black">Descripción</th>
                </tr>
              </thead>
              <tbody className="text-rdy-gray-500">
                <tr className="border-b border-rdy-gray-100">
                  <td className="py-2 pr-6 font-medium">Video</td>
                  <td>
                    Enlaza a un archivo de video alojado. Admite URLs de video separadas en alemán
                    e inglés para que los aprendices vean la versión en su idioma.
                  </td>
                </tr>
                <tr className="border-b border-rdy-gray-100">
                  <td className="py-2 pr-6 font-medium">Audio</td>
                  <td>Enlaza a un archivo de audio (meditación guiada, ejercicios de respiración, etc.).</td>
                </tr>
                <tr>
                  <td className="py-2 pr-6 font-medium">Texto</td>
                  <td>Contenido en formato Markdown mostrado directamente — ideal para lecturas o instrucciones.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </SubSection>

        <SubSection title="Crear un ejercicio">
          <Steps
            items={[
              'Haz clic en <strong>+ Create Exercise</strong> en la esquina superior derecha',
              'Elige el <strong>tipo</strong>: Video, Audio o Texto',
              'Introduce el <strong>Título (DE)</strong> — el título principal en alemán',
              'Introduce la <strong>Descripción (DE)</strong> — un breve resumen que aparece en la lista',
              'Para <strong>Video</strong>: pega la URL del video en alemán; opcionalmente agrega una URL en inglés',
              'Para <strong>Audio</strong>: pega la URL del archivo de audio',
              'Para <strong>Texto</strong>: escribe o pega el contenido en alemán en el editor Markdown',
              'Introduce una <strong>duración</strong> en minutos (visible para los aprendices antes de comenzar)',
              'Haz clic en <strong>AI Translate</strong> — la IA completa automáticamente el título, la descripción y el texto en inglés',
              'Revisa y ajusta la traducción al inglés si es necesario',
              'Haz clic en <strong>Save</strong>',
            ]}
          />
          <Tip>
            Si la traducción con IA aún no está configurada, ve primero a <strong>AI Settings</strong>{' '}
            e introduce tu clave de API.
          </Tip>
        </SubSection>

        <SubSection title="Editar o eliminar un ejercicio">
          <Bullets
            items={[
              'Haz clic en el <strong>ícono de lápiz</strong> en cualquier fila para abrir el diálogo de edición',
              'Modifica cualquier campo y haz clic en <strong>Save</strong>',
              'El diálogo permanece abierto después de guardar — haz clic en la X o presiona Escape para cerrarlo',
              'Para eliminar, haz clic en el <strong>ícono de papelera</strong> — se te pedirá confirmación',
              'Eliminar un ejercicio también lo quita de todas las semanas del plan de estudios',
            ]}
          />
          <Note>
            Los ejercicios que están programados actualmente para miembros de una clase no pueden
            eliminarse — retíralos primero del plan de estudios y vuelve a generar el calendario
            antes de eliminarlos.
          </Note>
        </SubSection>

        <SubSection title="Buscar y filtrar">
          <Bullets
            items={[
              'Usa la <strong>barra de búsqueda</strong> para filtrar por título',
              'Usa el <strong>filtro de tipo</strong> (Video / Audio / Texto) para acotar la lista',
              'El número total de ejercicios aparece en la parte superior de la lista',
            ]}
          />
        </SubSection>
      </Section>

      {/* ── Constructor de programa ── */}
      <Section title="Constructor del programa RDY">
        <p className="text-sm text-rdy-gray-500 mb-4">
          El Programa RDY se organiza en una jerarquía de tres niveles. Encuéntralo en el menú
          lateral bajo <strong>RDY Program</strong>.
        </p>
        <CodeBlock>{`Módulo  (módulo temático — uno por mes)
  └── Semanas  (hasta 4 semanas por módulo)
        └── Ejercicios  (arrastra y suelta desde la biblioteca)`}</CodeBlock>

        <Screenshot src="/help/admin-curriculum-builder.png" alt="Constructor del programa" />

        <SubSection title="Paso 1 — Crear un módulo">
          <p className="text-sm text-rdy-gray-500 mb-2">
            Un <em>Módulo</em> representa el tema de un mes. Los módulos se gestionan en una
            página específica — ve a <strong>Modules</strong> en el menú lateral (o navega a{' '}
            <strong>Admin → Modules</strong>).
          </p>
          <Steps
            items={[
              'Haz clic en <strong>Modules</strong> en el menú lateral izquierdo',
              'Haz clic en <strong>Agregar módulo</strong> (Add Module)',
              'Introduce el <strong>título en alemán</strong> (p. ej. "Achtsamkeit" o "Körperbewusstsein")',
              'Haz clic en <strong>AI Generate</strong> — la IA crea automáticamente el <em>origen</em>, el <em>objetivo</em> y el título en inglés',
              'Revisa el texto generado y ajústalo si es necesario',
              'Haz clic en <strong>Save</strong>',
              'Regresa a <strong>RDY Program</strong> — el módulo aparecerá ahora en el constructor',
            ]}
          />
          <Tip>
            Escribe un título en alemán preciso antes de hacer clic en AI Generate — cuanto más
            descriptivo sea el título, mejor será el contenido generado.
          </Tip>
          <Note>
            El Constructor del Programa muestra la estructura del plan de estudios (Módulos → Semanas
            → Ejercicios). Para crear o editar módulos, ve siempre primero al enlace{' '}
            <strong>Modules</strong> en el menú lateral.
          </Note>
        </SubSection>

        <SubSection title="Paso 2 — Crear semanas">
          <Steps
            items={[
              'Con un módulo expandido, haz clic en <strong>+ Add Week</strong>',
              'Introduce el <strong>título de la semana (DE)</strong> y opcionalmente una breve descripción',
              'Opcionalmente agrega <strong>preguntas guía</strong> — preguntas orientadoras que aparecen en la sección de Reflexión diaria del aprendiz durante esta semana',
              'Opcionalmente configura <strong>categorías de seguimiento</strong> para esta semana — reemplazan los botones de seguimiento predeterminados del aprendiz',
              'Haz clic en <strong>AI Translate</strong> para generar la versión en inglés',
              'Haz clic en <strong>Save Week</strong>',
              'Repite el proceso para hasta 4 semanas',
              'Las semanas pueden reordenarse arrastrando el ícono de agarre a la izquierda',
            ]}
          />
          <Note>
            Las preguntas guía configuradas en una semana aparecen en la página de Reflexión del
            aprendiz durante toda la semana activa. Las categorías de seguimiento configuradas en
            una semana reemplazan las cuatro categorías predeterminadas (Nivel de estrés, Respiración,
            Cuerpo, Pensamientos) para esa semana.
          </Note>
        </SubSection>

        <SubSection title="Paso 3 — Agregar ejercicios a una semana">
          <Bullets
            items={[
              'El panel <strong>Exercise Library</strong> a la derecha lista todos tus ejercicios',
              'Usa la barra de búsqueda en la biblioteca para encontrar ejercicios rápidamente',
              'Arrastra un ejercicio desde la biblioteca y suéltalo en una semana — se agrega al final',
              'Reordena los ejercicios dentro de una semana arrastrando su ícono de agarre',
              'Haz clic en el <strong>botón Req / Opt</strong> para marcar un ejercicio como Obligatorio u Opcional',
              'Haz clic en el <strong>botón ×</strong> para quitar un ejercicio de una semana (permanece en la biblioteca)',
            ]}
          />
        </SubSection>

        <SubSection title="Paso 4 — Configurar el horario semanal">
          <p className="text-sm text-rdy-gray-500 mb-2">
            Cada fila de ejercicio muestra un selector compacto de 7 botones bajo el título. Controla
            en qué días de la semana se programa el ejercicio para los miembros de la clase.
          </p>
          <CodeBlock>{`L  M  X  J  V  S  D\n●  ●  ●  ○  ●  ○  ○   ← Lun, Mar, Mié, Vie únicamente`}</CodeBlock>
          <Bullets
            items={[
              '<strong>Relleno (naranja)</strong> — el ejercicio está programado ese día',
              '<strong>Vacío (gris)</strong> — el ejercicio se omite ese día',
              'Los 7 días rellenos = el ejercicio se realiza todos los días (por defecto)',
              'Haz clic en un día para activarlo o desactivarlo',
              'Los cambios se guardan automáticamente tras una breve pausa',
              'No puedes deseleccionar todos los días — al menos uno debe permanecer activo',
            ]}
          />
          <Tip>
            Combina los selectores de días creativamente: ejercicios de fuerza el lun/mié/vie,
            movilidad el mar/jue, ejercicios de reflexión el domingo.
          </Tip>
        </SubSection>

        <SubSection title="Pestañas Constructor y Vista previa">
          <p className="text-sm text-rdy-gray-500">
            Usa la pestaña <strong>Builder</strong> para editar la estructura del programa.
            Cambia a <strong>Preview</strong> para ver cómo aparecerá ante los aprendices — útil
            para una revisión final antes de generar los calendarios de clase. La vista previa
            muestra los ejercicios por semana, su estado obligatorio/opcional y las duraciones estimadas.
          </p>
        </SubSection>

        <SubSection title="Controles de expandir y colapsar">
          <p className="text-sm text-rdy-gray-500">
            Usa los botones <strong>Expand All</strong> y <strong>Collapse All</strong> en la
            parte superior del constructor para mostrar u ocultar rápidamente todos los módulos y
            semanas a la vez. Los módulos y semanas individuales se pueden expandir haciendo clic
            en su fila de encabezado.
          </p>
        </SubSection>

        <SubSection title="Traducir texto de semanas y módulos">
          <p className="text-sm text-rdy-gray-500">
            Haz clic en el botón <strong>Translate</strong> en cualquier tarjeta de semana o módulo
            para abrir un diálogo que muestra el texto fuente en alemán y la traducción al inglés
            generada por IA, lado a lado. Edita el texto en inglés directamente en el diálogo y
            luego haz clic en <strong>Save Translation</strong>.
          </p>
        </SubSection>
      </Section>

      {/* ── Clases ── */}
      <Section title="Clases">
        <Screenshot src="/help/admin-classes.png" alt="Clases" />
        <p className="text-sm text-rdy-gray-500 mb-4">
          Una clase es un grupo de aprendices que siguen el mismo plan de estudios, guiados por
          un mentor durante un número fijo de meses. Todo — la generación del calendario, las
          sesiones grupales y las reservas individuales — está vinculado a una clase.
        </p>

        <SubSection title="Crear una clase">
          <Steps
            items={[
              'Haz clic en <strong>Add Class</strong> en la esquina superior derecha',
              'Introduce el <strong>nombre de la clase</strong> (p. ej. "Grupo Primavera 2026")',
              'Elige un <strong>mentor</strong> del menú desplegable (puedes asignarte a ti mismo)',
              'Define la <strong>duración</strong> en meses',
              'Establece la <strong>fecha de inicio</strong> — la fecha de fin se calcula automáticamente',
              'Configura los <strong>ajustes de sesión</strong>: duración de cada sesión y con cuántos días de antelación pueden reservar los aprendices',
              '<strong>Programa (opcional):</strong> asigna un módulo a cada mes directamente. Puedes omitir esto y asignarlo después.',
              'Haz clic en <strong>Create Class</strong>',
            ]}
          />
        </SubSection>

        <SubSection title="Gestionar el programa después de la creación">
          <Steps
            items={[
              'Abre la clase haciendo clic en su fila',
              'Ve a la pestaña <strong>Program</strong>',
              'Para cada mes, abre el menú desplegable y selecciona un módulo',
              'La asignación se guarda de inmediato',
              'Puedes cambiar o reasignar cualquier mes en cualquier momento',
            ]}
          />
          <Note>
            Cambiar el programa después de que se haya generado el calendario requiere hacer clic
            en <strong>Generate Schedule</strong> nuevamente para aplicar los cambios.
          </Note>
        </SubSection>

        <SubSection title="Generar el calendario de ejercicios">
          <p className="text-sm text-rdy-gray-500 mb-2">
            Una vez asignado el programa y con los aprendices inscritos, genera el calendario
            completo de ejercicios con un solo clic.
          </p>
          <Steps
            items={[
              'Abre la clase → pestaña <strong>Program</strong>',
              'Verifica que todos los meses tengan un módulo asignado',
              'Haz clic en <strong>Generate Schedule for All Members</strong>',
              'El sistema calcula una entrada de ejercicio por miembro, por ejercicio y por día programado, para toda la duración de la clase',
              'Aparece una confirmación con el número de ejercicios programados',
            ]}
          />
          <Bullets
            items={[
              'Volver a ejecutar el botón elimina el calendario anterior y crea uno nuevo — es seguro ejecutarlo después de cambios en el programa',
              'Los ejercicios aparecen en el calendario del aprendiz inmediatamente después de la generación',
              'El calendario respeta el selector de días de la semana configurado en el constructor del programa',
              'La duración del módulo es configurable — el calendario usa el número de días de ejercicio configurado',
            ]}
          />
          <Note>
            El sistema usa la <strong>duración del módulo</strong> (configurable en el Constructor
            del Programa, por defecto 28 días de ejercicio) a partir de la fecha de inicio de la
            clase, por lo que las semanas son siempre predecibles sin importar la duración del mes calendario.
          </Note>
        </SubSection>

        <SubSection title="Agregar aprendices a una clase">
          <Steps
            items={[
              'Abre la clase → pestaña <strong>Members</strong>',
              'Haz clic en <strong>Add Mentee</strong>',
              'Busca por nombre o correo electrónico',
              'Haz clic en el aprendiz para agregarlo',
              'Después de agregar nuevos miembros, haz clic en <strong>Generate Schedule</strong> nuevamente para que los nuevos aprendices reciban su plan de ejercicios',
            ]}
          />
        </SubSection>

        <SubSection title="Pestañas del detalle de clase">
          <div className="overflow-x-auto">
            <table className="text-sm w-full border-collapse">
              <thead>
                <tr className="border-b border-rdy-gray-200">
                  <th className="text-left py-2 pr-6 font-semibold text-rdy-black">Pestaña</th>
                  <th className="text-left py-2 font-semibold text-rdy-black">Contenido</th>
                </tr>
              </thead>
              <tbody className="text-rdy-gray-500">
                <tr className="border-b border-rdy-gray-100">
                  <td className="py-2 pr-6 font-medium">Overview</td>
                  <td>Información de la clase, mentor, fechas y configuración de sesiones</td>
                </tr>
                <tr className="border-b border-rdy-gray-100">
                  <td className="py-2 pr-6 font-medium">Members</td>
                  <td>Aprendices inscritos, estadísticas de avance, agregar o eliminar miembros</td>
                </tr>
                <tr className="border-b border-rdy-gray-100">
                  <td className="py-2 pr-6 font-medium">Program</td>
                  <td>Asignación de módulos por mes y botón para generar el calendario</td>
                </tr>
                <tr>
                  <td className="py-2 pr-6 font-medium">Sessions</td>
                  <td>Todas las sesiones grupales vinculadas a esta clase</td>
                </tr>
              </tbody>
            </table>
          </div>
        </SubSection>
      </Section>

      {/* ── Usuarios ── */}
      <Section title="Usuarios">
        <Screenshot src="/help/admin-users.png" alt="Gestión de usuarios" />
        <p className="text-sm text-rdy-gray-500 mb-3">
          La página de usuarios lista todas las cuentas de tu plataforma — administradores,
          mentores y aprendices.
        </p>
        <Bullets
          items={[
            'Ve el <strong>rol</strong>, el <strong>correo electrónico</strong> y el <strong>estado de activación</strong> de cada usuario',
            'Consulta a qué clase pertenece un aprendiz',
            'Haz clic en la fila de un usuario para abrir su vista detallada',
            '<strong>Desactivar</strong> una cuenta impide el acceso sin eliminar al usuario (todos los datos se conservan)',
            '<strong>Reactivar</strong> la cuenta en cualquier momento',
            'Las cuentas de usuario se crean a través del flujo de Invitaciones — no directamente desde esta página',
          ]}
        />
        <Note>
          Las identidades de usuario (correo electrónico, contraseña) se gestionan en Keycloak.
          La página de Usuarios de RDY muestra el perfil a nivel de aplicación. Para restablecer
          una contraseña, pide al usuario que use el flujo de <em>¿Olvidaste tu contraseña?</em>{' '}
          en la página de inicio de sesión, o contacta con el administrador del sistema.
        </Note>
      </Section>

      {/* ── Invitaciones ── */}
      <Section title="Invitaciones">
        <Screenshot src="/help/admin-invitations.png" alt="Invitaciones" />
        <p className="text-sm text-rdy-gray-500 mb-3">
          Invita a nuevos usuarios a tu plataforma generando un enlace de registro seguro. Copias
          el enlace y lo compartes manualmente — por correo electrónico, aplicación de mensajería
          u otro canal que prefieras. El sistema no envía correos automáticos.
        </p>

        <SubSection title="Crear una invitación">
          <Steps
            items={[
              'Haz clic en <strong>Invite User</strong> en la esquina superior derecha',
              'Introduce la <strong>dirección de correo electrónico</strong> del destinatario',
              'Elige su <strong>rol</strong>: Mentor o Aprendiz',
              'Elige por cuánto tiempo permanece válido el enlace: 1, 3, 7, 14 o 30 días',
              'Haz clic en <strong>Send Invitation</strong> — se genera un enlace de registro único y la invitación aparece en la lista',
            ]}
          />
          <Tip>
            Después de crear la invitación, abre el menú <strong>Actions</strong> en la fila de
            la invitación para copiar el enlace y compartirlo con el nuevo usuario.
          </Tip>
        </SubSection>

        <SubSection title="Estados de las invitaciones">
          <div className="overflow-x-auto">
            <table className="text-sm w-full border-collapse">
              <thead>
                <tr className="border-b border-rdy-gray-200">
                  <th className="text-left py-2 pr-6 font-semibold text-rdy-black">Estado</th>
                  <th className="text-left py-2 font-semibold text-rdy-black">Significado</th>
                </tr>
              </thead>
              <tbody className="text-rdy-gray-500">
                <tr className="border-b border-rdy-gray-100">
                  <td className="py-2 pr-6 font-medium">Pendiente</td>
                  <td>Generada pero aún no aceptada por el destinatario</td>
                </tr>
                <tr className="border-b border-rdy-gray-100">
                  <td className="py-2 pr-6 font-medium">Aceptada</td>
                  <td>El destinatario se registró y la cuenta está activa</td>
                </tr>
                <tr className="border-b border-rdy-gray-100">
                  <td className="py-2 pr-6 font-medium">Expirada</td>
                  <td>El período de validez venció antes de que se usara el enlace</td>
                </tr>
                <tr>
                  <td className="py-2 pr-6 font-medium">Revocada</td>
                  <td>Cancelada manualmente — el enlace es permanentemente inválido</td>
                </tr>
              </tbody>
            </table>
          </div>
        </SubSection>

        <SubSection title="Gestionar invitaciones existentes">
          <Bullets
            items={[
              'Haz clic en <strong>Actions</strong> en una invitación pendiente o expirada para abrir el menú de acciones',
              '<strong>Resend</strong> — genera un nuevo enlace y extiende la fecha de expiración 7 días (disponible para invitaciones pendientes y expiradas)',
              '<strong>Revoke</strong> — cancela permanentemente una invitación pendiente para que el enlace ya no pueda usarse',
              'Usa el <strong>filtro de estado</strong> y la <strong>búsqueda</strong> para encontrar invitaciones específicas en listas grandes',
              'Ordena la tabla por fecha de creación, vencimiento, correo, rol o estado usando los controles de ordenación',
            ]}
          />
        </SubSection>
      </Section>

      {/* ── Analíticas ── */}
      <Section title="Analíticas">
        <Screenshot src="/help/admin-analytics.png" alt="Analíticas" />
        <p className="text-sm text-rdy-gray-500 mb-3">
          La página de Analíticas te ofrece una visión global del nivel de participación en
          todas las clases y usuarios.
        </p>
        <Bullets
          items={[
            '<strong>Tasa de completación de ejercicios</strong> — porcentaje de ejercicios programados completados por todos los aprendices',
            '<strong>Aprendices activos</strong> — cuántos aprendices iniciaron sesión o completaron un ejercicio recientemente',
            '<strong>Asistencia a sesiones</strong> — tasas de participación en sesiones grupales e individuales',
            'Usa el <strong>selector de rango de fechas</strong> para enfocarte en un período específico',
            'Usa el <strong>filtro de clase</strong> para aislar las métricas de un grupo',
          ]}
        />
      </Section>

      {/* ── Configuración de IA ── */}
      <Section title="Configuración de IA">
        <Screenshot src="/help/admin-ai-settings.png" alt="Configuración de IA" />
        <p className="text-sm text-rdy-gray-500 mb-3">
          Configura el proveedor de IA que impulsa la traducción de ejercicios, la generación
          de contenido y la transcripción de notas de voz.
        </p>
        <Steps
          items={[
            'Elige tu <strong>proveedor predeterminado</strong>: Anthropic Claude o Google Gemini',
            'Pega tu <strong>clave de API</strong> en el campo de entrada',
            'Haz clic en <strong>Test Connection</strong> para verificar que la clave sea válida',
            'Haz clic en <strong>Save</strong>',
            'Activa el interruptor <strong>AI Enabled</strong> — las funciones de IA quedan activas en toda la plataforma',
          ]}
        />
        <div className="mt-4 overflow-x-auto">
          <table className="text-sm w-full border-collapse">
            <thead>
              <tr className="border-b border-rdy-gray-200">
                <th className="text-left py-2 pr-6 font-semibold text-rdy-black">Función</th>
                <th className="text-left py-2 font-semibold text-rdy-black">Se usa para</th>
              </tr>
            </thead>
            <tbody className="text-rdy-gray-500">
              <tr className="border-b border-rdy-gray-100">
                <td className="py-2 pr-6">Traducción (ejercicios, semanas, módulo)</td>
                <td>Generar contenido en inglés a partir del texto fuente en alemán</td>
              </tr>
              <tr className="border-b border-rdy-gray-100">
                <td className="py-2 pr-6">Generación de contenido (origen, objetivo)</td>
                <td>Crear descripciones de origen y objetivo del módulo a partir del título</td>
              </tr>
              <tr className="border-b border-rdy-gray-100">
                <td className="py-2 pr-6">Transcripción de voz (notas de diario)</td>
                <td>Convertir grabaciones de voz de mentores y aprendices en texto</td>
              </tr>
              <tr>
                <td className="py-2 pr-6">Retroalimentación semanal motivacional</td>
                <td>Resumen semanal generado por IA y mostrado a los aprendices</td>
              </tr>
            </tbody>
          </table>
        </div>
        <Note>
          Las claves de API se almacenan cifradas en la base de datos usando cifrado AES-256-GCM.
          Nunca se exponen en la interfaz después de guardarse.
        </Note>
      </Section>

      {/* ── Prompts de IA ── */}
      <Section title="Prompts de IA">
        <Screenshot src="/help/admin-ai-prompts.png" alt="Prompts de IA" />
        <p className="text-sm text-rdy-gray-500 mb-3">
          Los prompts de IA son las plantillas que usa el sistema al llamar a la IA. Puedes
          personalizarlos para que coincidan con el tono y la terminología de tu organización.
        </p>
        <div className="overflow-x-auto">
          <table className="text-sm w-full border-collapse">
            <thead>
              <tr className="border-b border-rdy-gray-200">
                <th className="text-left py-2 pr-6 font-semibold text-rdy-black">Prompt</th>
                <th className="text-left py-2 font-semibold text-rdy-black">Qué controla</th>
              </tr>
            </thead>
            <tbody className="text-rdy-gray-500">
              <tr className="border-b border-rdy-gray-100">
                <td className="py-2 pr-6 font-medium">Traducción</td>
                <td>Cómo la IA traduce el contenido alemán al inglés</td>
              </tr>
              <tr className="border-b border-rdy-gray-100">
                <td className="py-2 pr-6 font-medium">Generación de origen</td>
                <td>La descripción de contexto/origen de un módulo</td>
              </tr>
              <tr className="border-b border-rdy-gray-100">
                <td className="py-2 pr-6 font-medium">Generación de objetivo</td>
                <td>La descripción de la meta/objetivo de un módulo</td>
              </tr>
              <tr className="border-b border-rdy-gray-100">
                <td className="py-2 pr-6 font-medium">Transcripción</td>
                <td>Cómo se convierten las grabaciones de voz en texto</td>
              </tr>
              <tr>
                <td className="py-2 pr-6 font-medium">Retroalimentación semanal</td>
                <td>El resumen semanal motivacional generado para cada aprendiz</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <Steps
            items={[
              'Haz clic en <strong>Edit</strong> en cualquier prompt configurable',
              'Modifica la plantilla — conserva las <strong>variables de marcador de posición</strong> requeridas que se muestran en la descripción (p. ej. <code>{title}</code>)',
              'Haz clic en <strong>Save Prompt</strong>',
            ]}
          />
        </div>
        <p className="text-sm text-rdy-gray-500 mt-3">
          La etiqueta muestra <strong>Default</strong> (texto predeterminado) o{' '}
          <strong>Custom</strong> (tu versión editada). Haz clic en{' '}
          <strong>Reset to Default</strong> en cualquier momento para revertir los cambios.
        </p>
      </Section>
    </>
  );
}

// ─── MENTOR HELP — ESPAÑOL ───────────────────────────────────────────────────

function MentorHelpES() {
  return (
    <>
      <p className="text-sm text-rdy-gray-500 mb-8">
        Como mentor acompañas a tus aprendices en su proceso de desarrollo personal. Diriges
        sesiones grupales, haces seguimiento del progreso individual y puedes acceder a los
        datos de reflexión de los aprendices para brindar un apoyo más personalizado.
      </p>

      {/* ── Inicio ── */}
      <Section title="Inicio del mentor">
        <Screenshot src="/help/mentor-home.png" alt="Inicio del mentor" />
        <p className="text-sm text-rdy-gray-500 mb-3">
          Tu pantalla de inicio te da un resumen rápido de lo que ocurre hoy y esta semana.
        </p>
        <Bullets
          items={[
            '<strong>Sesiones de hoy</strong> — sesiones grupales y reservas individuales programadas para hoy',
            '<strong>Tus clases</strong> — una tarjeta resumen por cada clase que diriges, con el número de aprendices y el módulo actual',
            '<strong>Próximas sesiones</strong> — las siguientes sesiones grupales e individuales en todas tus clases',
            '<strong>Actividad reciente</strong> — accesos directos a detalles de clases, sesiones grupales y analíticas',
          ]}
        />
      </Section>

      {/* ── Clases ── */}
      <Section title="Clases">
        <Screenshot src="/help/mentor-classes.png" alt="Clases del mentor" />
        <p className="text-sm text-rdy-gray-500 mb-3">
          Tus clases son los grupos de aprendices que guías. Haz clic en cualquier tarjeta
          de clase para abrir la vista detallada.
        </p>

        <SubSection title="Resumen de clase">
          <Bullets
            items={[
              'Ve todos los aprendices inscritos y su <strong>tasa de completación de ejercicios</strong> global',
              'Consulta en qué mes del plan de estudios se encuentra actualmente la clase',
              'Ve la lista de próximas sesiones grupales de esta clase',
            ]}
          />
        </SubSection>

        <SubSection title="Detalle individual de aprendiz">
          <Steps
            items={[
              'Haz clic en el nombre de un aprendiz en la lista de miembros de la clase',
              'Ve su historial de <strong>completación de ejercicios</strong> — qué ejercicios realizó, omitió o tiene pendientes',
              'Consulta su <strong>actividad de diario y reflexión</strong> (si el aprendiz tiene el compartir activado)',
              'Ve su registro de <strong>asistencia a sesiones</strong> grupales',
              'Revisa su <strong>historial de reservas individuales</strong>',
              'Consulta las <strong>Hojas de Reflexión</strong> enviadas y proporciona retroalimentación',
            ]}
          />
        </SubSection>

        <SubSection title="Ver las entradas de diario de un aprendiz">
          <p className="text-sm text-rdy-gray-500">
            Desde la vista detallada del aprendiz, ve a la pestaña <strong>Diary</strong> para
            leer las entradas en modo de solo lectura. Las grabaciones de voz se pueden reproducir
            y la transcripción de IA aparece debajo de cada entrada.
          </p>
          <Note>
            Los aprendices controlan el compartir el diario en sus Ajustes (página Weekly Summary).
            Si el compartir está desactivado, las entradas del diario no aparecerán en tu vista.
          </Note>
        </SubSection>

        <SubSection title="Hoja de Reflexión — Dar retroalimentación">
          <p className="text-sm text-rdy-gray-500 mb-2">
            Cuando un aprendiz ha enviado su Hoja de Reflexión para un módulo, puedes darle
            retroalimentación escrita. Esta aparece directamente en la página de Hoja de Reflexión
            del aprendiz.
          </p>
          <Steps
            items={[
              'Abre al aprendiz en la vista detallada',
              'Ve a la pestaña <strong>Reflections</strong>',
              'Verás todas las hojas enviadas, ordenadas por módulo',
              'Lee las respuestas del aprendiz',
              'Haz clic en <strong>Dar retroalimentación</strong> y escribe tu comentario',
              'Haz clic en <strong>Guardar</strong> — el aprendiz verá la retroalimentación en su página de Hoja de Reflexión',
            ]}
          />
        </SubSection>
      </Section>

      {/* ── Sesiones grupales ── */}
      <Section title="Sesiones grupales">
        <Screenshot src="/help/mentor-group-sessions.png" alt="Sesiones grupales" />
        <p className="text-sm text-rdy-gray-500 mb-3">
          Las sesiones grupales son reuniones en vivo con todos los aprendices de una clase.
          Puedes gestionar todo el ciclo — programación, desarrollo y documentación — dentro de RDY.
        </p>

        <SubSection title="Crear una sesión">
          <Steps
            items={[
              'Ve a <strong>Group Sessions</strong> en el menú lateral',
              'Haz clic en <strong>+ New Session</strong>',
              'Selecciona la <strong>clase</strong> para la que es esta sesión',
              'Establece la <strong>fecha</strong> y la <strong>hora de inicio</strong>',
              'Establece la <strong>duración</strong> en minutos',
              'Agrega un <strong>título</strong> (p. ej. "Seguimiento semana 3") y una descripción opcional',
              'Haz clic en <strong>Save</strong>',
            ]}
          />
        </SubSection>

        <SubSection title="Abrir la página de detalle de una sesión">
          <Steps
            items={[
              'Haz clic en cualquier sesión de la lista para abrir su página de detalle',
              'La página muestra la información de la sesión, la lista de asistencia y el área de notas',
            ]}
          />
        </SubSection>

        <SubSection title="Durante la sesión — asistencia">
          <Bullets
            items={[
              'La <strong>lista de asistencia</strong> muestra todos los aprendices inscritos',
              'Marca a cada aprendiz como <strong>Presente</strong> o déjalo sin marcar para indicar ausencia',
              'La asistencia se guarda de inmediato — no es necesario enviar',
            ]}
          />
        </SubSection>

        <SubSection title="Durante la sesión — notas y grabación de voz">
          <Steps
            items={[
              'Usa el <strong>área de texto</strong> para escribir notas o un resumen de la sesión',
              'Haz clic en el <strong>botón de micrófono</strong> para grabar una nota de voz',
              'Elige tu micrófono en el menú desplegable si hay más de uno conectado',
              'Haz clic en <strong>Start Recording</strong> — habla tus notas',
              'Haz clic en <strong>Stop</strong> cuando termines — la IA transcribe la grabación automáticamente',
              'La transcripción se agrega al área de notas donde puedes editarla',
              'Haz clic en <strong>Save Notes</strong>',
            ]}
          />
          <Tip>
            Las notas de voz son ideales para capturar la energía y los momentos clave de una
            sesión sin necesidad de escribir durante la reunión. Las transcripciones aparecen
            en cuestión de segundos.
          </Tip>
        </SubSection>
      </Section>

      {/* ── Calendario ── */}
      <Section title="Calendario">
        <Screenshot src="/help/mentor-calendar.png" alt="Calendario del mentor" />
        <p className="text-sm text-rdy-gray-500 mb-3">
          Tu calendario muestra tu agenda completa: reservas individuales de aprendices y tus
          franjas de disponibilidad. Navega mes a mes para ver las próximas citas.
        </p>
        <Bullets
          items={[
            'Los días con franjas de disponibilidad o reservas aparecen destacados en el calendario',
            'Haz clic en un día para ver todas las sesiones y franjas de esa fecha',
            'Las sesiones individuales confirmadas muestran el nombre del aprendiz, la hora y la duración',
            'Las franjas disponibles muestran la ventana de tiempo en la que los aprendices aún pueden reservar',
            'Solo las fechas futuras están activas — las fechas pasadas no son reservables',
            'Usa las flechas de navegación mensual para moverte entre meses',
          ]}
        />
        <Note>
          La vista del calendario del mentor está enfocada en la disponibilidad y las reservas
          individuales. La programación de sesiones grupales se gestiona desde la página de{' '}
          <strong>Group Sessions</strong>.
        </Note>
      </Section>

      {/* ── Disponibilidad ── */}
      <Section title="Disponibilidad">
        <Screenshot src="/help/mentor-availability.png" alt="Disponibilidad del mentor" />
        <p className="text-sm text-rdy-gray-500 mb-3">
          Configura tu disponibilidad para que los aprendices puedan reservar sesiones individuales
          en los horarios que tengas libres. La página muestra dos contadores:{' '}
          <strong>Franjas únicas</strong> y <strong>Franjas recurrentes</strong>.
        </p>

        <SubSection title="Agregar una franja">
          <Steps
            items={[
              'Ve a <strong>Availability</strong> en el menú lateral',
              'Haz clic en <strong>+ Add Slot</strong> para agregar una franja única',
              'O haz clic en <strong>Bulk Add</strong> para crear varias franjas a la vez',
              'Establece la <strong>fecha</strong>, la <strong>hora de inicio</strong> y la <strong>hora de fin</strong>',
              'Elige si la franja es <strong>única</strong> o <strong>semanal recurrente</strong>',
              'Guarda — la franja aparece en la lista y en tu calendario',
            ]}
          />
        </SubSection>

        <Bullets
          items={[
            'Las próximas franjas se listan cronológicamente debajo de los botones de agregar',
            'Haz clic en cualquier fila de franja para <strong>editarla</strong> o <strong>eliminarla</strong>',
            'Las franjas ya reservadas se bloquean automáticamente para nuevas reservas',
            'Las franjas recurrentes se repiten semanalmente el mismo día y hora hasta que se eliminen',
          ]}
        />
        <Tip>
          Usa <strong>Bulk Add</strong> al inicio de un nuevo período para crear franjas semanales
          recurrentes de una sola vez — ahorra tiempo y evita reservas duplicadas.
        </Tip>
      </Section>

      {/* ── Analíticas ── */}
      <Section title="Analíticas">
        <Screenshot src="/help/mentor-analytics.png" alt="Analíticas del mentor" />
        <p className="text-sm text-rdy-gray-500 mb-3">
          Haz seguimiento del progreso y la participación de tus aprendices a lo largo del tiempo.
        </p>
        <Bullets
          items={[
            '<strong>Tasa de completación de ejercicios</strong> — por aprendiz y como promedio de clase',
            '<strong>Asistencia a sesiones</strong> — quién asistió a cada sesión grupal',
            'Usa el <strong>selector de aprendiz</strong> para profundizar en los datos de una persona',
            'Usa el <strong>selector de rango de fechas</strong> para enfocarte en un período específico',
          ]}
        />
      </Section>

      {/* ── Datos de seguimiento de aprendices ── */}
      <Section title="Datos de seguimiento de aprendices">
        <p className="text-sm text-rdy-gray-500 mb-3">
          Para cada aprendiz puedes consultar sus datos de seguimiento. Los datos muestran con
          qué frecuencia el aprendiz ha registrado sus temas de seguimiento en el día a día,
          como una serie temporal con marcas de hora.
        </p>
        <Steps
          items={[
            'Abre una clase y selecciona un aprendiz',
            'Ve a la pestaña <strong>Tracking</strong> en el detalle del aprendiz',
            'Verás todas las entradas registradas por categoría con marca de hora',
            'Usa estos datos como base para la conversación en la sesión individual',
          ]}
        />
        <Note>
          Las categorías de seguimiento pueden configurarse por semana en el Constructor del
          Programa RDY. Las categorías predeterminadas son: Nivel de estrés, Respiración,
          Cuerpo, Pensamientos.
        </Note>
      </Section>

      {/* ── Perfil ── */}
      <Section title="Perfil">
        <Screenshot src="/help/mentor-profile.png" alt="Perfil del mentor" />
        <Bullets
          items={[
            'Tu <strong>nombre</strong> y <strong>correo electrónico</strong> se muestran desde tu cuenta',
            'Se muestran tus <strong>roles</strong> (p. ej. "mentor, admin")',
            'Haz clic en <strong>Sign Out</strong> para cerrar sesión',
          ]}
        />
        <Note>
          La información del perfil se gestiona a través de tu cuenta Keycloak. Contacta con
          el administrador del sistema para cambiar tu nombre o dirección de correo electrónico.
        </Note>
      </Section>
    </>
  );
}

// ─── MENTEE HELP — ESPAÑOL ───────────────────────────────────────────────────

function MenteeHelpES() {
  return (
    <>
      <p className="text-sm text-rdy-gray-500 mb-8">
        Bienvenido a RDY. Aquí encontrarás todo lo que necesitas: tus ejercicios diarios,
        el seguimiento, tus notas diarias, la Hoja de Reflexión y la reserva de tus sesiones
        individuales. La app es tu compañera diaria a lo largo del Programa RDY Masterclass.
      </p>

      {/* ── Hoy ── */}
      <Section title="Hoy — Tu inicio del día">
        <Screenshot src="/help/mentee-home.png" alt="Hoy — Vista diaria" />
        <p className="text-sm text-rdy-gray-500 mb-3">
          Cuando abres la app, siempre ves el <strong>día de hoy</strong> con tus ejercicios
          pendientes. La vista muestra únicamente el día actual — para que puedas enfocarte
          totalmente en el presente.
        </p>
        <Bullets
          items={[
            'Toca un ejercicio para iniciarlo (video, audio o texto)',
            'Los ejercicios completados aparecen en gris',
            'En los días de descanso verás un mensaje de descanso con un símbolo de hoja',
            'El símbolo de reloj a la derecha de cada ejercicio te permite reprogramarlo a una hora diferente de hoy',
            'Un banner naranja te recuerda si aún no has reservado tu sesión individual en el módulo actual',
            'Otro banner te avisa cuando tienes un RDY Check-In pendiente',
          ]}
        />
        <Tip>
          Toca el <strong>símbolo de reloj</strong> junto a un ejercicio para reprogramarlo a
          otra hora del día. Así puedes adaptar tus ejercicios de manera flexible a tu rutina.
        </Tip>
      </Section>

      {/* ── Ejercicios ── */}
      <Section title="Ejercicios — Detalles">
        <Screenshot src="/help/mentee-exercises.png" alt="Detalle de ejercicio" />
        <p className="text-sm text-rdy-gray-500 mb-3">
          Cada ejercicio abre una página de detalle donde lo realizas y lo marcas como completado.
        </p>
        <Bullets
          items={[
            '<strong>Ejercicios de video</strong>: el reproductor de video integrado se inicia directamente en la app',
            '<strong>Ejercicios de audio</strong>: un reproductor con Play/Pausa e indicador de progreso',
            '<strong>Ejercicios de texto</strong>: texto con formato para leer — desplázate por el contenido',
            'Toca <strong>Completar / Mark as Done</strong> cuando termines',
            'El ejercicio se marca como completado en tu vista del día',
          ]}
        />
        <Note>
          Los ejercicios son <strong>obligatorios</strong> u <strong>opcionales</strong> — tu
          mentor y administrador lo definen en el programa. Todos los ejercicios aparecen en tu
          vista diaria, independientemente de su estado.
        </Note>
      </Section>

      {/* ── Calendario ── */}
      <Section title="Calendario — Visión general del programa">
        <Screenshot src="/help/mentee-calendar.png" alt="Calendario — Línea de tiempo del programa" />
        <p className="text-sm text-rdy-gray-500 mb-3">
          La vista de Calendario te muestra el <strong>recorrido completo del Programa RDY Masterclass</strong>{' '}
          como una línea de tiempo con todos los módulos y tu progreso:
        </p>
        <Bullets
          items={[
            '<strong>BASICS</strong> — tu primera sección con los ejercicios fundamentales',
            '<strong>MÓDULO 1–5</strong> — cada módulo con varias semanas de ejercicios hasta el próximo encuentro presencial',
            '<strong>END TALK</strong> — tu cierre del programa',
            'Tu módulo actual está <strong>resaltado en naranja</strong>',
            'Los módulos pasados aparecen más oscuros, los futuros más claros',
            'Toca un módulo para ver las semanas y ejercicios que contiene',
          ]}
        />
        <Tip>
          En la línea de tiempo también verás las sesiones individuales reservadas y las sesiones
          grupales asignadas a tu clase.
        </Tip>
      </Section>

      {/* ── Reflexión ── */}
      <Section title="Reflexión — Seguimiento + Notas diarias">
        <Screenshot src="/help/mentee-diary.png" alt="Reflexión — Seguimiento y notas diarias" />
        <p className="text-sm text-rdy-gray-500 mb-3">
          En la página de Reflexión (que aparece como <strong>Reflexión</strong> en el menú)
          encontrarás el <strong>seguimiento y las notas diarias combinados</strong>. Esta página
          es tu herramienta diaria de observación sobre los temas del módulo actual.
        </p>

        <SubSection title="Seguimiento">
          <p className="text-sm text-rdy-gray-500 mb-2">
            Tu mentor o administrador define los temas que debes observar en tu día a día
            (por defecto: Nivel de estrés, Respiración, Cuerpo, Pensamientos). Cada vez que
            notes uno de estos temas, simplemente toca el botón correspondiente.
          </p>
          <Bullets
            items={[
              'Un toque = una entrada con la hora actual',
              'Puedes tocar varias veces al día — cada toque se guarda con su hora',
              'Bajo los botones verás una <strong>línea de tiempo</strong> con todas las entradas de hoy',
              'Toca el <strong>símbolo ×</strong> junto a una entrada para eliminarla',
              'Tu mentor puede ver estos datos e identificar patrones',
              'Las categorías de seguimiento pueden ajustarse por semana por el administrador o mentor',
            ]}
          />
        </SubSection>

        <SubSection title="Preguntas guía de la semana">
          <p className="text-sm text-rdy-gray-500 mb-2">
            Si tu mentor o administrador ha configurado preguntas guía para la semana actual,
            aparecerán en un recuadro naranja encima del campo de notas. Úsalas como inspiración
            para tus notas diarias.
          </p>
        </SubSection>

        <SubSection title="Notas diarias (Reflexión)">
          <p className="text-sm text-rdy-gray-500 mb-2">
            Debajo del área de seguimiento encontrarás un campo de texto para tus notas diarias.
            Estas son <strong>privadas</strong> — nadie las lee excepto tú.
          </p>
          <Bullets
            items={[
              'Escribe en el campo de texto o toca el <strong>símbolo de micrófono</strong> para una grabación de voz',
              'Las grabaciones de voz se transcriben automáticamente y se agregan a tu texto',
              'Las notas se guardan automáticamente cuando sales del campo de texto',
              'Puedes escribir nuevas notas cada día — cada nota está asociada a una fecha',
            ]}
          />
          <Note>
            Las notas diarias (Diario) son completamente privadas y no se comparten con tu mentor
            a menos que actives la función de compartir en el Resumen Semanal.
          </Note>
        </SubSection>
      </Section>

      {/* ── Hoja de Reflexión ── */}
      <Section title="Hoja de Reflexión — Cierre de módulo">
        <Screenshot src="/help/mentee-reflection.png" alt="Hoja de Reflexión" />
        <p className="text-sm text-rdy-gray-500 mb-3">
          Al final de cada módulo respondes preguntas sobre tu desarrollo durante ese módulo.
          La Hoja de Reflexión es accesible desde la línea de tiempo del programa o directamente
          desde el menú. A diferencia de las notas diarias, la Hoja de Reflexión{' '}
          <strong>no es privada</strong> — tu mentor verá tus respuestas.
        </p>
        <Steps
          items={[
            'Abre la Hoja de Reflexión desde la línea de tiempo del programa o el menú',
            'Responde todas las preguntas sobre tu módulo actual',
            'Tu borrador se guarda automáticamente cuando sales de un campo de texto',
            'Cuando estés listo, toca <strong>Enviar</strong>',
            'Tras el envío verás una confirmación — tu mentor tendrá acceso a tus respuestas',
            'Tu mentor te dará retroalimentación escrita — aparecerá directamente bajo tus respuestas',
          ]}
        />
        <Bullets
          items={[
            'Las preguntas las configura el administrador o el mentor por módulo',
            'Las preguntas estándar abordan aprendizajes, ejercicios útiles, desafíos y objetivos',
            'Una vez enviada, no puedes editar la hoja',
            'La retroalimentación de tu mentor aparece en una sección propia bajo tus respuestas',
          ]}
        />
        <Tip>
          Escribe tu Hoja de Reflexión cerca del cierre del módulo — así las experiencias aún
          están frescas y tus respuestas serán más auténticas.
        </Tip>
      </Section>

      {/* ── Resumen Semanal ── */}
      <Section title="Resumen Semanal">
        <Screenshot src="/help/mentee-weekly-summary.png" alt="Resumen Semanal" />
        <p className="text-sm text-rdy-gray-500 mb-3">
          El Resumen Semanal te da una <strong>visión general de tu semana</strong> — tu actividad
          de ejercicios, datos de seguimiento, entradas del diario y una retroalimentación personal
          generada por IA.
        </p>
        <Bullets
          items={[
            '<strong>Tu retroalimentación semanal</strong> — una respuesta personal generada por IA en un recuadro naranja al inicio, basada en tu actividad de la semana',
            '<strong>Barómetro de estado de ánimo</strong> — tu equilibrio emocional de la semana, calculado a partir de tus entradas de seguimiento',
            '<strong>Completación de ejercicios</strong> — cuántos ejercicios completaste y cuáles',
            '<strong>Frecuencia de patrones</strong> — un gráfico de barras de tus categorías de seguimiento de la semana',
            '<strong>Momentos destacados del diario</strong> — resumen de tu actividad de notas',
            '<strong>Comparación semana a semana</strong> — cómo evolucionan tus indicadores a lo largo de las últimas semanas',
          ]}
        />

        <SubSection title="Navegación">
          <Bullets
            items={[
              'Toca los <strong>botones de flecha</strong> izquierda y derecha para navegar por semanas pasadas',
              'Toca el <strong>símbolo de calendario</strong> junto al nombre de la semana para saltar directamente a una semana',
              'La flecha derecha está desactivada para semanas futuras',
              'Toca <strong>Go to Current Week</strong> para volver rápidamente a la semana actual',
            ]}
          />
        </SubSection>

        <SubSection title="Compartir con el mentor">
          <p className="text-sm text-rdy-gray-500 mb-2">
            Con el interruptor <strong>Share with Mentor</strong> puedes dar a tu mentor acceso
            a tu Resumen Semanal.
          </p>
          <Bullets
            items={[
              'Interruptor <strong>activado</strong>: tu mentor puede ver los datos de tu semana',
              'Interruptor <strong>desactivado</strong>: el Resumen Semanal permanece visible solo para ti',
              'Puedes cambiar esta opción en cualquier momento',
            ]}
          />
        </SubSection>
        <Note>
          La retroalimentación de IA se genera automáticamente para la semana actual. Se crea a
          partir de tu actividad de ejercicios, entradas de seguimiento y notas del diario —
          formulada de manera personalizada y motivadora.
        </Note>
      </Section>

      {/* ── Reservas ── */}
      <Section title="Reservas — Agendar sesión individual">
        <Screenshot src="/help/mentee-booking.png" alt="Reservas" />
        <p className="text-sm text-rdy-gray-500 mb-3">
          En cada módulo reservas una sesión individual con tu mentor. La página de Reservas
          te muestra todos los horarios disponibles del mes.
        </p>

        <SubSection title="Reservar una sesión">
          <Steps
            items={[
              'Ve a <strong>Booking</strong> en el menú',
              'Navega en el calendario al mes deseado (con los botones de flecha)',
              'Los días con <strong>anillo naranja</strong> tienen franjas disponibles — toca uno de esos días',
              'Los días con <strong>fondo verde</strong> ya tienen sesiones reservadas',
              'Elige una franja libre de la lista bajo el calendario',
              'Un diálogo de confirmación te muestra la fecha, hora y mentor',
              'Opcionalmente agrega una <strong>nota para tu mentor</strong>',
              'Toca <strong>Confirm Booking</strong>',
            ]}
          />
        </SubSection>

        <SubSection title="Límite mensual">
          <p className="text-sm text-rdy-gray-500 mb-2">
            Una tarjeta naranja en la parte superior te muestra tu presupuesto mensual de reservas:
          </p>
          <Bullets
            items={[
              'La tarjeta muestra <strong>sesiones reservadas / límite mensual</strong> (p. ej. "1 / 2")',
              'Una barra de progreso visualiza tu uso',
              'Cuando se alcanza el límite, la tarjeta se vuelve roja y no puedes reservar nuevas sesiones',
              'El límite se restablece mensualmente',
            ]}
          />
        </SubSection>

        <SubSection title="Cancelar una sesión">
          <Bullets
            items={[
              'Toca un día con fondo verde para ver tu sesión reservada',
              'Toca <strong>Cancel</strong> junto a la reserva',
              'Confirma la cancelación en el diálogo',
              'La franja queda disponible nuevamente para reservas',
            ]}
          />
        </SubSection>

        <Note>
          Solo se pueden seleccionar <strong>fechas futuras</strong> — los días pasados están
          desactivados en el calendario. Si aún no has reservado una sesión en tu módulo actual,
          aparecerá un banner de recordatorio en la página de Hoy.
        </Note>
      </Section>

      {/* ── Perfil ── */}
      <Section title="Perfil">
        <Screenshot src="/help/mentee-profile.png" alt="Perfil del aprendiz" />
        <p className="text-sm text-rdy-gray-500 mb-3">
          El perfil muestra la información de tu cuenta personal.
        </p>
        <Bullets
          items={[
            '<strong>Nombre</strong> — tu nombre visible en el sistema RDY',
            '<strong>Correo electrónico</strong> — tu dirección de correo registrada',
            '<strong>Rol</strong> — muestra "mentee" (aprendiz)',
            '<strong>Clase y módulo</strong> — tu clase actual y el módulo del programa en curso',
            'Toca <strong>Sign Out</strong> para cerrar sesión',
          ]}
        />
      </Section>

      {/* ── Ajustes ── */}
      <Section title="Ajustes — Notificaciones push">
        <Screenshot src="/help/mentee-settings.png" alt="Ajustes" />
        <p className="text-sm text-rdy-gray-500 mb-3">
          En los Ajustes configuras cuándo y cómo la app te recuerda tus actividades.
        </p>

        <SubSection title="Activar las notificaciones push">
          <Steps
            items={[
              'Toca <strong>Enable Push Notifications</strong> — tu navegador pedirá permiso',
              'Confirma el permiso en el diálogo del navegador',
              'El estado cambia a "Active" — las notificaciones están ahora activas',
            ]}
          />
        </SubSection>

        <SubSection title="Tipos de notificación">
          <div className="overflow-x-auto">
            <table className="text-sm w-full border-collapse">
              <thead>
                <tr className="border-b border-rdy-gray-200">
                  <th className="text-left py-2 pr-6 font-semibold text-rdy-black">Tipo</th>
                  <th className="text-left py-2 font-semibold text-rdy-black">Cuándo</th>
                </tr>
              </thead>
              <tbody className="text-rdy-gray-500">
                <tr className="border-b border-rdy-gray-100">
                  <td className="py-2 pr-6 font-medium">Exercise Reminders</td>
                  <td>Recordatorio diario de tus ejercicios (tiempo de anticipación configurable en minutos)</td>
                </tr>
                <tr className="border-b border-rdy-gray-100">
                  <td className="py-2 pr-6 font-medium">Session Reminders</td>
                  <td>Recordatorio antes de tu sesión individual (tiempo de anticipación configurable)</td>
                </tr>
                <tr className="border-b border-rdy-gray-100">
                  <td className="py-2 pr-6 font-medium">Group Session Reminders</td>
                  <td>Recordatorio antes de las sesiones grupales de tu clase</td>
                </tr>
                <tr>
                  <td className="py-2 pr-6 font-medium">Morning Reminder</td>
                  <td>Recordatorio matutino opcional a una hora configurable</td>
                </tr>
              </tbody>
            </table>
          </div>
        </SubSection>

        <SubSection title="Sonido de notificación">
          <p className="text-sm text-rdy-gray-500">
            Elige entre varias variantes de campana Tingsha o{' '}
            <strong>Silent</strong> (solo visual, sin sonido). Toca{' '}
            <strong>Test Notification</strong> para probar el sonido.
          </p>
        </SubSection>
      </Section>

      {/* ── Instalar la app ── */}
      <Section title="Instalar la app">
        <p className="text-sm text-rdy-gray-500 mb-4">
          RDY es una Progressive Web App (PWA) — puedes instalarla en tu smartphone y usarla
          como una app nativa.
        </p>
        <SubSection title="Android (Chrome)">
          <Steps
            items={[
              'Abre RDY en <strong>Chrome</strong>',
              'Toca los tres puntos en la esquina superior derecha o busca <strong>Instalar app</strong> en el menú',
              'Confirma tocando <strong>Instalar</strong>',
              'RDY aparecerá en tu pantalla de inicio',
            ]}
          />
        </SubSection>
        <SubSection title="iPhone / iPad (Safari)">
          <Steps
            items={[
              'Abre RDY en <strong>Safari</strong> (no en Chrome ni Firefox)',
              'Toca el símbolo de <strong>Compartir</strong> (rectángulo con flecha hacia arriba) en la barra de direcciones inferior',
              'Desplázate en el menú Compartir y selecciona <strong>Agregar a pantalla de inicio</strong>',
              'Toca <strong>Agregar</strong>',
              'RDY aparecerá en tu pantalla de inicio como una app nativa',
            ]}
          />
        </SubSection>
        <Tip>
          Después de instalarla, RDY se abre sin la barra de dirección del navegador — se ve y
          se siente como una app real. Las notificaciones push funcionan de forma fiable en
          Android; en iPhone/iPad necesitas iOS 16.4 o superior.
        </Tip>
      </Section>
    </>
  );
}

// ─── LANGUAGE TOGGLE ─────────────────────────────────────────────────────────

function LangToggle({ lang, onLangChange }: { lang: 'en' | 'es'; onLangChange: (l: 'en' | 'es') => void }) {
  return (
    <div className="inline-flex rounded-lg border border-rdy-gray-200 overflow-hidden text-sm font-medium">
      <button
        onClick={() => onLangChange('en')}
        className={`px-4 py-1.5 transition-colors ${lang === 'en' ? 'bg-rdy-orange-500 text-white' : 'text-rdy-gray-500 hover:bg-rdy-gray-100'}`}
      >
        EN
      </button>
      <button
        onClick={() => onLangChange('es')}
        className={`px-4 py-1.5 transition-colors ${lang === 'es' ? 'bg-rdy-orange-500 text-white' : 'text-rdy-gray-500 hover:bg-rdy-gray-100'}`}
      >
        ES
      </button>
    </div>
  );
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────

export function HelpContent({
  role,
  lang = 'en',
  onLangChange,
}: {
  role: SidebarRole;
  lang?: 'en' | 'es';
  onLangChange?: (l: 'en' | 'es') => void;
}) {
  const titles: Record<SidebarRole, { en: string; es: string }> = {
    admin:  { en: 'Admin Guide',  es: 'Guía del Administrador' },
    mentor: { en: 'Mentor Guide', es: 'Guía del Mentor' },
    mentee: { en: 'Mentee Guide', es: 'Guía del Aprendiz' },
  };
  const subtitle = lang === 'es' ? 'Manual de Usuario' : 'User Manual';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-16 lg:pt-8 pb-8">
      <div className="flex items-start justify-between mb-2">
        <h1 className="text-3xl font-bold text-rdy-black">{titles[role][lang]}</h1>
        {onLangChange && <LangToggle lang={lang} onLangChange={onLangChange} />}
      </div>
      <p className="text-sm text-rdy-gray-400 mb-10 uppercase tracking-wide">{subtitle}</p>
      {lang === 'es' ? (
        <>
          {role === 'admin'  && <AdminHelpES />}
          {role === 'mentor' && <MentorHelpES />}
          {role === 'mentee' && <MenteeHelpES />}
        </>
      ) : (
        <>
          {role === 'admin'  && <AdminHelp />}
          {role === 'mentor' && <MentorHelp />}
          {role === 'mentee' && <MenteeHelp />}
        </>
      )}
    </div>
  );
}
