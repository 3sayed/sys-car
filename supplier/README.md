# Supplier Android project

The Android Studio project is `android/`. The PHP API is in `backend/` and uses the shared MySQL `inficarx` database. Configure `backend/.env` for your MySQL server.

Open two PowerShell terminals in this folder. Start the API in one:

```powershell
npm.cmd ci
npm.cmd run api
```

Install the app on a connected Android emulator or USB phone in the other:

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb devices
& $adb reverse tcp:8081 tcp:8081
& $adb reverse tcp:8002 tcp:8002
npm.cmd run android
```

For a fresh backend checkout, run `composer install` in `backend/`. In Android Studio, open `supplier/android` and run the `app` configuration. Keep Metro running with `npm.cmd start` when launching from Android Studio.

On a phone without USB forwarding, use **Server settings** on the sign-in screen to enter `http://<computer-LAN-IP>:8002`. The API binds to the computer network interface.

`npm.cmd run apk` builds an installable local test APK at `android/app/build/outputs/apk/release/app-release.apk` that runs without Metro.
