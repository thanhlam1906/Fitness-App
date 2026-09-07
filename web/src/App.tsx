import { Navigate, Route, Routes } from "react-router"
import { AppShell } from "@/components/AppShell"
import { RequireUser } from "@/auth/RequireUser"
import { OnboardingPage } from "@/features/onboarding/OnboardingPage"
import { ProgramSelectionPage } from "@/features/program/ProgramSelectionPage"
import { ExerciseFormPage } from "@/features/admin/exercises/ExerciseFormPage"
import { ExerciseListPage } from "@/features/admin/exercises/ExerciseListPage"
import { TemplateFormPage } from "@/features/admin/templates/TemplateFormPage"
import { TemplateListPage } from "@/features/admin/templates/TemplateListPage"
import { SchedulePage } from "@/features/schedule/SchedulePage"
import { WorkoutPage } from "@/features/workout/WorkoutPage"

// Route thật cho các màn có API backend — xem README của thư mục web/.
// /admin/** chưa có guard theo role (chưa có auth thật, xem RequireUser).
export function App() {
  return (
    <RequireUser>
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/onboarding" replace />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/program" element={<ProgramSelectionPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/workout/:scheduledWorkoutId" element={<WorkoutPage />} />
          <Route path="/admin/exercises" element={<ExerciseListPage />} />
          <Route path="/admin/exercises/:id" element={<ExerciseFormPage />} />
          <Route path="/admin/templates" element={<TemplateListPage />} />
          <Route path="/admin/templates/:id" element={<TemplateFormPage />} />
        </Routes>
      </AppShell>
    </RequireUser>
  )
}
