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
        `✅ Imported ${result.rows_imported} rows · Score: ${Math.round(
          result.score.overall_score
        )}/100`
      )

      setCsvFile(null)

      const input = document.getElementById('csv-input') as HTMLInputElement
      if (input) input.value = ''

      qc.invalidateQueries({ queryKey: ['company', id] })
    } catch (e: any) {
      setUploadError(
        e.response?.data?.detail ||
          e.response?.data?.error ||
          'Upload failed'
      )
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
    a.href = url
    a.download = 'sample_financials.csv'
    a.click()

    URL.revokeObjectURL(url)
  }

  // ── Notes ──────────────────────────────────────────────────────────────
  const handleAddNote = async () => {
    if (!note.trim()) return

    setNoteLoading(true)

    try {
      await api.post(`/companies/${id}/notes`, {
        content: note,
        sentiment
      })

      setNote('')
      setSentiment('neutral')

      qc.invalidateQueries({ queryKey: ['company', id] })
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to add note')
    } finally {
      setNoteLoading(false)
    }
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
    } finally {
      setBriefLoading(false)
    }
  }

  const handleLoadBrief = async () => {
    setBriefMsg('')

    try {
      const { data: r } = await api.get(`/companies/${id}/brief`)

      if (r?.content) {
        setBrief(r.content)
        setBriefMsg('')
      } else {
        setBriefMsg('No saved brief found. Click Generate Brief.')
      }
    } catch {
      setBriefMsg('Failed to load brief.')
    }
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
    } finally {
      setAiLoading(false)
    }
  }

  const handleApproveSummary = async (sid: number) => {
    setApproveLoading(true)

    try {
      await api.patch(`/companies/${id}/summaries/${sid}/approve`)
      qc.invalidateQueries({ queryKey: ['company', id] })
    } catch {
      alert('Approval failed')
    } finally {
      setApproveLoading(false)
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  const MetricCard = ({
    label,
    value,
    unit = '',
    color
  }: {
    label: string
    value: any
    unit?: string
    color?: string
  }) => (
    <div
      style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: '12px 16px',
        textAlign: 'center'
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: '#64748b',
          textTransform: 'uppercase',
          letterSpacing: '.06em'
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: color || '#1e3a5f',
          marginTop: 4
        }}
      >
        {value != null
          ? `${typeof value === 'number' ? value.toFixed(1) : value}${unit}`
          : '—'}
      </div>
    </div>
  )

  const formatM = (v: any) =>
    v != null ? `${(Number(v) / 1e6).toFixed(2)}M` : '—'

  const trendColor = (t: string, good: string, bad: string) =>
    t === good ? '#166534' : t === bad ? '#991b1b' : '#1e3a5f'

  // ── Render ─────────────────────────────────────────────────────────────
  if (isLoading)
    return (
      <Layout>
        <p style={{ color: '#64748b', padding: '2rem' }}>Loading...</p>
      </Layout>
    )

  if (isError || !data?.company)
    return (
      <Layout>
        <p style={{ color: '#dc2626', padding: '2rem' }}>
          Company not found.
        </p>
      </Layout>
    )

  const {
    company,
    financials = [],
    metrics,
    notes = [],
    score,
    summary
  } = data

  return (
    <Layout>
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 28
        }}
      >
        <div>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              fontSize: 13,
              padding: 0,
              marginBottom: 8
            }}
          >
            ← Back to Dashboard
          </button>

          <h1 style={{ fontSize: 26, color: '#1e3a5f', margin: 0 }}>
            {company.name}
          </h1>

          <p
            style={{
              color: '#64748b',
              margin: '4px 0 0',
              fontSize: 14
            }}
          >
            {[
              company.sector,
              company.country,
              company.founded_year
                ? `Est. ${company.founded_year}`
                : null
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>

          {company.description && (
            <p
              style={{
                color: '#475569',
                fontSize: 14,
                marginTop: 8,
                maxWidth: 600
              }}
            >
              {company.description}
            </p>
          )}
        </div>

        {score && (
          <div
            style={{
              background: '#1e3a5f',
              color: '#fff',
              padding: '14px 28px',
              borderRadius: 12,
              textAlign: 'center',
              flexShrink: 0
            }}
          >
            <div
              style={{
                fontSize: 11,
                opacity: 0.7,
                textTransform: 'uppercase',
                letterSpacing: '.06em'
              }}
            >
              Investment Score
            </div>

            <div
              style={{
                fontSize: 36,
                fontWeight: 700,
                lineHeight: 1
              }}
            >
              {Math.round(score.overall_score)}
            </div>

            <div style={{ fontSize: 11, opacity: 0.6 }}>/100</div>

            <div
              style={{
                fontSize: 11,
                marginTop: 6,
                opacity: 0.7
              }}
            >
              Growth: {Number(score.growth_score).toFixed(0)} · Efficiency:{' '}
              {Number(score.investment_score).toFixed(0)}
            </div>
          </div>
        )}
      </div>

      {/* ── AI Summary ── */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: 18
        }}
      >
        <div
          style={{
            fontWeight: 600,
            color: '#1e3a5f',
            marginBottom: 12
          }}
        >
          AI Summary (Groq + llama3)
        </div>

        {aiMsg && (
          <p
            style={{
              fontSize: 13,
              color: aiMsg.startsWith('✅')
                ? '#166534'
                : '#dc2626',
              marginBottom: 12
            }}
          >
            {aiMsg}
          </p>
        )}

        {summary ? (
          <div>
            <div
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                marginBottom: 10,
                flexWrap: 'wrap'
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  padding: '3px 10px',
                  borderRadius: 20,
                  fontWeight: 600,
                  background:
                    summary.status === 'approved'
                      ? '#dcfce7'
                      : summary.status === 'rejected'
                      ? '#fee2e2'
                      : '#fef9c3',
                  color:
                    summary.status === 'approved'
                      ? '#166534'
                      : summary.status === 'rejected'
                      ? '#991b1b'
                      : '#854d0e'
                }}
              >
                {summary.status.toUpperCase()}
              </span>

              <span
                style={{
                  fontSize: 12,
                  color: '#94a3b8'
                }}
              >
                Model: {summary.model_name} · Version:{' '}
                {summary.prompt_version} · Generated:{' '}
                {new Date(summary.generated_at).toLocaleDateString()}
              </span>
            </div>

            {(summary.status === 'approved' || canEdit) && (
              <p
                style={{
                  fontSize: 14,
                  lineHeight: 1.8,
                  color: '#374151',
                  background: '#f8fafc',
                  padding: 14,
                  borderRadius: 8
                }}
              >
                {summary.content}
              </p>
            )}

            {summary.status === 'pending' && !canEdit && (
              <p
                style={{
                  fontSize: 13,
                  color: '#94a3b8',
                  fontStyle: 'italic'
                }}
              >
                This summary is awaiting admin approval before it becomes
                visible.
              </p>
            )}

            {isAdmin && summary.status === 'pending' && (
              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  marginTop: 12
                }}
              >
                <button
                  onClick={() => handleApproveSummary(summary.id)}
                  disabled={approveLoading}
                  style={{
                    padding: '7px 20px',
                    background: '#16a34a',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 7,
                    cursor: 'pointer',
                    fontSize: 13,
                    opacity: approveLoading ? 0.6 : 1
                  }}
                >
                  {approveLoading
                    ? 'Approving...'
                    : '✓ Approve Summary'}
                </button>
              </div>
            )}

            {canEdit && (
              <button
                onClick={handleGenerateSummary}
                disabled={aiLoading}
                style={{
                  marginTop: 12,
                  padding: '6px 16px',
                  background: 'transparent',
                  color: '#7c3aed',
                  border: '1px solid #7c3aed',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 13,
                  opacity: aiLoading ? 0.6 : 1
                }}
              >
                {aiLoading
                  ? 'Generating... (may take 10s)'
                  : 'Regenerate Summary'}
              </button>
            )}
          </div>
        ) : (
          <div>
            <p
              style={{
                fontSize: 13,
                color: '#64748b',
                marginBottom: 12
              }}
            >
              {canEdit
                ? 'Generate an AI-powered investment summary using Groq (llama3).'
                : 'No AI summary available yet.'}
            </p>

            {canEdit && (
              <button
                onClick={handleGenerateSummary}
                disabled={aiLoading}
                style={{
                  padding: '9px 22px',
                  background: '#7c3aed',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 14,
                  opacity: aiLoading ? 0.6 : 1
                }}
              >
                {aiLoading
                  ? 'Generating... (may take 10s)'
                  : 'Generate AI Summary'}
              </button>
            )}

            {!canEdit && (
              <p
                style={{
                  fontSize: 13,
                  color: '#94a3b8',
                  fontStyle: 'italic'
                }}
              >
                Contact an analyst or admin to generate a summary.
              </p>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}
