# Use Expo universal app first

BFitLog will start with a single Expo universal app for Android and web so the two client platforms can share one React Native codebase. Web and Android should both be treated as first-class experiences, but the backend/API boundary must stay clean so a separate web frontend can be split out later if Expo Web limits polish, charts, or embedded media.
