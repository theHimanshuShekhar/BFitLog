# Use simple offline sync conflict policy

BFitLog will avoid most offline conflicts by treating offline-created workout logs, set logs, and body weight logs as new client-generated UUID records that sync to the server later. If the same record is edited from multiple clients, v1 will use last-write-wins rather than manual conflict resolution, keeping sync understandable for a two-user trusted app.
