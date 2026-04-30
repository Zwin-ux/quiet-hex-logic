# BOARD World App Device QA Run

Generated: 2026-04-30T05:32:56.806Z

## Target

- App origin: https://botbot-production-38b3.up.railway.app
- World surface URL: https://botbot-production-38b3.up.railway.app/?surface=world
- QR handoff URL: https://botbot-production-38b3.up.railway.app/?surface=world

## Automated Preflight

| Check | Result | Detail |
| --- | --- | --- |
| public_url_protocol | PASS | https://botbot-production-38b3.up.railway.app |
| health | PASS | {"ok":true,"service":"hexology-railway-server","hasAiProvider":false,"hasSupabaseConfig":true,"hasWorldAppConfig":true} |
| world_server_config | PASS | hasWorldAppConfig=true |
| world_surface_html | PASS | status=200 |
| runtime_env | PASS | VITE_WORLD_APP_ID, VITE_WORLD_ID_ACTION, VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY |
| auth_anonymous_session | PASS | anonymous Supabase session created |
| auth_POST_/api/world/nonce | PASS | status=200 payload=nonce issued |
| auth_POST_/api/world/rp-signature | PASS | status=200 payload=signed |
| auth_GET_/api/world/quickplay/state | PASS | status=200 walletBound=false canOpenRoom=false canEnterRanked=false competitiveGate=wallet_required |
| auth_POST_/api/world/quickplay_ranked_wallet_gate | PASS | status=409 errorCode=world_wallet_required |
| auth_POST_/api/world/quickplay_resume_wallet_gate | PASS | status=409 errorCode=world_wallet_required |
| auth_POST_/api/world/quickplay_rematch_wallet_gate | PASS | status=409 errorCode=world_wallet_required |
| world_bundle_labels | PASS | 5 labels found |
| POST_/api/world/nonce_rejects_unauthenticated | PASS | status=401 |
| POST_/api/world/complete-wallet-auth_rejects_unauthenticated | PASS | status=401 |
| POST_/api/world/rp-signature_rejects_unauthenticated | PASS | status=401 |
| POST_/api/world/verify-id_rejects_unauthenticated | PASS | status=401 |
| GET_/api/world/quickplay/state_rejects_unauthenticated | PASS | status=401 |
| POST_/api/world/quickplay_rejects_unauthenticated | PASS | status=401 |
| visual_world-surface_ios | WARN | World surface on iPhone 15; screenshot=store_assets\world\qa\railway-production-mobile-visual-auth-20260429-2345\world-surface-ios.png; console=ignored console output: [2026-04-30T05:32:01.343Z] [warning] MiniKit is not installed. Make sure you're running the application inside of World App \| [2026-04-30T05:32:01.599Z] [warning] MiniKit is not installed. Make sure you're running the application inside of World App; content=route text loaded |
| visual_play_ios | WARN | Play on iPhone 15; screenshot=store_assets\world\qa\railway-production-mobile-visual-auth-20260429-2345\play-ios.png; console=ignored console output: [2026-04-30T05:32:05.332Z] [warning] MiniKit is not installed. Make sure you're running the application inside of World App; content=route text loaded |
| visual_worlds_ios | WARN | Worlds on iPhone 15; screenshot=store_assets\world\qa\railway-production-mobile-visual-auth-20260429-2345\worlds-ios.png; console=ignored console output: [2026-04-30T05:32:09.337Z] [warning] MiniKit is not installed. Make sure you're running the application inside of World App \| [2026-04-30T05:32:09.722Z] [warning] The resource https://fonts.gstatic.com/s/ibmplexserif/v19/jizDREVNn1dOx-zrZ2X3pZvkTiUQ6SF-lPKgqWVL.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.; content=route text loaded |
| visual_events_ios | WARN | Events on iPhone 15; screenshot=store_assets\world\qa\railway-production-mobile-visual-auth-20260429-2345\events-ios.png; console=ignored console output: [2026-04-30T05:32:12.417Z] [warning] MiniKit is not installed. Make sure you're running the application inside of World App; content=route text loaded |
| visual_world-detail_ios | WARN | World detail on iPhone 15; screenshot=store_assets\world\qa\railway-production-mobile-visual-auth-20260429-2345\world-detail-ios.png; console=ignored console output: [2026-04-30T05:32:15.678Z] [warning] MiniKit is not installed. Make sure you're running the application inside of World App; content=route text loaded |
| visual_tournament-detail_ios | WARN | Tournament detail on iPhone 15; screenshot=store_assets\world\qa\railway-production-mobile-visual-auth-20260429-2345\tournament-detail-ios.png; console=ignored console output: [2026-04-30T05:32:18.933Z] [warning] MiniKit is not installed. Make sure you're running the application inside of World App; content=route text loaded |
| visual_world-surface_android | WARN | World surface on Pixel 8; screenshot=store_assets\world\qa\railway-production-mobile-visual-auth-20260429-2345\world-surface-android.png; console=ignored console output: [2026-04-30T05:32:33.443Z] [warning] MiniKit is not installed. Make sure you're running the application inside of World App \| [2026-04-30T05:32:33.704Z] [warning] MiniKit is not installed. Make sure you're running the application inside of World App; content=route text loaded |
| visual_play_android | WARN | Play on Pixel 8; screenshot=store_assets\world\qa\railway-production-mobile-visual-auth-20260429-2345\play-android.png; console=ignored console output: [2026-04-30T05:32:37.597Z] [warning] MiniKit is not installed. Make sure you're running the application inside of World App; content=route text loaded |
| visual_worlds_android | WARN | Worlds on Pixel 8; screenshot=store_assets\world\qa\railway-production-mobile-visual-auth-20260429-2345\worlds-android.png; console=ignored console output: [2026-04-30T05:32:41.598Z] [warning] The resource https://fonts.gstatic.com/s/ibmplexserif/v19/jizDREVNn1dOx-zrZ2X3pZvkTiUQ6SF-lPKgqWVL.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. \| [2026-04-30T05:32:41.912Z] [warning] MiniKit is not installed. Make sure you're running the application inside of World App; content=route text loaded |
| visual_events_android | WARN | Events on Pixel 8; screenshot=store_assets\world\qa\railway-production-mobile-visual-auth-20260429-2345\events-android.png; console=ignored console output: [2026-04-30T05:32:45.537Z] [warning] MiniKit is not installed. Make sure you're running the application inside of World App; content=route text loaded |
| visual_world-detail_android | WARN | World detail on Pixel 8; screenshot=store_assets\world\qa\railway-production-mobile-visual-auth-20260429-2345\world-detail-android.png; console=ignored console output: [2026-04-30T05:32:50.120Z] [warning] MiniKit is not installed. Make sure you're running the application inside of World App; content=route text loaded |
| visual_tournament-detail_android | WARN | Tournament detail on Pixel 8; screenshot=store_assets\world\qa\railway-production-mobile-visual-auth-20260429-2345\tournament-detail-android.png; console=ignored console output: [2026-04-30T05:32:54.625Z] [warning] MiniKit is not installed. Make sure you're running the application inside of World App; content=route text loaded |
| qr_svg | PASS | C:\Users\mzwin\Documents\hexoogy\store_assets\world\qa\railway-production-mobile-visual-auth-20260429-2345\world-app-qa-url.svg |

