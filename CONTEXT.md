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
A User-created collection of ordered Workout Days for that User's gym routine. A Training Plan carries its own name, description, tips/notes, and ordered Workout Days. A User creates a Training Plan and activates it; the active plan is followed as a rotating sequence, not as a fixed weekday calendar.
_Avoid_: Gym plan, weekly schedule, program when used ambiguously, shared template when describing user-owned plans

**Workout Day**:
One step in a Training Plan, labelled by sequence such as Day 1 or Day 2 and usually given a descriptive name such as Upper Body A. A Workout Day carries its own name, description, tips/notes, ordered pre-workout dynamic warmup stretch text items, ordered Exercises, and ordered post-workout static stretch text items. The app suggests the next Workout Day based on the latest completed Workout Log, but users can manually choose any Workout Day.
_Avoid_: Tuesday workout, Workout Template in user-facing UI, Training Day

**Exercise**:
An atomic prescribed movement such as Lat Pulldown, Dumbbell Row, or Plank. An Exercise carries its own name, description, tracking type, recommended prescription, machine/equipment guidance, demo GIF, demo video, and optional substitute Exercise link. The recommended prescription can be set/reps-based for movements like Dumbbell Rows or time-based for movements like Planks. The recommendation is a default; during a Workout Log, a User may record any number of sets, reps, or time actually performed.
_Avoid_: Activity, drill, treating recommendations as fixed requirements


**Exercise Substitute**:
An optional substitute Exercise linked from an Exercise and available when the original exercise is unavailable, painful, or otherwise unsuitable. A Workout Log should preserve both the originally selected Exercise and the substitute actually performed. Exercise progress stats and Progression Hints belong to the Exercise actually performed, not the originally selected Exercise.
_Avoid_: Replacement when it hides what was originally selected

**Skipped Exercise**:
An Exercise intentionally left unperformed during a Workout Log. Skipping requires a note explaining why and does not produce exercise stats or Progression Hints.
_Avoid_: Silent skip, delete from workout

**Dynamic Warmup Stretch**:
An ordered text item shown before the Exercises in a Workout Day. Dynamic Warmup Stretches are owned by the Workout Day, not reusable Exercise-like records, and they do not produce stats in v1.
_Avoid_: Warmup log when implying stat tracking

**Static Stretch**:
An ordered text item shown after the Exercises in a Workout Day. Static Stretches are owned by the Workout Day, not reusable Exercise-like records, and they do not produce stats in v1.
_Avoid_: Post exercise warmup, cooldown stats

**Embedded Media**:
An in-app GIF or video demonstration shown on the exercise detail screen. The source may initially be an external URL, with fallback links when embedding fails and optional self-hosted media later.
_Avoid_: External-only link, leaving the app for demo

**Workout Log**:
A dated record that a User started or performed a Workout Day. Starting a workout creates a draft Workout Log immediately, and completing it makes it count for sequence progression and stats.
_Avoid_: Completed day when referring to the stored record

**Set Log**:
A record of one performed set within a Workout Log. For rep-based exercises it records kg weight and reps; for time-based exercises it records duration.
_Avoid_: Total sets when per-set detail matters

**Good Form**:
An exercise-level checkbox recorded during a Workout Log to indicate the user believes the exercise was performed with acceptable form. It is not tracked per set in v1.
_Avoid_: RPE, difficulty, form score

**Progression Hint**:
A non-automatic suggestion that an exercise may be ready for increased weight, based on completing the Exercise's recommended set/rep prescription at the top of the rep range with Good Form for two sessions. It never changes the Training Plan, Exercise recommendation, or logged weights by itself.
_Avoid_: Auto-progression, automatic weight increase

**Body Weight Log**:
A manual dated kg body-weight entry for a User, independent of workouts. It supports body weight charts and can later be reused by a daily check-in flow. Body Weight Logs can be created offline and synced later; the first implementation slice should prove this flow end-to-end.
_Avoid_: Weigh-in if it implies a required daily workflow

**Offline Log**:
A Workout Log or Body Weight Log created on a client while disconnected from the server. Offline Logs use client-generated identities, sync later, and avoid most conflicts by being new records; if the same record is edited in multiple places, v1 resolves with last-write-wins. Offline plan editing and guaranteed offline media are outside v1 scope. The sync implementation should be proven with a PowerSync spike before committing.
_Avoid_: Offline-first everything, offline admin editing

## Example dialogue

Developer: "Should Day 1 be tied to Tuesday?"
Domain expert: "No. Workout Days rotate. If I complete Day 1, suggest Day 2 next, but let me override."

Developer: "If you manually do Day 3 after Day 1, what is next?"
Domain expert: "Day 4, because Workout Logs are the truth for the sequence."

Developer: "Should progression automatically increase the next weight?"
Domain expert: "No. Show a Progression Hint only after I hit the target with Good Form twice."

Developer: "Can both users see body weight charts?"
Domain expert: "Yes for v1. Partner Visibility is full mutual visibility."
