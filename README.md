# infiCarX Android apps

This folder has three independent React Native Android projects: [customer](customer/README.md), [supplier](supplier/README.md), and [admin](admin/README.md). Each has its own Android Studio project in `android/` and its own PHP API. All three APIs use the same MySQL `inficarx` database managed through phpMyAdmin.

| App | Android Studio folder | API port |
| --- | --- | --- |
| Customer | `customer/android` | 8001 |
| Supplier | `supplier/android` | 8002 |
| Admin | `admin/mobile/android` | 8000 |

To run one app, start its API, connect an Android emulator or USB phone, run `adb reverse tcp:8081 tcp:8081` and `adb reverse tcp:<API port> tcp:<API port>`, then use `npm run android` in that app's folder. Metro starts automatically. The app is installed as a normal Android application and does not use a QR code.

Use one Metro server at a time on port 8081 when developing multiple apps on one computer. The database server must also be running. See each project README for exact commands.

For an APK installed without USB port forwarding, open **Server settings** on its sign-in screen and enter the API computer's reachable address, such as `http://192.168.1.10:8001` for customer. The phone and API computer must be on the same network. The address is saved in Android Keystore.

Run `npm run apk` from a project folder to build `android/app/build/outputs/apk/release/app-release.apk` (for admin: `mobile/android/app/build/outputs/apk/release/app-release.apk`). These local test APKs include the JavaScript bundle and run without Metro. The template signs them with a development key; configure a private release key before publishing.