## Automated Visual Matrix

| Route | Device | Screenshot | Console | Detail |
| --- | --- | --- | --- | --- |
| World surface | iPhone 15 | world-surface-ios.png | WARN | ignored console output: [2026-04-30T05:32:01.343Z] [warning] MiniKit is not installed. Make sure you're running the application inside of World App \| [2026-04-30T05:32:01.599Z] [warning] MiniKit is not installed. Make sure you're running the application inside of World App |
| Play | iPhone 15 | play-ios.png | WARN | ignored console output: [2026-04-30T05:32:05.332Z] [warning] MiniKit is not installed. Make sure you're running the application inside of World App |
| Worlds | iPhone 15 | worlds-ios.png | WARN | ignored console output: [2026-04-30T05:32:09.337Z] [warning] MiniKit is not installed. Make sure you're running the application inside of World App \| [2026-04-30T05:32:09.722Z] [warning] The resource https://fonts.gstatic.com/s/ibmplexserif/v19/jizDREVNn1dOx-zrZ2X3pZvkTiUQ6SF-lPKgqWVL.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. |
| Events | iPhone 15 | events-ios.png | WARN | ignored console output: [2026-04-30T05:32:12.417Z] [warning] MiniKit is not installed. Make sure you're running the application inside of World App |
| World detail | iPhone 15 | world-detail-ios.png | WARN | ignored console output: [2026-04-30T05:32:15.678Z] [warning] MiniKit is not installed. Make sure you're running the application inside of World App |
| Tournament detail | iPhone 15 | tournament-detail-ios.png | WARN | ignored console output: [2026-04-30T05:32:18.933Z] [warning] MiniKit is not installed. Make sure you're running the application inside of World App |
| World surface | Pixel 8 | world-surface-android.png | WARN | ignored console output: [2026-04-30T05:32:33.443Z] [warning] MiniKit is not installed. Make sure you're running the application inside of World App \| [2026-04-30T05:32:33.704Z] [warning] MiniKit is not installed. Make sure you're running the application inside of World App |
| Play | Pixel 8 | play-android.png | WARN | ignored console output: [2026-04-30T05:32:37.597Z] [warning] MiniKit is not installed. Make sure you're running the application inside of World App |
| Worlds | Pixel 8 | worlds-android.png | WARN | ignored console output: [2026-04-30T05:32:41.598Z] [warning] The resource https://fonts.gstatic.com/s/ibmplexserif/v19/jizDREVNn1dOx-zrZ2X3pZvkTiUQ6SF-lPKgqWVL.woff2 was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally. \| [2026-04-30T05:32:41.912Z] [warning] MiniKit is not installed. Make sure you're running the application inside of World App |
| Events | Pixel 8 | events-android.png | WARN | ignored console output: [2026-04-30T05:32:45.537Z] [warning] MiniKit is not installed. Make sure you're running the application inside of World App |
| World detail | Pixel 8 | world-detail-android.png | WARN | ignored console output: [2026-04-30T05:32:50.120Z] [warning] MiniKit is not installed. Make sure you're running the application inside of World App |
| Tournament detail | Pixel 8 | tournament-detail-android.png | WARN | ignored console output: [2026-04-30T05:32:54.625Z] [warning] MiniKit is not installed. Make sure you're running the application inside of World App |

