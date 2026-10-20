# TaskNest — YuvaIntern Full Stack Internship

TaskNest is a personal project and task tracker developed for the **Junior Full Stack Developer Intern** internship. Week 1 documents the design, Week 2 implements the React frontend with a browser-local demo, and Week 3 provides a tested REST backend with PostgreSQL persistence.

## Week folders

| Week | Focus | Status |
| --- | --- | --- |
| [Week 1](week-1) | Project planning and system architecture | Design documented |
| [Week 2](week-2) | Frontend application development | Implemented and tested in demo mode |
| [Week 3](week-3) | Backend API development | Implemented and tested with embedded PostgreSQL |
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

The printed Local URL opens a usable demo without a backend or account. Data is saved in that browser origin. Week 3 now provides authentication and PostgreSQL storage. Connecting this frontend to that backend remains Week 4 work. The optional fetch adapter follows the Week 1 contract; its HTTP behavior is tested with mock responses.

- [Week 2 Word report](week-2/TaskNest-Week-2-Report.docx)
- [Week 2 readable report](week-2/REPORT.md)
- [Week 2 testing notes](week-2/TESTING.md)
- [Week 2 submission description](week-2/submission-description.txt)

## Week 3 backend API

Open [the Week 3 README](week-3/README.md) for setup, security decisions and verification limits. It provides accounts, cookie sessions, ownership-aware project/task CRUD, filters, pagination and dashboard summaries. Thirty automated tests pass, and a separate live walkthrough covers every endpoint. Embedded PostgreSQL provides local disk persistence without a separate database installation; an additional PostgreSQL server adapter is included but has not been live-tested.

```sh
cd week-3
pnpm install --frozen-lockfile
pnpm start
```

The default health URL is http://127.0.0.1:8033/api/v1/health. This is a backend service; Week 2 frontend integration is not included.

- [Week 3 Word report](week-3/TaskNest-Week-3-Report.docx)
- [Week 3 readable report](week-3/REPORT.md)
- [API reference](week-3/docs/API.md)
- [Week 3 tests and evidence](week-3/docs/TESTING.md)
- [Week 3 submission instructions](week-3/SUBMIT.md)

## Week 1 planning

- [Word report](week-1/TaskNest-Week-1-Report.docx)
- [Readable architecture report](week-1/REPORT.md)
- [Planning diagrams](week-1/diagrams)
- [Proposed PostgreSQL schema](week-1/schema.sql)

The planning material defines the intended full stack system. Weeks 4 through 6 remain placeholders, not completed submissions.
