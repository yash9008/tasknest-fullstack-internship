# TaskNest — YuvaIntern Full Stack Internship

TaskNest is a personal project and task tracker developed for the **Junior Full Stack Developer Intern** internship. Week 1 documents the design; Week 2 implements the React frontend with a working browser-local demo.

## Week folders

| Week | Focus | Status |
| --- | --- | --- |
| [Week 1](week-1) | Project planning and system architecture | Design documented |
| [Week 2](week-2) | Frontend application development | Implemented and tested in demo mode |
| [Week 3](week-3) | Backend API development | Not started |
| [Week 4](week-4) | Frontend and backend integration | Not started |
| [Week 5](week-5) | Testing, debugging and optimization | Not started |
| [Week 6](week-6) | Deployment, maintenance and reflection | Not started |

## Week 2 application

Open [the Week 2 README](week-2/README.md) for setup and development details. It includes a landing page, dashboard, project detail workspace, project/task CRUD, filtering, pagination, progress summaries, persistence, validation, and recovery states.

```sh
cd week-2
pnpm install --frozen-lockfile
pnpm dev
```

The printed Local URL opens a usable demo without a backend or account. Data is saved in that browser origin. Production authentication, PostgreSQL, and live API integration remain later-week work. The optional fetch adapter follows the Week 1 contract; its HTTP behavior is tested with mock responses.

- [Week 2 Word report](week-2/TaskNest-Week-2-Report.docx)
- [Week 2 readable report](week-2/REPORT.md)
- [Week 2 testing notes](week-2/TESTING.md)
- [Week 2 submission description](week-2/submission-description.txt)

## Week 1 planning

- [Word report](week-1/TaskNest-Week-1-Report.docx)
- [Readable architecture report](week-1/REPORT.md)
- [Planning diagrams](week-1/diagrams)
- [Proposed PostgreSQL schema](week-1/schema.sql)

The planning material defines the intended full stack system. Later-week folders remain placeholders, not completed submissions.