## Manual Device Matrix

Run this with the World App Dev Portal test QR when staging credentials are configured. The generated QR above is useful for direct tunnel inspection, but the release gate is the World App WebView container.

| Device | World App build | Result | Evidence |
| --- | --- | --- | --- |
| iOS physical device | Fill in | Pending | Screenshot/video |
| Android physical device | Fill in | Pending | Screenshot/video |

## Required Manual Cases

- Scan the World App Dev Portal test QR and confirm BOARD opens inside the World App WebView.
- Confirm the first screen shows "World seat", "Enter a human room.", "Quick ranked", and the bottom tabs.
- Tap "Bind World wallet" or ranked entry and confirm wallet auth opens in the World App flow.
- Complete wallet auth with staging credentials and confirm the profile shows wallet bound.
- Complete IDKit verification and confirm ranked status changes to human/verified.
- Attempt ranked entry before verification and confirm it is blocked with "Verify to enter ranked".
- Enter unranked room after wallet binding and confirm lobby navigation.
- Share a room and confirm native share sheet appears inside World App.
- Rotate or background the app, return, and confirm the console does not lose its bottom nav or lock the screen.
- Capture screenshots for Play, Rooms, Events, Profile, and the verification gate.

## Exit Criteria

- No unauthenticated World endpoint accepts a request.
- Runtime env includes Supabase and World public keys.
- iOS and Android both complete wallet binding.
- At least one device completes IDKit verification against staging.
- No raw wallet address is visible in user-facing UI.
- No prize, WLD, token, yield, or paid competitive copy appears in the World App surface.

## Current Gate

Automated preflight passed. 12 warning(s) are expected browser-only MiniKit or preload output outside the World App WebView. Manual device QA can proceed.
