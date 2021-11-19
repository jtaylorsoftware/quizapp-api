# Overview

Quizapp ("QuizNow") is a web app that allows anyone to create multiple-choice quizzes and share them with other users. Quizzes can have visibility set to private,
limiting access to only certain users, or public, which allows any registered users to access them. Grading is done automatically and as soon as the quiz taker
submits their answers.

The backend is implemented as an express.js + Typescript REST API, and the frontend is a React + Typescript app.

### Docker environment setup:

The Docker image for the app requires certain environment variables at runtime. 
The included `docker-compose.yml` also assumes these are provided via the `.env` file.

The required environment variables are:
  - `DB_URL=<valid MongoDB URI>`
  - `JWT_SECRET=<some generated secure string>`
