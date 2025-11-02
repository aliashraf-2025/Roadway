# Firebase API Testing Guide with Postman

This guide will help you set up and test Firebase endpoints using Postman.

## Prerequisites

1. **Firebase Service Account Key**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project: `a2z-app-3ea59`
   - Go to **Project Settings** → **Service Accounts**
   - Click **Generate New Private Key**
   - Save the JSON file as `firebase-service-account.json` in the project root
   - ⚠️ **Important**: Add `firebase-service-account.json` to `.gitignore` to keep it secure!

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Place your Firebase service account key:**
   - Save the downloaded JSON file as `firebase-service-account.json` in the project root

3. **Start the API server:**
   ```bash
   npm run server
   ```
   Or with auto-reload (requires nodemon):
   ```bash
   npm run server:dev
   ```

   The server will run on `http://localhost:3001`

## API Endpoints

### Health Check
- **GET** `http://localhost:3001/health`
- Returns server status

### Authentication Endpoints

#### Sign Up
- **POST** `http://localhost:3001/api/auth/signup`
- **Body** (JSON):
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "displayName": "John Doe",
    "studyYear": "2024"
  }
  ```

#### Login
- **POST** `http://localhost:3001/api/auth/login`
- **Body** (JSON):
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Example**:
  ```json
  {
    "email": "S220128@commerce.ninu.edu.eg",
    "password": "Fuf62227"
  }
  ```
- **Response**: Returns user object and customToken
- **Note**: This is a simplified login. For production, use Firebase Auth REST API directly.

#### Get User
- **GET** `http://localhost:3001/api/auth/user/:uid`
- Replace `:uid` with the user's Firebase UID

### Users Endpoints

#### Get All Users
- **GET** `http://localhost:3001/api/users`

#### Get User by ID
- **GET** `http://localhost:3001/api/users/:id`

#### Create/Update User
- **POST** `http://localhost:3001/api/users`
- **Body** (JSON):
  ```json
  {
    "id": "user-id-here",
    "email": "user@example.com",
    "displayName": "John Doe",
    "studyYear": "2024",
    "followers": [],
    "following": [],
    "followingIds": [],
    "blockedUserIds": [],
    "joinedCommunities": []
  }
  ```

#### Update User
- **PUT** `http://localhost:3001/api/users/:id`
- **Body** (JSON): Only include fields to update

#### Delete User
- **DELETE** `http://localhost:3001/api/users/:id`

### Posts Endpoints

#### Get All Posts
- **GET** `http://localhost:3001/api/posts`

#### Get Post by ID
- **GET** `http://localhost:3001/api/posts/:id`

#### Create Post
- **POST** `http://localhost:3001/api/posts`
- **Body** (JSON):
  ```json
  {
    "authorId": "user-id",
    "content": "This is my post content",
    "courseName": "Computer Science",
    "likes": 0,
    "comments": [],
    "reposts": 0
  }
  ```

#### Update Post
- **PUT** `http://localhost:3001/api/posts/:id`
- **Body** (JSON): Only include fields to update

#### Delete Post
- **DELETE** `http://localhost:3001/api/posts/:id`

### Courses Endpoints

#### Get All Courses
- **GET** `http://localhost:3001/api/courses`

#### Get Course by ID
- **GET** `http://localhost:3001/api/courses/:id`

#### Create Course
- **POST** `http://localhost:3001/api/courses`
- **Body** (JSON):
  ```json
  {
    "name": "Introduction to Computer Science",
    "description": "Learn the basics of CS",
    "instructor": "Dr. Smith",
    "duration": "10 weeks"
  }
  ```

## Postman Testing Steps

1. **Import Collection** (Optional):
   - Create a new Collection in Postman
   - Add all endpoints listed above

2. **Test Health Check First:**
   - Method: GET
   - URL: `http://localhost:3001/health`
   - Should return: `{"status":"OK","message":"Firebase API server is running"}`

3. **Test User Creation:**
   - Method: POST
   - URL: `http://localhost:3001/api/users`
   - Headers: `Content-Type: application/json`
   - Body: JSON with user data
   - Note the returned `id` for later tests

4. **Test Fetching Users:**
   - Method: GET
   - URL: `http://localhost:3001/api/users`
   - Should return array of all users

5. **Continue testing other endpoints as needed**

## Environment Variables (Optional)

Create a `.env` file:
```
PORT=3001
FIREBASE_PROJECT_ID=a2z-app-3ea59
```

## Troubleshooting

- **Error: Cannot find module 'firebase-service-account.json'**
  - Make sure you've downloaded and placed the service account key file in the project root

- **Error: Permission denied**
  - Check that your Firebase service account has proper permissions in Firebase Console

- **CORS errors**
  - The server includes CORS middleware, but if you still see errors, check that the server is running

## Security Notes

⚠️ **Never commit `firebase-service-account.json` to version control!**

Add to `.gitignore`:
```
firebase-service-account.json
.env
```

