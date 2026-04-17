# 🤝 Contributing Guide — Team Workflow

## Git Branching Strategy

```
main                  ← production-ready code only
├── dev               ← integration branch (merge features here first)
│   ├── feature/member1-frontend
│   ├── feature/member2-backend
│   └── feature/member3-database
```

### Rules
- **Never push directly to `main`**
- All features → `dev` first via Pull Request
- `dev` → `main` only after team review and testing passes

---

## Member Branches

| Member | Branch Name | Focus Area |
|--------|-------------|------------|
| Member 1 | `feature/member1-frontend` | React pages, components, PWA |
| Member 2 | `feature/member2-backend` | Express server, routes, auth |
| Member 3 | `feature/member3-database` | Models, notifications, tests |

---

## Daily Workflow

```bash
# 1. Sync your branch with dev before starting work
git checkout feature/member1-frontend
git pull origin dev

# 2. Write your code

# 3. Stage and commit
git add .
git commit -m "feat: add victim SOS form with GPS location"

# 4. Push your branch
git push origin feature/member1-frontend

# 5. Open a Pull Request → dev on GitHub
```

---

## Commit Message Format

```
<type>: <short description>

Types:
  feat     → new feature
  fix      → bug fix
  refactor → code improvement (no new feature)
  test     → adding or updating tests
  docs     → documentation changes
  style    → formatting (no logic change)
  chore    → setup, config, build changes
```

### Examples
```
feat: implement JWT authentication with role-based access
fix: resolve duplicate SOS request detection bug
test: add volunteer accept task test cases
docs: update README with API endpoint table
```

---

## Pull Request Checklist

Before opening a PR to `dev`:
- [ ] Code runs without errors
- [ ] No `console.log` left in production code
- [ ] Tests pass (`npm test`)
- [ ] `.env` secrets NOT committed
- [ ] PR description explains what changed and why

---

## Weekly Sync Meeting Agenda (Member 2 leads)

1. What did each member complete this week?
2. Any blockers or technical issues?
3. Integration points — what needs to connect between members?
4. Next week's tasks & priorities
5. Update shared task tracker

---

## Project Task Tracker

| Task | Member | Status |
|------|--------|--------|
| Wireframe design (8 screens) | Member 1 | ✅ Done |
| Project document | Member 2 | ✅ Done |
| Role documents | All | ✅ Done |
| REST API design | Member 2 | ✅ Done |
| MongoDB schema design | Member 3 | ✅ Done |
| Login page (React) | Member 1 | 🔄 In Progress |
| Auth routes + JWT | Member 2 | 🔄 In Progress |
| Mongoose models | Member 3 | 🔄 In Progress |
| Victim SOS form | Member 1 | ⏳ Pending |
| Volunteer Hub page | Member 1 | ⏳ Pending |
| NGO Panel page | Member 1 | ⏳ Pending |
| Admin dashboard | Member 1 | ⏳ Pending |
| Live Map (Google Maps) | Member 1 | ⏳ Pending |
| Request API endpoints | Member 2 | ⏳ Pending |
| Volunteer match algorithm | Member 2 | ⏳ Pending |
| NGO registration API | Member 2 | ⏳ Pending |
| FCM push notifications | Member 3 | ⏳ Pending |
| PWA Web Push service | Member 3 | ⏳ Pending |
| Jest test suites | Member 3 | ⏳ Pending |
| Service Worker (PWA) | Member 1 | ⏳ Pending |
| Database seed script | Member 3 | ⏳ Pending |
| Final deployment | Member 2 | ⏳ Pending |
