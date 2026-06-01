# Spike PowerSync before committing to the sync stack

BFitLog requires offline workout and body weight logging in v1, so a robust local-first sync stack may be justified. PowerSync is a strong candidate because it supports self-hosted Postgres sync and React Native Web, but it adds service and deployment complexity; before committing, the project should prototype Expo Android, Expo Web, authentication, and Docker Compose deployment with PowerSync.
