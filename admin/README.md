# Admin Android project

The Android Studio project is `mobile/android`. The Laravel API and simulation worker are in this project. It connects to the same MySQL `inficarx` database as customer and supplier. Configure the root `.env` for your MySQL server.

Install dependencies once:

```powershell
composer install
npm.cmd ci
npm.cmd ci --prefix mobile
```

Open two terminals in this folder. Start the API in one:

```powershell
npm.cmd run api
```

Install the Android app in the other:

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb devices
& $adb reverse tcp:8081 tcp:8081
& $adb reverse tcp:8000 tcp:8000
npm.cmd run android
```

In Android Studio, open `admin/mobile/android` and run the `app` configuration. Keep Metro running with `npm.cmd start` from `admin/` when launching from Android Studio. `npm.cmd run engine` starts the optional simulation worker. `npm.cmd test` runs the API tests.

On a phone without USB forwarding, start the API with `$env:API_HOST='0.0.0.0'; npm.cmd run api`, then use **Server settings** on the sign-in screen to enter `http://<computer-LAN-IP>:8000`.

`npm.cmd run apk` builds an installable local test APK at `mobile/android/app/build/outputs/apk/release/app-release.apk` that runs without Metro.
