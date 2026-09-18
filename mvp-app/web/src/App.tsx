import { Navigate, Route, Routes } from "react-router"
import { AppShell } from "@/components/AppShell"
import { RequireAdmin } from "@/auth/RequireAdmin"
import { RequireAuth } from "@/auth/RequireAuth"
import { LoginPage } from "@/auth/LoginPage"
import { RegisterPage } from "@/auth/RegisterPage"
import { AssistantPage } from "@/features/assistant/AssistantPage"
import { OnboardingPage } from "@/features/onboarding/OnboardingPage"
import { ProgramSelectionPage } from "@/features/program/ProgramSelectionPage"
import { SettingsPage } from "@/features/profile/SettingsPage"
import { CorpusPage } from "@/features/admin/corpus/CorpusPage"
import { ExerciseFormPage } from "@/features/admin/exercises/ExerciseFormPage"
import { ExerciseListPage } from "@/features/admin/exercises/ExerciseListPage"
import { TemplateFormPage } from "@/features/admin/templates/TemplateFormPage"
import { TemplateListPage } from "@/features/admin/templates/TemplateListPage"
import { UserDetailPage } from "@/features/admin/users/UserDetailPage"
import { UserListPage } from "@/features/admin/users/UserListPage"
import { FilmingGuidePage } from "@/features/review/FilmingGuidePage"
import { FormCheckListPage } from "@/features/review/FormCheckListPage"
import { ReviewResultPage } from "@/features/review/ReviewResultPage"
import { MyProgramPage } from "@/features/schedule/MyProgramPage"
import { SchedulePage } from "@/features/schedule/SchedulePage"
import { FinishSessionPage } from "@/features/workout/FinishSessionPage"
import { WorkoutPage } from "@/features/workout/WorkoutPage"

/** 12 màn của concept-frontend-v1.md §4. Một app React, phân quyền theo role (P6). */
export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <AppShell>
              <Routes>
                {/* Lịch tuần là màn chính, nguồn sự thật — vào app là thấy nó trước. */}
                <Route path="/" element={<Navigate to="/schedule" replace />} />
                <Route path="/onboarding" element={<OnboardingPage />} />
                <Route path="/program" element={<ProgramSelectionPage />} />
                <Route path="/schedule" element={<SchedulePage />} />
                <Route path="/assistant" element={<AssistantPage />} />
                <Route path="/my-schedule" element={<MyProgramPage />} />
                <Route path="/workout/:scheduledWorkoutId" element={<WorkoutPage />} />
                <Route
                  path="/workout/:scheduledWorkoutId/finish"
                  element={<FinishSessionPage />}
                />
                <Route path="/form-check" element={<FormCheckListPage />} />
                <Route path="/form-check/result/:reviewId" element={<ReviewResultPage />} />
                <Route path="/form-check/:exerciseId" element={<FilmingGuidePage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route
                  path="/admin/users"
                  element={
                    <RequireAdmin>
                      <UserListPage />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="/admin/users/:userId"
                  element={
                    <RequireAdmin>
                      <UserDetailPage />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="/admin/exercises"
                  element={
                    <RequireAdmin>
                      <ExerciseListPage />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="/admin/exercises/:id"
                  element={
                    <RequireAdmin>
                      <ExerciseFormPage />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="/admin/templates"
                  element={
                    <RequireAdmin>
                      <TemplateListPage />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="/admin/corpus"
                  element={
                    <RequireAdmin>
                      <CorpusPage />
                    </RequireAdmin>
                  }
                />
                <Route
                  path="/admin/templates/:id"
                  element={
                    <RequireAdmin>
                      <TemplateFormPage />
                    </RequireAdmin>
                  }
                />
                <Route path="*" element={<Navigate to="/schedule" replace />} />
              </Routes>
            </AppShell>
          </RequireAuth>
        }
      />
    </Routes>
  )
}
