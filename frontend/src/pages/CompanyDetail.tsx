import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { useAuthStore } from '../store/authStore'
import Layout from '../components/Layout'

export default function CompanyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuthStore()

  // CSV upload state
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState('')
  const [uploadError, setUploadError] = useState('')

  // Notes state
  const [note, setNote] = useState('')
  const [sentiment, setSentiment] = useState('neutral')
  const [noteLoading, setNoteLoading] = useState(false)

  // Brief state
  const [brief, setBrief] = useState<string | null>(null)
  const [briefLoading, setBriefLoading] = useState(false)
  const [briefMsg, setBriefMsg] = useState('')

  // AI summary state
  const [aiLoading, setAiLoading] = useState(false)
  const [aiMsg, setAiMsg] = useState('')
  const [approveLoading, setApproveLoading] = useState(false)

  const canEdit = ['admin', 'analyst'].includes(user?.role || '')
  const isAdmin = user?.role === 'admin'

  // Fetch company data
  const { data, isLoading, isError } = useQuery({
    queryKey: ['company', id],
    queryFn: () => api.get(`/companies/${id}`).then(r => r.data)
  })

  // ── CSV Upload ─────────────────────────────────────────────────────────
  const handleCSVUpload = async () => {
    if (!csvFile) return
    setUploadProgress('Preparing...')
    setUploadError('')
    try {
      const { data: urlData } = await api.get(`/financials/${id}/upload-url`)
      let s3_key = urlData.key
      let csvContent = ''

      if (urlData.mode === 's3') {
        setUploadProgress('Uploading to S3...')
        await fetch(urlData.url, {
          method: 'PUT',
          headers: { 'Content-Type': 'text/csv' },
          body: csvFile
        })
      } else {
        setUploadProgress('Reading file...')
        csvContent = await csvFile.text()
      }

      setUploadProgress('Calculating metrics...')
      const { data: result } = await api.post(`/financials/${id}/process-csv`, {
        s3_key,
        csvContent
      })

      setUploadProgress(
        `✅ Imported ${result.rows_imported} rows · Score: ${Math.round(result.score.overall_score)}/100`
      )
      setCsvFile(null)
      const input = document.getElementById('csv-input') as HTMLInputElement
      if (input) input.value = ''
      qc.invalidateQueries({ queryKey: ['company', id] })
    } catch (e: any) {
      setUploadError(e.response?.data?.detail || e.response?.data?.error || 'Upload failed')
      setUploadProgress('')
    }
  }

  const downloadSampleCSV = () => {
    const sample = [
      'fiscal_year,revenue,ebitda,pat,total_debt,operating_profit',
      '2021,50000000,8000000,5000000,20000000,7500000',
      '2022,62000000,10500000,6800000,18000000,9800000',
      '2023,78000000,14000000,9200000,15000000,13000000'
    ].join('\n')
    const blob = new Blob([sample], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'sample_financials.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  // ── Notes ──────────────────────────────────────────────────────────────
  const handleAddNote = async () => {
    if (!note.trim()) return
    setNoteLoading(true)
    try {
      await api.post(`/companies/${id}/notes`, { content: note, sentiment })
      setNote('')
      setSentiment('neutral')
      qc.invalidateQueries({ queryKey: ['company', id] })
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to add note')
    } finally { setNoteLoading(false) }
  }

  // ── Brief ──────────────────────────────────────────────────────────────
  const handleGenerateBrief = async () => {
    setBriefLoading(true)
    setBriefMsg('')
    try {
      const { data: r } = await api.post(`/companies/${id}/brief`)
      setBrief(r.brief)
      setBriefMsg('✅ Brief generated and saved.')
    } catch (e: any) {
      setBriefMsg('❌ Failed to generate brief.')
    } finally { setBriefLoading(false) }
  }

  const handleLoadBrief = async () => {
    setBriefMsg('')
    try {
      const { data: r } = await api.get(`/companies/${id}/brief`)
      if (r?.content) { setBrief(r.content); setBriefMsg('') }
      else setBriefMsg('No saved brief found. Click Generate Brief.')
    } catch { setBriefMsg('Failed to load brief.') }
  }

  // ── AI Summary ─────────────────────────────────────────────────────────
  const handleGenerateSummary = async () => {
    setAiLoading(true)
    setAiMsg('')
    try {
      await api.post(`/companies/${id}/ai-summary`)
      setAiMsg('✅ Summary generated — pending admin approval.')
      qc.invalidateQueries({ queryKey: ['company', id] })
    } catch (e: any) {
      const err = e.response?.data?.error || 'Generation failed'
      setAiMsg(`❌ ${err}`)
    } finally { setAiLoading(false) }
  }

  const handleApproveSummary = async (sid: number) => {
    setApproveLoading(true)
    try {
      await api.patch(`/companies/${id}/summaries/${sid}/approve`)
      qc.invalidateQueries({ queryKey: ['company', id] })
    } catch { alert('Approval failed') }
    finally { setApproveLoading(false) }
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  const MetricCard = ({ label, value, unit = '', color }: {
    label: string; value: any; unit?: string; color?: string
  }) => (
    <div style={{
      background: '#f8fafc', border: '1px solid #e2e8f0',
      borderRadius: 8, padding: '12px 16px', textAlign: 'center'
    }}>
      <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em' }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: color || '#1e3a5f', marginTop: 4 }}>
        {value != null
          ? `${typeof value === 'number' ? value.toFixed(1) : value}${unit}`
          : '—'}
      </div>
    </div>
  )

  const formatM = (v: any) => v != null ? `${(Number(v) / 1e6).toFixed(2)}M` : '—'

  const trendColor = (t: string, good: string, bad: string) =>
    t === good ? '#166534' : t === bad ? '#991b1b' : '#1e3a5f'

  // ── Render ─────────────────────────────────────────────────────────────
  if (isLoading) return <Layout><p style={{ color: '#64748b', padding: '2rem' }}>Loading...</p></Layout>
  if (isError || !data?.company) return (
    <Layout>
      <p style={{ color: '#dc2626', padding: '2rem' }}>Company not found.</p>
    </Layout>
  )

  const { company, financials = [], metrics, notes = [], score, summary } = data

  return (
    <Layout>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <button onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 13, padding: 0, marginBottom: 8 }}>
            ← Back to Dashboard
          </button>
          <h1 style={{ fontSize: 26, color: '#1e3a5f', margin: 0 }}>{company.name}</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>
            {[company.sector, company.country, company.founded_year ? `Est. ${company.founded_year}` : null]
              .filter(Boolean).join(' · ')}
          </p>
          {company.description && (
            <p style={{ color: '#475569', fontSize: 14, marginTop: 8, maxWidth: 600 }}>
              {company.description}
            </p>
          )}
        </div>
        {score && (
          <div style={{
            background: '#1e3a5f', color: '#fff',
            padding: '14px 28px', borderRadius: 12,
            textAlign: 'center', flexShrink: 0
          }}>
            <div style={{ fontSize: 11, opacity: .7, textTransform: 'uppercase', letterSpacing: '.06em' }}>
              Investment Score
            </div>
            <div style={{ fontSize: 36, fontWeight: 700, lineHeight: 1 }}>
              {Math.round(score.overall_score)}
            </div>
            <div style={{ fontSize: 11, opacity: .6 }}>/100</div>
            <div style={{ fontSize: 11, marginTop: 6, opacity: .7 }}>
              Growth: {Number(score.growth_score).toFixed(0)} ·
              Efficiency: {Number(score.investment_score).toFixed(0)}
            </div>
          </div>
        )}
      </div>

      {/* ── Metrics ── */}
      {metrics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10, marginBottom: 24 }}>
          <MetricCard label="Op. Margin"    value={metrics.op_margin}    unit="%" />
          <MetricCard label="PAT Margin"    value={metrics.pat_margin}    unit="%" />
          <MetricCard label="Sales CAGR 3Y" value={metrics.sales_cagr_3y} unit="%" />
          <MetricCard label="PAT CAGR 3Y"   value={metrics.pat_cagr_3y}   unit="%" />
          <MetricCard label="Debt Trend"    value={metrics.debt_trend}
            color={trendColor(metrics.debt_trend, 'decreasing', 'increasing')} />
          <MetricCard label="Margin Trend"  value={metrics.margin_trend}
            color={trendColor(metrics.margin_trend, 'improving', 'declining')} />
        </div>
      )}
      {!metrics && financials.length === 0 && (
        <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 8, padding: '12px 16px', marginBottom: 24, fontSize: 13, color: '#854d0e' }}>
          No financial data yet. Upload a CSV below to calculate metrics and score.
        </div>
      )}

      {/* ── Financial History Table ── */}
      {financials.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid #e2e8f0', fontWeight: 600, color: '#1e3a5f' }}>
            Financial History
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Year', 'Revenue', 'EBITDA', 'PAT', 'Total Debt', 'Op. Profit'].map((h, i) => (
                    <th key={h} style={{
                      padding: '9px 14px', color: '#64748b', fontWeight: 500,
                      textAlign: i === 0 ? 'left' : 'right'
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {financials.map((f: any, i: number) => (
                  <tr key={f.fiscal_year} style={{ borderTop: '1px solid #f1f5f9', background: i % 2 === 1 ? '#fafafa' : '#fff' }}>
                    <td style={{ padding: '9px 14px', fontWeight: 600, color: '#1e3a5f' }}>{f.fiscal_year}</td>
                    <td style={{ padding: '9px 14px', textAlign: 'right' }}>{formatM(f.revenue)}</td>
                    <td style={{ padding: '9px 14px', textAlign: 'right' }}>{formatM(f.ebitda)}</td>
                    <td style={{ padding: '9px 14px', textAlign: 'right' }}>{formatM(f.pat)}</td>
                    <td style={{ padding: '9px 14px', textAlign: 'right' }}>{formatM(f.total_debt)}</td>
                    <td style={{ padding: '9px 14px', textAlign: 'right' }}>{formatM(f.operating_profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CSV Upload ── */}
      {canEdit && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 18, marginBottom: 24 }}>
          <div style={{ fontWeight: 600, color: '#1e3a5f', marginBottom: 4 }}>
            Upload Financial Data (CSV)
          </div>
          <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
            Required columns:
            <code style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: 4, marginLeft: 4, fontSize: 11 }}>
              fiscal_year, revenue, ebitda, pat, total_debt, operating_profit
            </code>
          </p>
          <button onClick={downloadSampleCSV}
            style={{ fontSize: 12, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 12, textDecoration: 'underline' }}>
            Download sample CSV
          </button>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              id="csv-input"
              type="file"
              accept=".csv"
              onChange={e => {
                setCsvFile(e.target.files?.[0] || null)
                setUploadProgress('')
                setUploadError('')
              }}
              style={{ flex: 1, fontSize: 13 }}
            />
            <button
              onClick={handleCSVUpload}
              disabled={!csvFile || uploadProgress.includes('...')}
              style={{
                padding: '8px 20px', background: '#1e3a5f', color: '#fff',
                border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 14,
                opacity: (!csvFile || uploadProgress.includes('...')) ? .6 : 1,
                whiteSpace: 'nowrap'
              }}>
              {uploadProgress.includes('...') ? uploadProgress : 'Upload & Calculate'}
            </button>
          </div>

          {csvFile && !uploadProgress && (
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
              Selected: <strong>{csvFile.name}</strong> ({(csvFile.size / 1024).toFixed(1)} KB)
            </p>
          )}
          {uploadProgress && !uploadProgress.includes('...') && (
            <p style={{ fontSize: 13, color: '#166534', marginTop: 8 }}>{uploadProgress}</p>
          )}
          {uploadError && (
            <p style={{ fontSize: 13, color: '#dc2626', marginTop: 8 }}>❌ {uploadError}</p>
          )}
        </div>
      )}

      {/* ── Research Notes ── */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 18, marginBottom: 24 }}>
        <div style={{ fontWeight: 600, color: '#1e3a5f', marginBottom: 14 }}>Research Notes</div>

        {canEdit && (
          <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #f1f5f9' }}>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Write a research note about this company..."
              rows={3}
              style={{
                width: '100%', padding: '9px 12px', fontSize: 13,
                border: '1px solid #d1d5db', borderRadius: 7,
                boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit'
              }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 8, alignItems: 'center' }}>
              <label style={{ fontSize: 13, color: '#64748b' }}>Sentiment:</label>
              {(['positive', 'neutral', 'negative'] as const).map(s => (
                <button key={s} onClick={() => setSentiment(s)}
                  style={{
                    padding: '4px 14px', borderRadius: 20, fontSize: 12,
                    cursor: 'pointer', fontWeight: sentiment === s ? 600 : 400,
                    border: sentiment === s ? '2px solid #1e3a5f' : '1px solid #d1d5db',
                    background: sentiment === s
                      ? s === 'positive' ? '#dcfce7' : s === 'negative' ? '#fee2e2' : '#f1f5f9'
                      : '#fff',
                    color: s === 'positive' ? '#166534' : s === 'negative' ? '#991b1b' : '#475569'
                  }}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
              <button
                onClick={handleAddNote}
                disabled={!note.trim() || noteLoading}
                style={{
                  marginLeft: 'auto', padding: '7px 20px',
                  background: '#1e3a5f', color: '#fff',
                  border: 'none', borderRadius: 7, cursor: 'pointer',
                  fontSize: 13, opacity: (!note.trim() || noteLoading) ? .6 : 1
                }}>
                {noteLoading ? 'Adding...' : 'Add Note'}
              </button>
            </div>
          </div>
        )}

        {notes.length === 0
          ? <p style={{ color: '#94a3b8', fontSize: 13 }}>No research notes yet.</p>
          : notes.map((n: any) => (
            <div key={n.id} style={{ padding: '12px 0', borderTop: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <span style={{
                  fontSize: 11, padding: '2px 10px', borderRadius: 20, fontWeight: 600,
                  background: n.sentiment === 'positive' ? '#dcfce7' : n.sentiment === 'negative' ? '#fee2e2' : '#f1f5f9',
                  color: n.sentiment === 'positive' ? '#166534' : n.sentiment === 'negative' ? '#991b1b' : '#475569'
                }}>
                  {n.sentiment}
                </span>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>
                  {n.author} · {new Date(n.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.6 }}>{n.content}</p>
            </div>
          ))
        }
      </div>

      {/* ── One-Page Brief ── */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 18, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontWeight: 600, color: '#1e3a5f' }}>One-Page Company Brief</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleLoadBrief}
              style={{
                padding: '6px 14px', border: '1px solid #d1d5db',
                borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13
              }}>
              Load Saved
            </button>
            {canEdit && (
              <button onClick={handleGenerateBrief} disabled={briefLoading}
                style={{
                  padding: '6px 16px', background: '#0ea5e9', color: '#fff',
                  border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13,
                  opacity: briefLoading ? .6 : 1
                }}>
                {briefLoading ? 'Generating...' : 'Generate Brief'}
              </button>
            )}
          </div>
        </div>
        {briefMsg && (
          <p style={{ fontSize: 13, color: briefMsg.startsWith('✅') ? '#166534' : '#dc2626', marginBottom: 10 }}>
            {briefMsg}
          </p>
        )}
        {brief
          ? (
            <pre style={{
              fontSize: 12, lineHeight: 1.9, color: '#374151',
              whiteSpace: 'pre-wrap', background: '#f8fafc',
              padding: 16, borderRadius: 8, margin: 0,
              fontFamily: 'monospace', overflowX: 'auto'
            }}>
              {brief}
            </pre>
          )
          : (
            <p style={{ color: '#94a3b8', fontSize: 13 }}>
              Click <strong>Generate Brief</strong> to create a structured one-page summary, or <strong>Load Saved</strong> to view a previously generated one.
            </p>
          )
        }
      </div>

      {/* ── AI Summary ── */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 18 }}>
        <div style={{ fontWeight: 600, color: '#1e3a5f', marginBottom: 12 }}>AI Summary (Ollama)</div>

        {aiMsg && (
          <p style={{ fontSize: 13, color: aiMsg.startsWith('✅') ? '#166534' : '#dc2626', marginBottom: 12 }}>
            {aiMsg}
          </p>
        )}

        {summary ? (
          <div>
            <div style={{
              display: 'flex', gap: 10, alignItems: 'center',
              marginBottom: 10, flexWrap: 'wrap'
            }}>
              <span style={{
                fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600,
                background: summary.status === 'approved' ? '#dcfce7' : summary.status === 'rejected' ? '#fee2e2' : '#fef9c3',
                color: summary.status === 'approved' ? '#166534' : summary.status === 'rejected' ? '#991b1b' : '#854d0e'
              }}>
                {summary.status.toUpperCase()}
              </span>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>
                Model: {summary.model_name} · Version: {summary.prompt_version} ·
                Generated: {new Date(summary.generated_at).toLocaleDateString()}
              </span>
            </div>

            {/* Viewers only see approved summaries */}
            {(summary.status === 'approved' || canEdit) && (
              <p style={{
                fontSize: 14, lineHeight: 1.8, color: '#374151',
                background: '#f8fafc', padding: 14, borderRadius: 8
              }}>
                {summary.content}
              </p>
            )}

            {summary.status === 'pending' && !canEdit && (
              <p style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>
                This summary is awaiting admin approval before it becomes visible.
              </p>
            )}

            {isAdmin && summary.status === 'pending' && (
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <button
                  onClick={() => handleApproveSummary(summary.id)}
                  disabled={approveLoading}
                  style={{
                    padding: '7px 20px', background: '#16a34a', color: '#fff',
                    border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13,
                    opacity: approveLoading ? .6 : 1
                  }}>
                  {approveLoading ? 'Approving...' : '✓ Approve Summary'}
                </button>
              </div>
            )}

            {/* Allow regeneration */}
            {canEdit && (
              <button
                onClick={handleGenerateSummary}
                disabled={aiLoading}
                style={{
                  marginTop: 12, padding: '6px 16px',
                  background: 'transparent', color: '#7c3aed',
                  border: '1px solid #7c3aed', borderRadius: 6,
                  cursor: 'pointer', fontSize: 13,
                  opacity: aiLoading ? .6 : 1
                }}>
                {aiLoading ? 'Generating...' : 'Regenerate Summary'}
              </button>
            )}
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
              {canEdit
                ? 'Generate an AI-powered investment summary using Ollama. Requires Ollama running locally with llama3 model.'
                : 'No AI summary available for this company yet.'}
            </p>
            {canEdit && (
              <button
                onClick={handleGenerateSummary}
                disabled={aiLoading}
                style={{
                  padding: '9px 22px', background: '#7c3aed', color: '#fff',
                  border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14,
                  opacity: aiLoading ? .6 : 1
                }}>
                {aiLoading ? 'Generating... (may take 30s)' : 'Generate AI Summary'}
              </button>
            )}
            {!canEdit && (
              <p style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>
                Contact an analyst or admin to generate a summary.
              </p>
            )}
          </div>
        )}
      </div>

    </Layout>
  )
}