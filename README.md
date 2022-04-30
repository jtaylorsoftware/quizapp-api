# QuizNow API

"QuizNow" is a web app that allows users to create quizzes and share them with other users. This project (the REST API) is written 
entirely in TypeScript and uses Express.js to serve requests.

## Features

- Offers various question types, including fill-in-the-blank and multiple choice
- Instant quiz grading and feedback to users
- Can set expiration date for quizzes and restrict access to only specific usernames

## Docker environment setup:

The Docker image for the app requires certain environment variables at runtime. 
The included `docker-compose.yml` also assumes these are provided via the `.env` file.

The required environment variables are:
  - `DB_URL=<valid MongoDB URI>`
  - `JWT_SECRET=<some generated secure string>`

## Related projects:

- [React + Redux SPA](https://github.com/jtaylorsoftware/quizapp-web)
- [Android app](https://github.com/jtaylorsoftware/quizapp-android)
