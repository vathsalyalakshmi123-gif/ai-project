import { useEffect, useMemo, useState } from 'react';

function calculateCompletion(taskMap) {
  const tasks = Object.values(taskMap || {});
  if (!tasks.length) return 0;
  return Math.round((tasks.filter(Boolean).length / tasks.length) * 100);
}

function formatStatus(completion) {
  if (completion === 100) return 'Complete';
  if (completion >= 50) return 'In progress';
  return 'Pending';
}

export default function App() {
  const [data, setData] = useState(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [activeStage, setActiveStage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function loadProgress() {
      try {
        const response = await fetch('/api/progress');
        const payload = await response.json();
        setData(payload);
        setSelectedEmployeeId(payload.employees[0]?.id || '');
        setActiveStage(payload.stages[0] || '');
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    loadProgress();
  }, []);

  const selectedEmployee = useMemo(
    () => data?.employees.find((employee) => employee.id === selectedEmployeeId) || null,
    [data, selectedEmployeeId]
  );

  const currentStageTasks = selectedEmployee?.progress?.[activeStage]?.taskList || {};
  const stageCompletion = useMemo(() => calculateCompletion(currentStageTasks), [currentStageTasks]);
  const overallCompletion = useMemo(() => {
    if (!selectedEmployee) return 0;
    const allTasks = Object.values(selectedEmployee.progress).flatMap((stage) => Object.values(stage.taskList));
    return calculateCompletion(Object.fromEntries(allTasks.map((value, index) => [index, value])));
  }, [selectedEmployee]);

  const handleEmployeeChange = (employeeId) => {
    setSelectedEmployeeId(employeeId);
    const employee = data?.employees.find((item) => item.id === employeeId);
    if (employee) {
      setActiveStage(employee.currentStage || data.stages[0]);
    }
  };

  const handleStageSelect = (stage) => {
    setActiveStage(stage);
    setData((prev) => {
      if (!prev) return prev;
      const copy = JSON.parse(JSON.stringify(prev));
      const employee = copy.employees.find((item) => item.id === selectedEmployeeId);
      if (employee) {
        employee.currentStage = stage;
      }
      return copy;
    });
  };

  const handleTaskToggle = (taskKey) => {
    setData((prev) => {
      if (!prev) return prev;
      const copy = JSON.parse(JSON.stringify(prev));
      const employee = copy.employees.find((item) => item.id === selectedEmployeeId);
      if (!employee) return prev;
      employee.progress[activeStage].taskList[taskKey] = !employee.progress[activeStage].taskList[taskKey];
      return copy;
    });
  };

  const handleSave = async () => {
    if (!selectedEmployee) return;
    setSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmployee.id,
          currentStage: selectedEmployee.currentStage,
          progress: selectedEmployee.progress
        })
      });

      if (!response.ok) {
        throw new Error('Save failed');
      }

      setMessage('Progress successfully saved.');
    } catch (error) {
      setMessage('Unable to save progress. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="page-shell">
        <div className="loading-card">Loading onboarding progress…</div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <header className="hero-panel">
        <div>
          <p className="eyebrow">Employee Onboarding</p>
          <h1>Milestone Checker</h1>
          <p className="hero-copy">
            Monitor employee progress across onboarding stages with professional track visuals and saved task completion state.
          </p>
        </div>
        <div className="hero-meta-card">
          <div className="hero-meta-group">
            <span>Current employee</span>
            <strong>{selectedEmployee.name}</strong>
          </div>
          <div className="hero-meta-group">
            <span>Stage</span>
            <strong>{selectedEmployee.currentStage}</strong>
          </div>
          <div className="hero-meta-group">
            <span>Overall completion</span>
            <strong>{overallCompletion}%</strong>
          </div>
        </div>
      </header>

      <section className="workspace-grid">
        <aside className="panel card employee-panel">
          <div className="panel-heading">
            <h2>Team members</h2>
          </div>
          <div className="panel-content">
            <label className="select-label">Select employee</label>
            <select value={selectedEmployeeId} onChange={(event) => handleEmployeeChange(event.target.value)}>
              {data.employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>

            <div className="status-grid">
              <div>
                <p>Current stage</p>
                <strong>{selectedEmployee.currentStage}</strong>
              </div>
              <div>
                <p>Progress</p>
                <strong>{overallCompletion}%</strong>
              </div>
            </div>
          </div>
        </aside>

        <main className="panel card progress-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Stage progress</p>
              <h2>{activeStage}</h2>
            </div>
            <div className="stage-badge">{formatStatus(stageCompletion)}</div>
          </div>

          <nav className="stage-tabs">
            {data.stages.map((stage) => (
              <button
                key={stage}
                className={stage === activeStage ? 'stage-tab active' : 'stage-tab'}
                onClick={() => handleStageSelect(stage)}
              >
                {stage}
              </button>
            ))}
          </nav>

          <div className="panel-content">
            <div className="progress-meter">
              <div className="meter-track">
                <div className="meter-fill" style={{ width: `${stageCompletion}%` }} />
              </div>
              <span>{stageCompletion}% complete</span>
            </div>

            <ul className="task-list">
              {Object.entries(currentStageTasks).map(([task, completed]) => (
                <li key={task} className={completed ? 'task-complete' : ''}>
                  <label>
                    <input
                      type="checkbox"
                      checked={completed}
                      onChange={() => handleTaskToggle(task)}
                    />
                    <span>{task}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <div className="action-row">
            <button className="button primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save progress'}
            </button>
            <span className="action-note">Task status is persisted to the onboarding backend.</span>
          </div>

          {message && <div className="toast-message">{message}</div>}
        </main>
      </section>
    </div>
  );
}
