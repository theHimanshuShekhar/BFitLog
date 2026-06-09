# Use user-owned atomic Training Plans

BFitLog will model training around three nested user-facing units:

1. **Exercise** — the atomic prescribed movement. It owns its name, description, tracking type, recommended prescription, machine/equipment guidance, demo GIF, demo video, and optional substitute Exercise link. Recommendations are defaults only; Workout Logs can record any actual number of sets, reps, or seconds.
2. **Workout Day** — an ordered day inside a Training Plan. It owns its name, description, tips/notes, pre-workout dynamic warmup stretch text items, ordered Exercises, and post-workout static stretch text items.
3. **Training Plan** — a User-created, activatable collection of ordered Workout Days with name, description, and tips/notes.

This replaces the earlier mental model where a shared seeded Training Plan Template plus Planned Exercises owned most prescription data. The database may keep compatibility tables during transition, but new product language and future UI/API work should treat prescriptions as Exercise defaults and Training Plans as User-owned plans.

## Consequences

- Exercise recommendations can be rep-based, such as Dumbbell Rows, or time-based, such as Planks.
- Workout logging remains actual-performance data and must not clamp the User to the Exercise recommendation.
- Warmup and static stretches are ordered text items owned by a Workout Day, not reusable Exercise-like records.
- Substitute guidance belongs to the Exercise as a link to another Exercise.
- Seeded starter content can still exist as bootstrap data, but normal plan ownership belongs to Users creating and activating Training Plans.
