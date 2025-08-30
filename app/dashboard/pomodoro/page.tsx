import { PomodoroDashboard } from '@/components/pomodoro/PomodoroDashboard'

export default function PomodoroPage() {
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">
          Pomodoro Timer
        </h1>
        
        <PomodoroDashboard />
      </div>
    </div>
  )
}