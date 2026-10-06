import { Navigate, Route, Routes } from "react-router"
import { AppShell } from "@/components/AppShell"
import { RequireAdmin } from "@/features/auth/components/RequireAdmin"
import { RequireAuth } from "@/features/auth/components/RequireAuth"
import { RequireOnboarding } from "@/features/auth/components/RequireOnboarding"
import { LoginPage } from "@/features/auth/pages/LoginPage"
import { RegisterPage } from "@/features/auth/pages/RegisterPage"
import { AssistantPage } from "@/features/assistant/pages/AssistantPage"
import { OnboardingPage } from "@/features/onboarding/pages/OnboardingPage"
import { ProgramSelectionPage } from "@/features/program/pages/ProgramSelectionPage"
import { AboutPage } from "@/features/profile/pages/AboutPage"
import { PrivacyPage } from "@/features/profile/pages/PrivacyPage"
import { ProfilePage } from "@/features/profile/pages/ProfilePage"
import { ProgressPage } from "@/features/profile/pages/ProgressPage"
import { SettingsPage } from "@/features/profile/pages/SettingsPage"
import { WeightHistoryPage } from "@/features/profile/pages/WeightHistoryPage"
import { CorpusPage } from "@/features/admin/pages/CorpusPage"
import { ExerciseFormPage } from "@/features/admin/pages/ExerciseFormPage"
import { ExerciseListPage } from "@/features/admin/pages/ExerciseListPage"
import { TemplateFormPage } from "@/features/admin/pages/TemplateFormPage"
import { TemplateListPage } from "@/features/admin/pages/TemplateListPage"
import { UserDetailPage } from "@/features/admin/pages/UserDetailPage"
import { UserListPage } from "@/features/admin/pages/UserListPage"
import { WorkoutInsightsPage } from "@/features/admin/pages/WorkoutInsightsPage"
import { FilmingGuidePage } from "@/features/review/pages/FilmingGuidePage"
import { FormCheckListPage } from "@/features/review/pages/FormCheckListPage"
import { LiveCheckPage } from "@/features/review/pages/LiveCheckPage"
import { ReviewResultPage } from "@/features/review/pages/ReviewResultPage"
import { MySchedulePage } from "@/features/schedule/pages/MySchedulePage"
import { MyProgramPage } from "@/features/schedule/pages/MyProgramPage"
import { SchedulePage } from "@/features/schedule/pages/SchedulePage"
import { FinishSessionPage } from "@/features/workout/pages/FinishSessionPage"
import { WorkoutPage } from "@/features/workout/pages/WorkoutPage"

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
            <RequireOnboarding>
              <AppShell>
                <Routes>
                  {/* Lịch tuần là màn chính, nguồn sự thật — vào app là thấy nó trước. */}
                  <Route path="/" element={<Navigate to="/schedule" replace />} />
                  <Route path="/onboarding" element={<OnboardingPage />} />
                  <Route path="/program" element={<ProgramSelectionPage />} />
                  <Route path="/schedule" element={<SchedulePage />} />
                  <Route path="/assistant" element={<AssistantPage />} />
                  <Route path="/my-schedule" element={<MySchedulePage />} />
                  <Route path="/my-program" element={<MyProgramPage />} />
                  <Route path="/workout/:scheduledWorkoutId" element={<WorkoutPage />} />
                  <Route
                    path="/workout/:scheduledWorkoutId/finish"
                    element={<FinishSessionPage />}
                  />
                  <Route path="/form-check" element={<FormCheckListPage />} />
                  <Route path="/form-check/:exerciseId/live" element={<LiveCheckPage />} />
                  <Route path="/form-check/result/:reviewId" element={<ReviewResultPage />} />
                  <Route path="/form-check/:exerciseId" element={<FilmingGuidePage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/settings/profile" element={<ProfilePage />} />
                  <Route path="/settings/progress" element={<ProgressPage />} />
                  <Route path="/settings/weight" element={<WeightHistoryPage />} />
                  <Route path="/settings/privacy" element={<PrivacyPage />} />
                  <Route path="/settings/about" element={<AboutPage />} />
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
                    path="/admin/sessions"
                    element={
                      <RequireAdmin>
                        <WorkoutInsightsPage />
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
                    path="/admin/corpus/uploads/:uploadId"
                    element={
                      <RequireAdmin>
                        <CorpusPage />
                      </RequireAdmin>
                    }
                  />
                  <Route
                    path="/admin/corpus/documents/:documentId"
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
            </RequireOnboarding>
          </RequireAuth>
        }
      />
    </Routes>
  )
}
