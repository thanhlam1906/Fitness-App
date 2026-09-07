import { Navigate, Route, Routes } from "react-router"
import { AppShell } from "@/components/AppShell"
import { RequireAdmin } from "@/auth/RequireAdmin"
import { RequireAuth } from "@/auth/RequireAuth"
import { LoginPage } from "@/auth/LoginPage"
import { RegisterPage } from "@/auth/RegisterPage"
import { OnboardingPage } from "@/features/onboarding/OnboardingPage"
import { ProgramSelectionPage } from "@/features/program/ProgramSelectionPage"
import { ExerciseFormPage } from "@/features/admin/exercises/ExerciseFormPage"
import { ExerciseListPage } from "@/features/admin/exercises/ExerciseListPage"
import { TemplateFormPage } from "@/features/admin/templates/TemplateFormPage"
import { TemplateListPage } from "@/features/admin/templates/TemplateListPage"
import { SchedulePage } from "@/features/schedule/SchedulePage"
import { WorkoutPage } from "@/features/workout/WorkoutPage"

// Route thật cho các màn có API backend — xem README của thư mục web/.
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
                <Route path="/" element={<Navigate to="/onboarding" replace />} />
                <Route path="/onboarding" element={<OnboardingPage />} />
                <Route path="/program" element={<ProgramSelectionPage />} />
                <Route path="/schedule" element={<SchedulePage />} />
                <Route path="/workout/:scheduledWorkoutId" element={<WorkoutPage />} />
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
                  path="/admin/templates/:id"
                  element={
                    <RequireAdmin>
                      <TemplateFormPage />
                    </RequireAdmin>
                  }
                />
              </Routes>
            </AppShell>
          </RequireAuth>
        }
      />
    </Routes>
  )
}
