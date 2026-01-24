# Firebase Setup Guide for SocSci Flow

Since you chose the **No Login** method, we need to set up Firebase in "Test Mode" so your app can read/write data using just your Sync Key.

## Step 1: Create Project
1. Go to [Firebase Console](https://console.firebase.google.com/).
2. Click **"Add project"**.
3. Name it `socsci-flow` (or anything you like).
4. Disable Google Analytics (not needed).
5. Click **Create Project**.

## Step 2: Enable Database (Firestore)
1. In the left sidebar, click **Build** -> **Firestore Database**.
2. Click **Create Database**.
3. Choose location (default is fine).
4. **IMPORTANT**: Select **"Start in Test Mode"**.
   - This allows anyone with your app code to write data (which is what we need for the "No Login" approach).
   - *Note: Firebase will warn you about security rules expiring in 30 days. You can update them later to allow permanent access.*

## Step 3: Get API Keys
1. In the Project Overview (gear icon ⚙️ next to "Project Overview"), click **Project settings**.
2. Scroll down to **"Your apps"**.
3. Click the **Web icon (`</>`)**.
4. Register app nickname: `SocSci Web`.
5. You will see a code block like `const firebaseConfig = { ... };`.
6. **COPY** only the object content inside the brackets.

## Step 4: Connect to App
1. Open `src/firebase.js` in VS Code.
2. Replace the `firebaseConfig` object with the one you copied.

Example:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyD-Your-Actual-Key-Here",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```
3. Save the file.
4. Restart your app terminal (`Ctrl+C`, then `npm run dev`) to ensure it picks up the changes.

## Step 5: Test It
1. Open your app.
2. Go to **Settings**.
3. Enter a **Sync Key** (e.g., `my-test-key`).
4. Read a book or change your XP.
5. In Firebase Console, go to **Firestore Database** -> **Data**. 
6. You should see a new collection `sync_users` appear with your data!
