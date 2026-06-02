# BFitLog

BFitLog is a self-hosted gym planning and progress tracking app for two trusted partners. It keeps each person's training data separate while allowing mutual visibility inside the shared instance. The repository name, product name, and user-facing app name are all BFitLog.

## Language

**User**:
A person with their own login, profile, workout logs, body weight logs, stats, and role. In v1, the API starts with a temporary default admin (`admin` / `admin`); that admin creates the first real User, the first real User becomes admin, and the default admin is deleted. Later Users are created by admins; there is no public signup.
_Avoid_: Account when referring to the person, shared login

**Role**:
A User classification that controls administrative capabilities. V1 roles are admin and member; admins can manage users and plan data, while members use the normal viewing, logging, and stats flows.
_Avoid_: Permission when referring to the coarse user classification

**Partner Visibility**:
The v1 sharing model where both users can see each other's plans, workout logs, body weight, and stats. It does not include granular privacy controls.
_Avoid_: Privacy settings, permissions matrix

**Training Plan**:
A named collection of ordered Training Days for a user's gym program. A plan is followed as a rotating sequence, not as a fixed weekday calendar. The initial plan is seeded from code; plan editing is an admin capability, not part of the normal logging flow.
_Avoid_: Gym plan, weekly schedule, program when used ambiguously

**Training Day**:
One step in a Training Plan, labelled by sequence such as Day 1 or Day 2 and usually given a descriptive title such as Upper Body A. The app suggests the next Training Day based on the latest completed Workout Log, but users can manually choose any Training Day.
_Avoid_: Tuesday workout, Workout Template in user-facing UI

**Exercise**:
A reusable movement such as Lat Pulldown or Smith Machine Squat. An Exercise can include description, equipment, notes, and embedded media sources for demonstration.
_Avoid_: Activity, drill

**Planned Exercise**:
An Exercise as prescribed inside a Training Day, including order, target set count, target reps or duration, equipment notes, media, and allowed substitutes. It is the plan-side prescription, not proof that the exercise was performed.
_Avoid_: Exercise row when the distinction from performed work matters

**Exercise Substitute**:
An Exercise that may be logged in place of a Planned Exercise when the original exercise is unavailable, painful, or otherwise unsuitable. Preferred substitutes can be defined in the plan, but users can also choose an ad-hoc substitute with a note. A Workout Log should preserve both the originally planned exercise and the substitute actually performed. Exercise progress stats and Progression Hints belong to the substitute actually performed, not the originally planned exercise. A substitute counts as completing the Planned Exercise slot.
_Avoid_: Replacement when it hides what was originally planned

**Skipped Exercise**:
A Planned Exercise slot intentionally left unperformed during a Workout Log. Skipping requires a note explaining why and does not produce exercise stats or Progression Hints.
_Avoid_: Silent skip, delete from workout

**Warmup Checklist**:
A list of preparatory items shown before the planned exercises in a Training Day. Items can be checked during a workout, but they do not produce stats in v1.
_Avoid_: Warmup log when implying stat tracking

**Cooldown Checklist**:
A list of post-exercise recovery items shown after the planned exercises in a Training Day. Items can be checked during a workout, but they do not produce stats in v1.
_Avoid_: Post exercise warmup, cooldown stats

**Embedded Media**:
An in-app GIF or video demonstration shown on the exercise detail screen. The source may initially be an external URL, with fallback links when embedding fails and optional self-hosted media later.
_Avoid_: External-only link, leaving the app for demo

**Workout Log**:
A dated record that a User started or performed a Training Day. Starting a workout creates a draft Workout Log immediately, and completing it makes it count for sequence progression and stats.
_Avoid_: Completed day when referring to the stored record

**Set Log**:
A record of one performed set within a Workout Log. For rep-based exercises it records kg weight and reps; for time-based exercises it records duration.
_Avoid_: Total sets when per-set detail matters

**Good Form**:
An exercise-level checkbox recorded during a Workout Log to indicate the user believes the exercise was performed with acceptable form. It is not tracked per set in v1.
_Avoid_: RPE, difficulty, form score

**Progression Hint**:
A non-automatic suggestion that an exercise may be ready for increased weight, based on completing all planned sets at the top of the rep range with Good Form for two sessions. It never changes the Training Plan or logged weights by itself.
_Avoid_: Auto-progression, automatic weight increase

**Body Weight Log**:
A manual dated kg body-weight entry for a User, independent of workouts. It supports body weight charts and can later be reused by a daily check-in flow. Body Weight Logs can be created offline and synced later; the first implementation slice should prove this flow end-to-end.
_Avoid_: Weigh-in if it implies a required daily workflow

**Offline Log**:
A Workout Log or Body Weight Log created on a client while disconnected from the server. Offline Logs use client-generated identities, sync later, and avoid most conflicts by being new records; if the same record is edited in multiple places, v1 resolves with last-write-wins. Offline plan editing and guaranteed offline media are outside v1 scope. The sync implementation should be proven with a PowerSync spike before committing.
_Avoid_: Offline-first everything, offline admin editing

## Example dialogue

Developer: "Should Day 1 be tied to Tuesday?"
Domain expert: "No. Training Days rotate. If I complete Day 1, suggest Day 2 next, but let me override."

Developer: "If you manually do Day 3 after Day 1, what is next?"
Domain expert: "Day 4, because Workout Logs are the truth for the sequence."

Developer: "Should progression automatically increase the next weight?"
Domain expert: "No. Show a Progression Hint only after I hit the target with Good Form twice."

Developer: "Can both users see body weight charts?"
Domain expert: "Yes for v1. Partner Visibility is full mutual visibility."
