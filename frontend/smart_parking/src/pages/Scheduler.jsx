import { useState } from 'react'
import { api } from '../api.js'
import { Sidebar } from '../dashboard.jsx'

function AlgoCard({ result }) {
  if (!result) return null
  const { algorithm, order, summary } = result
  return (
    <div className="algo-card">
      <h3>{algorithm}</h3>
      <div className="summary-row">
        <span>Jobs: <strong>{summary.totalJobs}</strong></span>
        <span>Avg Wait: <strong>{summary.avgWaitingMs} ms</strong></span>
        <span>Avg TAT: <strong>{summary.avgTurnaroundMs} ms</strong></span>
      </div>
      {order.length > 0 && (
        <table className="data-table mini">
          <thead>
            <tr><th>Reservation</th><th>Vehicle</th><th>Priority</th><th>Wait (ms)</th><th>TAT (ms)</th><th>State</th></tr>
          </thead>
          <tbody>
            {order.map(p => (
              <tr key={p.id}>
                <td>#{p.id}</td>
                <td>{p.vehicleType}</td>
                <td>{p.priority}</td>
                <td>{p.waitingMs}</td>
                <td>{p.turnaroundMs}</td>
                <td>{p.state}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function Scheduler() {
  const user      = JSON.parse(localStorage.getItem('sptrm_user') || '{}')
  const [results, setResults]  = useState(null)
  const [rag,     setRag]      = useState(null)
  const [msg,     setMsg]      = useState('')
  const [loading, setLoading]  = useState(false)

  async function runCompare() {
    setMsg(''); setLoading(true)
    try {
      const data = await api.compare()
      if (data.message) { setMsg(data.message); setResults(null) }
      else setResults(data)
    } catch (err) { setMsg('❌ ' + err.message) }
    finally { setLoading(false) }
  }

  async function loadRag() {
    setMsg(''); setLoading(true)
    try { setRag(await api.rag()) }
    catch (err) { setMsg('❌ ' + err.message) }
    finally { setLoading(false) }
  }

  async function simulateDeadlock() {
    setMsg(''); setLoading(true)
    try { setRag(await api.simulateDL()) }
    catch (err) { setMsg('❌ ' + err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="dashboard">
      <Sidebar user={user} />
      <div className="right-panel">
        <div className="header">
          <div className="header-left">
            <h1>OS Scheduler &amp; Deadlock</h1>
            <p>FCFS · Priority · Round Robin · Resource Allocation Graph</p>
          </div>
        </div>

        {msg && <div className="msg-banner">{msg}</div>}

        <div className="action-row" style={{ marginBottom: 24 }}>
          <button onClick={runCompare}       disabled={loading} className="submit-btn">
            ⚙️ Run All Schedulers (Compare)
          </button>
          <button onClick={loadRag}          disabled={loading} className="submit-btn secondary">
            🔗 Show Current RAG
          </button>
          <button onClick={simulateDeadlock} disabled={loading} className="submit-btn danger">
            💥 Simulate Deadlock
          </button>
        </div>

        {results && (
          <div className="algo-grid">
            <AlgoCard result={results.FCFS} />
            <AlgoCard result={results.PRIORITY} />
            <AlgoCard result={results.ROUND_ROBIN} />
          </div>
        )}

        {rag && (
          <div className="rag-panel">
            <h2>Resource Allocation Graph</h2>
            <div className={`deadlock-banner ${rag.deadlockDetected ? 'detected' : 'clear'}`}>
              {rag.deadlockDetected
                ? `🔴 DEADLOCK DETECTED — Cycle: ${rag.cycle.join(' → ')}${rag.victimProcess ? ` | Resolved: preempted P${rag.victimProcess}` : ''}`
                : '🟢 No deadlock detected'}
            </div>
            <h3>RAG Edges</h3>
            {rag.edges?.length > 0 ? (
              <table className="data-table mini">
                <thead><tr><th>From</th><th>→</th><th>To</th><th>Type</th></tr></thead>
                <tbody>
                  {rag.edges.map((e, i) => (
                    <tr key={i}>
                      <td>{e.from}</td><td>→</td><td>{e.to}</td>
                      <td><span className={`status-badge ${e.type === 'ASSIGNMENT' ? 'assigned' : 'req'}`}>{e.type}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p>No edges in graph yet.</p>}
          </div>
        )}

        <div className="info-box" style={{ marginTop: 32 }}>
          <h3>📚 Algorithm Guide</h3>
          <dl>
            <dt>FCFS</dt>
            <dd>First-Come-First-Served — requests processed in arrival order. Simple, no starvation, but no priority awareness.</dd>
            <dt>Priority Scheduling</dt>
            <dd>Emergency vehicles (priority 1) always go first. Lower number = higher urgency.</dd>
            <dt>Round Robin</dt>
            <dd>Each request gets a fixed time quantum. Ensures fairness, prevents starvation.</dd>
            <dt>RAG (Resource Allocation Graph)</dt>
            <dd>Directed graph of process→resource (request) and resource→process (assignment). A cycle = deadlock.</dd>
          </dl>
        </div>
      </div>
    </div>
  )
}

export default Scheduler
