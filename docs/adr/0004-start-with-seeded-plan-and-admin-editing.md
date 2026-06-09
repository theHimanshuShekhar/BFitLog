# Start with starter plan content, then move to user-owned plans

BFitLog originally started with a 4-day plan seeded into the database and reserved plan editing for admins. ADR `0014` supersedes that product model: Training Plans are now User-created and activated by the User, with Workout Days and atomic Exercises as the nested units.

The seeded 4-day beginner split can remain as starter/bootstrap content during transition, but it should not be treated as the long-term ownership model. Future plan UI/API work should let a User create and activate their own Training Plan rather than depending on admin-owned shared templates.
