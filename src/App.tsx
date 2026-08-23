import { useEffect, useRef, useState } from 'react'
import { gplxA1Questions } from './modules/gplx-a1'
import { K602_FEATURED_ARTICLE, type NewsArticle } from './data/news'
import {
  buildExam,
  buildTodayQueue,
  getReadiness,
  recordAnswer,
  selectModeQuestions,
} from './learning'
import { INITIAL_STATE, loadLocalState, saveLocalState } from './storage'
import {
  getAuthState,
  loadRemoteProgress,
  supabase,
  type AuthState,
} from './supabase'
import type {
  AttemptAnswer,
  ExamProfile,
  LocalState,
  MockAttempt,
  Question,
  QuestionProgress,
  StudyMode,
} from './types'

const LETTERS = ['A', 'B', 'C', 'D']
type View = 'portal' | 'article' | 'traffic-hub' | 'study' | 'exam'

function mergeProgress(
  local: Record<number, QuestionProgress>,
  remote: Record<number, QuestionProgress> | null | undefined,
) {
  const result = { ...(local || {}) }
  if (!remote) return result
  for (const [id, item] of Object.entries(remote)) {
    if (!item) continue
    const localItem = result[Number(id)]
    const localTime = localItem?.lastSeen ? new Date(localItem.lastSeen).getTime() : 0
    const remoteTime = item.lastSeen ? new Date(item.lastSeen).getTime() : 0
    if (!localItem || remoteTime > localTime) result[Number(id)] = item
  }
  return result
}

/* =========================================================================
   PORTAL COMPONENT (Trang chủ Kho K602 · Cổng thông tin nội bộ)
   ========================================================================= */
function Portal({
  questions,
  state,
  onOpenTrafficHub,
  onStartTrafficStudy,
  onStartTrafficExam,
  onReadArticle,
  onShowToast,
}: {
  questions: Question[]
  state: LocalState
  onOpenTrafficHub: () => void
  onStartTrafficStudy: (mode: Exclude<StudyMode, 'exam'>) => void
  onStartTrafficExam: (questionCount: number, durationMinutes: number) => void
  onReadArticle: (article: NewsArticle) => void
  onShowToast: (msg?: string) => void
}) {
  const [practiceTab, setPracticeTab] = useState<'pane-practice' | 'pane-theory'>('pane-practice')
  const [searchQuery, setSearchQuery] = useState('')
  const [clockStr, setClockStr] = useState('')

  // Calculate live readiness for Traffic Safety module
  const readiness = getReadiness(questions, state?.progress || {})
  const trafficPercent = Math.min(100, Math.max(0, Math.round(((readiness?.seen || 0) / questions.length) * 100)))

  // Tactical Clock updater
  useEffect(() => {
    function updateClock() {
      const now = new Date()
      const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']
      const d = String(now.getDate()).padStart(2, '0')
      const m = String(now.getMonth() + 1).padStart(2, '0')
      const y = now.getFullYear()
      const h = String(now.getHours()).padStart(2, '0')
      const min = String(now.getMinutes()).padStart(2, '0')
      const sec = String(now.getSeconds()).padStart(2, '0')
      setClockStr(`${days[now.getDay()]}, ${d}/${m}/${y} — ${h}:${min}:${sec}`)
    }
    updateClock()
    const timer = setInterval(updateClock, 1000)
    return () => clearInterval(timer)
  }, [])

  const qLower = searchQuery.trim().toLowerCase()
  const matchSearch = (text: string) => qLower === '' || text.toLowerCase().includes(qLower)

  const libraryTopics = [
    { code: 'TV-01', title: 'An toàn kho tàng', desc: 'Quy chuẩn, quy trình bảo đảm an toàn vũ khí, khí tài, đạn dược và phòng ngừa sự cố kỹ thuật.', search: 'an toan kho tang phong ngua su co' },
    { code: 'TV-02', title: 'Phòng cháy, chữa cháy', desc: 'Phương án tác chiến PCCC, kỹ thuật sử dụng trang bị cứu hỏa và cứu nạn tại chỗ trong doanh trại.', search: 'phong chay chua chay pccc cuu ho' },
    { code: 'TV-03', title: 'Nghiệp vụ xuất – nhập', desc: 'Quy trình giao nhận, thủ tục cấp phát, chế độ kiểm kê và ghi chép sổ sách kế toán quản lý vật tư.', search: 'nghiep vu xuat nhap kho so sach' },
    { code: 'TV-04', title: 'Bảo quản, bảo dưỡng', desc: 'Quy trình kỹ thuật bảo quản thường xuyên, định kỳ theo mùa và quy chuẩn niêm cất trang bị kỹ thuật.', search: 'bao quan bao duong niem cat trang bi vktbkt' },
    { code: 'TV-05', title: 'Điều lệnh & Chế độ', desc: 'Hệ thống Điều lệnh Quản lý bộ đội, Điều lệnh Đội ngũ và các quy định xây dựng nền nếp chính quy.', search: 'dieu lenh quan ly bo doi doi ngu' },
    { code: 'TV-06', title: 'Chính trị – Tư tưởng', desc: 'Tài liệu học tập chính trị, định hướng tư tưởng và giáo dục truyền thống vẻ vang của Tổng cục.', search: 'chinh tri tu tuong giao duc truyen thong' },
    {
      code: 'TV-07',
      title: 'An toàn giao thông đường bộ',
      desc: 'Bộ 150 câu hỏi trắc nghiệm Luật Trật tự an toàn giao thông đường bộ & sát hạch lái xe A1.',
      search: 'an toan giao thong duong bo gplx a1 xe may luat',
      isTraffic: true,
    },
  ]

  const practiceItems = [
    { code: 'LT-01', title: 'Luyện tập: An toàn kho tàng', desc: 'Bộ câu hỏi tình huống xử lý an toàn lao động và bảo đảm kỹ thuật kho quân khí.', tag: '4 Bài tập', search: 'an toan kho tang' },
    { code: 'LT-02', title: 'Luyện tập: Xử lý sự cố PCCC', desc: 'Thực hành báo động, triển khai đội hình ứng cứu và thao tác phương tiện chữa cháy tại chỗ.', tag: '3 Tình huống', search: 'phong chay chua chay pccc' },
    { code: 'LT-03', title: 'Luyện tập: Thủ tục Xuất – Nhập', desc: 'Kiểm tra quy cách niêm phong, kiểm đếm thực tế và xử lý chứng từ quân nhu, quân giới.', tag: '5 Tình huống', search: 'xuat nhap kho chung tu' },
    { code: 'LT-04', title: 'Luyện tập: Ngày Kỹ thuật', desc: 'Quy trình kiểm tra thông số kỹ thuật, lau chùi, tra dầu mỡ bảo dưỡng vũ khí, trang bị.', tag: '4 Bài tập', search: 'ngay ky thuat bao duong' },
    {
      code: 'LT-07',
      title: 'Luyện tập: An toàn giao thông A1',
      desc: `Luyện tập 150 câu hỏi lý thuyết sát hạch lái xe A1 (${readiness.seen}/150 câu đã học - ${trafficPercent}% hoàn thành).`,
      tag: '150 Câu hỏi',
      search: 'an toan giao thong a1 lai xe',
      isTraffic: true,
    },
  ]

  const theoryItems = [
    { code: 'GT-01', title: 'Giáo trình: Kỹ thuật đạn dược', desc: 'Hệ thống thông gió, kiểm soát nhiệt ẩm, chống sét và tiêu chuẩn an toàn kho quân khí.', tag: '6 Chuyên đề', search: 'ky thuat dan duoc' },
    { code: 'GT-02', title: 'Giáo trình: Sổ sách kế toán kho', desc: 'Hệ thống mẫu biểu nghiệp vụ, sổ theo dõi trang bị kỹ thuật theo quy định mới nhất.', tag: '4 Chuyên đề', search: 'so sach ke toan kho' },
    {
      code: 'GT-07',
      title: 'Giáo trình: Luật Giao thông đường bộ',
      desc: 'Hệ thống quy tắc giao thông, biển báo hiệu đường bộ và kỹ năng xử lý tình huống an toàn.',
      tag: '6 Nhóm kiến thức',
      search: 'luat giao thong bien bao',
      isTraffic: true,
    },
  ]

  const examListItems = [
    {
      code: 'KT-01',
      title: 'Kiểm tra Chuyên đề An toàn kho tàng',
      duration: 'Thời lượng: 30 phút',
      scope: 'Quy mô: 25 câu trắc nghiệm',
      target: 'Đối tượng: Thủ kho, nhân viên kỹ thuật',
      search: 'an toan kho tang kiem tra',
    },
    {
      code: 'KT-02',
      title: 'Kiểm tra Nghiệp vụ Phòng cháy & Chữa cháy',
      duration: 'Thời lượng: 25 phút',
      scope: 'Quy mô: 20 câu hỏi',
      target: 'Đối tượng: Toàn thể quân nhân',
      search: 'phong chay chua chay pccc kiem tra',
    },
    {
      code: 'KT-03',
      title: 'Kiểm tra Nhận thức Điều lệnh Quản lý bộ đội',
      duration: 'Thời lượng: 20 phút',
      scope: 'Quy mô: 20 câu trắc nghiệm',
      target: 'Đối tượng: Sĩ quan, QNCN, Hạ sĩ quan - Binh sĩ',
      search: 'dieu lenh quan ly bo doi kiem tra',
    },
    {
      code: 'KT-07',
      title: 'Sát hạch Chuyên đề: An toàn giao thông đường bộ',
      duration: 'Thời lượng: 30 phút',
      scope: 'Quy mô: 50 câu trắc nghiệm',
      target: 'Đối tượng: Toàn thể quân nhân sát hạch A1',
      search: 'an toan giao thong sat hach 50 cau',
      isTraffic: true,
    },
  ]

  return (
    <>
      {/* KHỐI HEADER TRỐNG ĐỒNG BỘ ĐỘI */}
      <header className="header-wrapper">
        <div className="top-strip">
          <div className="container">
            <div className="motto-tag">KỶ LUẬT LÀ SỨC MẠNH CỦA QUÂN ĐỘI</div>
            <div className="tradition-motto"><span>ĐOÀN KẾT · ANH DŨNG · SÁNG TẠO · VƯỢT KHÓ</span></div>
            <div className="live-time">{clockStr}</div>
          </div>
        </div>

        <div className="brand-bar">
          <div className="container">
            <div className="brand-profile" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="insignia" title="Quân kỳ QĐND Việt Nam">
                <svg viewBox="0 0 24 24"><polygon points="12,2 15,9 22,9 16.5,13.5 18.5,21 12,16.5 5.5,21 7.5,13.5 2,9 9,9"/></svg>
              </div>
              <div className="brand-meta">
                <h1>KHO K602</h1>
                <div className="sub-org">Tổng cục Công nghiệp Quốc phòng</div>
              </div>
            </div>
            <div className="quick-search">
              <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tra cứu chuyên đề, tài liệu, bài thi..."
              />
            </div>
          </div>
        </div>
      </header>

      {/* MENU ĐIỀU HƯỚNG CHÍNH QUY */}
      <nav className="main-nav">
        <div className="container">
          <ul>
            <li><a href="#trang-chu" className="active">Trang chủ</a></li>
            <li><a href="#tin-tuc">Tin tức &amp; Mệnh lệnh</a></li>
            <li><a href="#thu-vien">Thư viện nghiệp vụ</a></li>
            <li><a href="#hoc-tap">Luyện tập &amp; Bồi dưỡng</a></li>
            <li><a href="#kiem-tra">Kiểm tra đánh giá</a></li>
            <li><a href="#gioi-thieu">Giới thiệu đơn vị</a></li>
          </ul>
        </div>
      </nav>

      <main>
        {/* HERO QUẢN TRỊ */}
        <section className="hero-block" id="trang-chu">
          <div className="container hero-grid">
            <div className="hero-main-text">
              <h2>Hệ thống quản trị kiến thức &amp; huấn luyện nghiệp vụ <span>Kho K602</span></h2>
              <p>Cổng thông tin phục vụ công tác tra cứu quy trình, điều lệnh, kỹ thuật bảo quản trang bị và ôn luyện, kiểm tra nhận thức định kỳ của cán bộ, chiến sĩ và công nhân viên quốc phòng trong toàn đơn vị.</p>
              
              <div className="stats-strip">
                <div className="stat-box">
                  <div className="num">08</div>
                  <div className="desc">Chuyên đề kho</div>
                </div>
                <div className="stat-box">
                  <div className="num">24</div>
                  <div className="desc">Bài luyện tập</div>
                </div>
                <div className="stat-box">
                  <div className="num">06</div>
                  <div className="desc">Đề kiểm tra</div>
                </div>
                <div className="stat-box">
                  <div className="num">100%</div>
                  <div className="desc">Chính quy hóa</div>
                </div>
              </div>
            </div>

            {/* BẢNG MỆNH LỆNH & THÔNG TIN CHỈ ĐẠO */}
            <aside className="directive-board">
              <div className="directive-head">
                <h3>Thông tin chỉ đạo &amp; Huấn luyện</h3>
                <span className="badge-dispatch">Mới nhất</span>
              </div>
              <div className="directive-body">
                <div className="directive-row" onClick={() => onReadArticle(K602_FEATURED_ARTICLE)}>
                  <h4>{K602_FEATURED_ARTICLE.title}</h4>
                  <div className="meta">Ban Chính trị · 26/03/2025 · 837 lượt xem</div>
                </div>
                <div className="directive-row" onClick={() => onShowToast('Chức năng văn bản chỉ đạo đang được đồng bộ.')}>
                  <h4>Kế hoạch hội thao huấn luyện chuyên môn kỹ thuật Quý III</h4>
                  <div className="meta">Ban Tham mưu · 20/08/2026</div>
                </div>
                <div className="directive-row" onClick={() => onShowToast('Chức năng văn bản chỉ đạo đang được đồng bộ.')}>
                  <h4>Kế hoạch kiểm tra công tác An toàn kho tàng và PCCC định kỳ</h4>
                  <div className="meta">Ban Kỹ thuật · 15/08/2026</div>
                </div>
                <div className="directive-row" onClick={() => onShowToast('Chức năng văn bản chỉ đạo đang được đồng bộ.')}>
                  <h4>Tổng kết công tác bảo quản, niêm cất trang bị kỹ thuật 6 tháng đầu năm</h4>
                  <div className="meta">Ban Chính trị · 02/08/2026</div>
                </div>
              </div>
            </aside>
          </div>
        </section>

        {/* THƯ VIỆN NGHIỆP VỤ KHO */}
        <section className="section-zone" id="thu-vien">
          <div className="container">
            <div className="section-title-bar">
              <h2>Thư viện nghiệp vụ kho</h2>
            </div>

            <div className="grid-cadre" id="libGrid">
              {libraryTopics
                .filter((item) => matchSearch(item.search + ' ' + item.title + ' ' + item.desc))
                .map((item) => (
                  <div
                    className={`card-module ${item.isTraffic ? 'special-featured' : ''}`}
                    key={item.code}
                  >
                    <span className="module-code">{item.code}</span>
                    <h3>{item.title}</h3>
                    <p>{item.desc}</p>
                    <div className="card-action-bar">
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                        {item.isTraffic ? 'Sẵn sàng học' : 'Mục lục chính quy'}
                      </span>
                      {item.isTraffic ? (
                        <button className="btn-command" onClick={onOpenTrafficHub}>
                          Tra cứu tài liệu →
                        </button>
                      ) : (
                        <button
                          className="btn-command"
                          onClick={() => onShowToast('Tài liệu nghiệp vụ đang được cập nhật số hoá.')}
                        >
                          Tra cứu tài liệu →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </section>

        {/* LUYỆN TẬP & HỌC TẬP */}
        <section className="section-zone alt" id="hoc-tap">
          <div className="container">
            <div className="section-title-bar">
              <h2>Luyện tập &amp; Bồi dưỡng cán bộ</h2>
            </div>

            <div className="switch-tabs">
              <button
                className={`tab-pill ${practiceTab === 'pane-practice' ? 'active' : ''}`}
                onClick={() => setPracticeTab('pane-practice')}
              >
                Hệ thống Luyện tập
              </button>
              <button
                className={`tab-pill ${practiceTab === 'pane-theory' ? 'active' : ''}`}
                onClick={() => setPracticeTab('pane-theory')}
              >
                Giáo trình Nghiệp vụ
              </button>
            </div>

            {practiceTab === 'pane-practice' ? (
              <div className="grid-cadre">
                {practiceItems
                  .filter((item) => matchSearch(item.search + ' ' + item.title + ' ' + item.desc))
                  .map((item) => (
                    <div
                      className={`card-module ${item.isTraffic ? 'special-featured' : ''}`}
                      key={item.code}
                    >
                      <span className="module-code">{item.code}</span>
                      <h3>{item.title}</h3>
                      <p>{item.desc}</p>
                      <div className="card-action-bar">
                        <span className="tag-cat">{item.tag}</span>
                        {item.isTraffic ? (
                          <button className="btn-command" onClick={() => onStartTrafficStudy('all')}>
                            Vào luyện tập →
                          </button>
                        ) : (
                          <button
                            className="btn-command"
                            onClick={() => onShowToast('Nội dung bài luyện tập đang được chuẩn bị.')}
                          >
                            Vào luyện tập →
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="grid-cadre">
                {theoryItems
                  .filter((item) => matchSearch(item.search + ' ' + item.title + ' ' + item.desc))
                  .map((item) => (
                    <div
                      className={`card-module ${item.isTraffic ? 'special-featured' : ''}`}
                      key={item.code}
                    >
                      <span className="module-code">{item.code}</span>
                      <h3>{item.title}</h3>
                      <p>{item.desc}</p>
                      <div className="card-action-bar">
                        <span className="tag-cat">{item.tag}</span>
                        {item.isTraffic ? (
                          <button className="btn-command" onClick={onOpenTrafficHub}>
                            Xem giáo trình →
                          </button>
                        ) : (
                          <button
                            className="btn-command"
                            onClick={() => onShowToast('Giáo trình nghiệp vụ đang được biên soạn.')}
                          >
                            Xem giáo trình →
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </section>

        {/* KIỂM TRA ĐÁNH GIÁ */}
        <section className="section-zone" id="kiem-tra">
          <div className="container">
            <div className="section-title-bar">
              <h2>Kiểm tra đánh giá nhận thức</h2>
            </div>

            <div className="exam-list" id="examContainer">
              {examListItems
                .filter((item) => matchSearch(item.search + ' ' + item.title))
                .map((item) => (
                  <div
                    className={`exam-card ${item.isTraffic ? 'special-featured' : ''}`}
                    key={item.code}
                  >
                    <div className="exam-main">
                      <span className="exam-code">{item.code}</span>
                      <div className="exam-title">
                        <h3>{item.title}</h3>
                        <div className="exam-meta">
                          <span>{item.duration}</span>
                          <span>{item.scope}</span>
                          <span>{item.target}</span>
                        </div>
                      </div>
                    </div>
                    {item.isTraffic ? (
                      <button className="btn-start-exam" onClick={() => onStartTrafficExam(50, 30)}>
                        Vào phòng thi
                      </button>
                    ) : (
                      <button
                        className="btn-start-exam"
                        onClick={() => onShowToast('Đề thi đang trong thời gian chuẩn bị.')}
                      >
                        Vào phòng thi
                      </button>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </section>

        {/* TIN TỨC HOẠT ĐỘNG & MỆNH LỆNH */}
        <section className="section-zone alt" id="tin-tuc">
          <div className="container">
            <div className="section-title-bar">
              <h2>Tin tức &amp; Hoạt động đơn vị</h2>
            </div>

            <div className="news-layout-grid">
              <div>
                {/* Featured 60th Anniversary Article */}
                <article
                  className="news-card-unit"
                  onClick={() => onReadArticle(K602_FEATURED_ARTICLE)}
                >
                  <div className="news-badge-icon">
                    <img src={K602_FEATURED_ARTICLE.heroImage} alt={K602_FEATURED_ARTICLE.title} />
                  </div>
                  <div className="news-content">
                    <span className="tag-cat">{K602_FEATURED_ARTICLE.tagLabel}</span>
                    <h3>{K602_FEATURED_ARTICLE.title}</h3>
                    <p>{K602_FEATURED_ARTICLE.summary}</p>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      📅 {K602_FEATURED_ARTICLE.date} · ✍️ {K602_FEATURED_ARTICLE.unit} ({K602_FEATURED_ARTICLE.author}) · 👁️ {K602_FEATURED_ARTICLE.views} lượt xem
                    </div>
                  </div>
                </article>

                <article
                  className="news-card-unit"
                  onClick={() => onShowToast('Bài viết đang được chuẩn bị.')}
                >
                  <div className="news-badge-icon">
                    <svg viewBox="0 0 24 24"><polygon points="12,2 15,9 22,9 16.5,13.5 18.5,21 12,16.5 5.5,21 7.5,13.5 2,9 9,9"/></svg>
                  </div>
                  <div className="news-content">
                    <span className="tag-cat">Huấn luyện</span>
                    <h3>Hội thao huấn luyện thể lực và chuyên môn kỹ thuật Quý III</h3>
                    <p>Nâng cao chất lượng rèn luyện thể lực, tác phong chính quy và khả năng làm chủ trang bị kỹ thuật cho cán bộ, chiến sĩ trong đơn vị.</p>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      20/08/2026 · Ban Chính trị
                    </div>
                  </div>
                </article>

                <article
                  className="news-card-unit"
                  onClick={() => onShowToast('Bài viết đang được chuẩn bị.')}
                >
                  <div className="news-badge-icon">
                    <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                  </div>
                  <div className="news-content">
                    <span className="tag-cat">Kế hoạch</span>
                    <h3>Kế hoạch kiểm tra chuyên đề An toàn kho tàng định kỳ tháng 9</h3>
                    <p>Phân công nhiệm vụ, thời gian và nội dung kiểm tra công tác kỹ thuật an toàn tại tất cả các phân kho độc lập.</p>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      15/08/2026 · Ban Tham mưu
                    </div>
                  </div>
                </article>

                <article
                  className="news-card-unit"
                  onClick={() => onShowToast('Bài viết đang được chuẩn bị.')}
                >
                  <div className="news-badge-icon">
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  </div>
                  <div className="news-content">
                    <span className="tag-cat">Kỹ thuật</span>
                    <h3>Tổng kết công tác bảo quản, niêm cất trang bị kỹ thuật 6 tháng đầu năm</h3>
                    <p>Đánh giá kết quả thực hiện ngày kỹ thuật, công tác đồng bộ và định hướng nhiệm vụ bảo đảm an toàn kho quý tiếp theo.</p>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      02/08/2026 · Ban Kỹ thuật
                    </div>
                  </div>
                </article>
              </div>

              {/* Văn bản chỉ đạo */}
              <div className="order-box">
                <h3>Văn bản chỉ đạo</h3>
                <ul className="order-list">
                  <li><a href="#" onClick={(e) => { e.preventDefault(); onShowToast('Văn bản đang được lưu trữ nội bộ.'); }}>▸ Hướng dẫn công tác phòng chống cháy nổ mùa khô 2026</a></li>
                  <li><a href="#" onClick={(e) => { e.preventDefault(); onShowToast('Văn bản đang được lưu trữ nội bộ.'); }}>▸ Quy định nghiêm ngặt về bảo đảm an toàn thông tin quân sự</a></li>
                  <li><a href="#" onClick={(e) => { e.preventDefault(); onShowToast('Văn bản đang được lưu trữ nội bộ.'); }}>▸ Chỉ thị tăng cường xây dựng nền nếp chính quy, quản lý kỷ luật</a></li>
                  <li><a href="#" onClick={(e) => { e.preventDefault(); onShowToast('Văn bản đang được lưu trữ nội bộ.'); }}>▸ Quy chế bảo mật và niêm phong cửa kho quân khí</a></li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* THÔNG TIN DOANH TRẠI */}
        <section className="section-zone" id="gioi-thieu">
          <div className="container">
            <div className="profile-box">
              <div className="profile-text">
                <h3>KHO K602</h3>
                <p>Kho K602 là đơn vị trực thuộc Tổng cục Công nghiệp Quốc phòng, có chức năng quản lý, tiếp nhận, bảo quản, bảo dưỡng và cấp phát vật tư, trang bị kỹ thuật phục vụ cho nhiệm vụ quốc phòng an ninh.</p>
                <p>Hệ thống Cổng thông tin nội bộ được xây dựng nhằm chuẩn hóa cơ sở dữ liệu chuyên môn, nâng cao ý thức chấp hành kỷ luật, điều lệnh và rèn luyện kỹ năng nghiệp vụ chính quy cho toàn thể quân nhân.</p>
              </div>
              <div>
                <table className="data-sheet">
                  <tbody>
                    <tr>
                      <th>Đơn vị:</th>
                      <td>Kho K602</td>
                    </tr>
                    <tr>
                      <th>Trực thuộc:</th>
                      <td>Tổng cục Công nghiệp Quốc phòng</td>
                    </tr>
                    <tr>
                      <th>Địa bàn:</th>
                      <td>Phường Vạn Xuân, tỉnh Thái Nguyên</td>
                    </tr>
                    <tr>
                      <th>Nhiệm vụ:</th>
                      <td>Quản lý, bảo quản, bảo dưỡng VKTBKT</td>
                    </tr>
                    <tr>
                      <th>Truyền thống:</th>
                      <td style={{ color: 'var(--flag-red)', fontWeight: 700, letterSpacing: '0.02em' }}>
                        ĐOÀN KẾT · ANH DŨNG · SÁNG TẠO · VƯỢT KHÓ
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer>
        <div className="container footer-grid">
          <div className="footer-col">
            <h4>Kho K602 · Tổng cục CNQP</h4>
            <p>Địa chỉ: Phường Vạn Xuân, tỉnh Thái Nguyên<br />Hệ thống Quản trị tri thức nghiệp vụ &amp; Huấn luyện quân sự chính quy.</p>
          </div>
          <div className="footer-col">
            <h4>Mục lục tác chiến</h4>
            <ul>
              <li><a href="#tin-tuc">Tin tức &amp; Mệnh lệnh</a></li>
              <li><a href="#thu-vien">Thư viện nghiệp vụ</a></li>
              <li><a href="#hoc-tap">Luyện tập chuyên đề</a></li>
              <li><a href="#kiem-tra">Kiểm tra đánh giá</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Yêu cầu chính quy</h4>
            <p>Tuyệt đối chấp hành quy chế bảo mật quân sự, an toàn kho tàng và điều lệnh quản lý bộ đội.</p>
          </div>
        </div>
        <div className="container">
          <div className="copyright">
            © {new Date().getFullYear()} Kho K602 — Tổng cục Công nghiệp Quốc phòng. Mọi thông tin được quản lý nội bộ.
          </div>
        </div>
      </footer>
    </>
  )
}

/* =========================================================================
   ARTICLE FULL-PAGE VIEW COMPONENT (Xem toàn trang bài viết)
   ========================================================================= */
function ArticleFullPage({
  article,
  onBackToPortal,
}: {
  article: NewsArticle
  onBackToPortal: () => void
}) {
  return (
    <div className="article-fullpage-view">
      {/* TOP HEADER */}
      <header className="header-wrapper">
        <div className="brand-bar" style={{ padding: '16px 0' }}>
          <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="brand-profile" onClick={onBackToPortal}>
              <div className="insignia" style={{ width: '48px', height: '48px' }} title="Quân kỳ QĐND Việt Nam">
                <svg viewBox="0 0 24 24" style={{ width: '28px', height: '28px' }}><polygon points="12,2 15,9 22,9 16.5,13.5 18.5,21 12,16.5 5.5,21 7.5,13.5 2,9 9,9"/></svg>
              </div>
              <div className="brand-meta">
                <h1 style={{ fontSize: '24px' }}>KHO K602</h1>
                <div className="sub-org" style={{ fontSize: '11px' }}>Tổng cục Công nghiệp Quốc phòng</div>
              </div>
            </div>
            <button className="btn-back-article" onClick={onBackToPortal}>
              ← Quay lại Cổng thông tin
            </button>
          </div>
        </div>
      </header>

      {/* BREADCRUMB BAR */}
      <div className="article-breadcrumb-bar">
        <div className="container article-breadcrumb-content">
          <div className="article-breadcrumb-trail">
            <span style={{ cursor: 'pointer' }} onClick={onBackToPortal}>Trang chủ</span>
            <span>/</span>
            <span style={{ cursor: 'pointer' }} onClick={onBackToPortal}>Tin tức đơn vị</span>
            <span>/</span>
            <span style={{ color: 'var(--green-deep)', fontWeight: 600 }}>{article.tagLabel}</span>
          </div>
          <button className="btn-back-article" onClick={onBackToPortal}>
            ← Quay lại Trang chủ
          </button>
        </div>
      </div>

      {/* MAIN ARTICLE BODY */}
      <main className="article-container">
        <article className="article-paper">
          <header className="article-header">
            <span className="article-badge-top">Tin tức đơn vị · {article.tagLabel}</span>
            <h1 className="article-main-title">{article.title}</h1>
            <div className="article-meta-row">
              <div className="article-meta-item">
                <span>📅 Ngày đăng:</span>
                <strong>{article.date}</strong>
              </div>
              <span>·</span>
              <div className="article-meta-item">
                <span>✍️ Tác giả:</span>
                <strong>{article.author} ({article.unit})</strong>
              </div>
              <span>·</span>
              <div className="article-meta-item">
                <span>👁️ Lượt xem:</span>
                <strong>{article.views}</strong>
              </div>
            </div>
          </header>

          {article.summary && (
            <div className="article-sapo">
              {article.summary}
            </div>
          )}

          <div className="article-body-content">
            {article.content.map((block, idx) => {
              if (block.type === 'paragraph' && block.text) {
                return (
                  <p key={idx} className="article-paragraph">
                    {block.text}
                  </p>
                )
              }
              if (block.type === 'image' && block.imageUrl) {
                return (
                  <figure key={idx} className="article-figure">
                    <img src={block.imageUrl} alt={block.caption || 'Hình ảnh tư liệu'} loading="lazy" />
                    {block.caption && (
                      <figcaption>{block.caption}</figcaption>
                    )}
                  </figure>
                )
              }
              return null
            })}

            <div className="article-signature-box">
              <div>
                <span className="news-tag hoatdong">{article.tagLabel}</span>
              </div>
              <div className="article-signature-text">
                <div className="author-name">{article.author}</div>
                <div className="unit-name">{article.unit} — Kho K602</div>
              </div>
            </div>
          </div>

          <div className="article-bottom-nav">
            <button className="btn-back-article" onClick={onBackToPortal}>
              ← Quay lại Cổng thông tin
            </button>
            <button
              className="subtle-button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              Lên đầu trang ↑
            </button>
          </div>
        </article>
      </main>

      {/* FOOTER */}
      <footer>
        <div className="container footer-grid">
          <div>
            <h4>Kho K602</h4>
            <p>Tổng cục Công nghiệp Quốc phòng<br />Phường Vạn Xuân, tỉnh Thái Nguyên</p>
          </div>
          <div>
            <h4>Liên kết nhanh</h4>
            <ul>
              <li><a href="#" onClick={(e) => { e.preventDefault(); onBackToPortal(); }}>Trang chủ</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); onBackToPortal(); }}>Thư viện kho</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); onBackToPortal(); }}>Kiểm tra</a></li>
            </ul>
          </div>
          <div>
            <h4>Liên hệ</h4>
            <ul>
              <li>Điện thoại: Đang cập nhật</li>
              <li>Email: Đang cập nhật</li>
            </ul>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>© {new Date().getFullYear()} Kho K602 — Tổng cục Công nghiệp Quốc phòng</span>
          <span>Cổng thông tin nội bộ</span>
        </div>
      </footer>
    </div>
  )
}

/* =========================================================================
   TRAFFIC SAFETY HUB (Chuyên đề An toàn giao thông đường bộ)
   ========================================================================= */
function TrafficSafetyHub({
  questions,
  state,
  onBackToPortal,
  onStart,
  onStartChapter,
  onStartExam,
}: {
  questions: Question[]
  state: LocalState
  onBackToPortal: () => void
  onStart: (mode: Exclude<StudyMode, 'exam'>) => void
  onStartChapter: (chapter: string) => void
  onStartExam: (questionCount: number, durationMinutes: number) => void
}) {
  const readiness = getReadiness(questions, state?.progress || {})
  const weakCount = questions.filter((question) => {
    const item = state?.progress?.[question.id]
    return Boolean(item && item.lastResult === 'wrong')
  }).length
  const chapters = [...new Set(questions.map((question) => question.chapter))]

  return (
    <div className="traffic-hub-wrap">
      <div className="module-header-bar">
        <div className="container module-header-content">
          <button className="btn-back-portal" onClick={onBackToPortal}>
            ← Về Cổng thông tin Kho K602
          </button>
          <span className="eyebrow" style={{ color: 'var(--green-mid)', fontWeight: 600 }}>
            CHUYÊN ĐỀ ATGT · 150 CÂU HỎI
          </span>
        </div>
      </div>

      <main className="page-shell">
        <section className="hero-grid" style={{ marginBottom: '24px' }}>
          <div className="hero-card">
            <div>
              <div className="eyebrow">CHUYÊN ĐỀ NGHIỆP VỤ</div>
              <h1 style={{ fontSize: '26px', textTransform: 'uppercase', color: 'var(--green-deep)', marginTop: '4px' }}>
                An toàn giao thông đường bộ
              </h1>
              <p style={{ fontSize: '13.5px', color: 'var(--ink-soft)', marginTop: '6px' }}>
                Bộ 150 câu hỏi trắc nghiệm luật trật tự, an toàn giao thông đường bộ theo quy chuẩn sát hạch lái xe A1.
              </p>
            </div>
          </div>

          <div className="readiness-card">
            <div className="progress-ring" style={{ '--score': `${(readiness?.score || 0) * 3.6}deg` } as React.CSSProperties}>
              <div>
                <strong>{readiness?.score || 0}%</strong>
                <span>Đã học</span>
              </div>
            </div>
            <div className="readiness-details">
              <h3>Độ sẵn sàng</h3>
              <p>Đã học {readiness?.seen || 0}/{questions.length} câu hỏi trong chương trình</p>
            </div>
          </div>
        </section>

        <div>
          <h2 style={{ fontSize: '18px', textTransform: 'uppercase', color: 'var(--green-deep)', marginBottom: '12px' }}>
            Chế độ ôn luyện
          </h2>
          <section className="quick-grid">
            <button className="quick-card" onClick={() => onStart('all')}>
              <div>
                <strong>Học toàn bộ {questions.length} câu</strong>
                <small>Ôn tập lần lượt toàn bộ câu hỏi</small>
              </div>
              <span className="arrow-text">Vào học →</span>
            </button>
            <button className="quick-card" onClick={() => onStart('weak')}>
              <div>
                <strong>Câu hay làm sai</strong>
                <small>{weakCount > 0 ? `${weakCount} câu cần ôn luyện lại` : 'Không có câu sai nào'}</small>
              </div>
              <span className="arrow-text">{weakCount > 0 ? 'Vào học →' : 'Luyện tập'}</span>
            </button>
            <button className="quick-card" onClick={() => onStart('critical')}>
              <div>
                <strong>Câu trọng yếu (Điểm liệt)</strong>
                <small>{readiness?.criticalMastered || 0}/{readiness?.criticalTotal || 0} câu đã vững</small>
              </div>
              <span className="arrow-text">Vào học →</span>
            </button>
          </section>
        </div>

        <section className="dashboard-grid">
          <article className="panel">
            <div className="panel-heading">
              <div>
                <h2>Các nhóm kiến thức</h2>
              </div>
              <span style={{ fontSize: '12.5px', color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)' }}>
                {readiness?.seen || 0}/{questions.length} câu ({readiness?.score || 0}%)
              </span>
            </div>
            <div className="chapter-list">
              {chapters.map((chapter) => {
                const chapterQuestions = questions.filter((question) => question.chapter === chapter)
                const seenCount = chapterQuestions.filter(
                  (question) => (state?.progress?.[question.id]?.seen ?? 0) > 0,
                ).length
                const remainingCount = Math.max(0, chapterQuestions.length - seenCount)
                const percentLearned = Math.min(100, Math.max(0, Math.round((seenCount / chapterQuestions.length) * 100)))
                const isComplete = percentLearned === 100
                const nextQuestionNum = Math.min(seenCount + 1, chapterQuestions.length)

                return (
                  <button
                    type="button"
                    className="chapter-row"
                    key={chapter}
                    onClick={() => onStartChapter(chapter)}
                    aria-label={`Luyện nhóm ${chapter}`}
                  >
                    <div className="chapter-row-header">
                      <strong>{chapter}</strong>
                      <span className={`chapter-percent ${isComplete ? 'complete' : ''}`}>
                        {percentLearned}% đã học
                      </span>
                    </div>
                    <div className="bar">
                      <i className={isComplete ? 'complete-bar' : ''} style={{ width: `${percentLearned}%` }} />
                    </div>
                    <div className="chapter-row-footer">
                      <span>
                        {isComplete ? (
                          <>Đã hoàn thành: <b>{chapterQuestions.length}/{chapterQuestions.length} câu</b></>
                        ) : (
                          <>Tiếp tục: <b>Câu {nextQuestionNum}/{chapterQuestions.length}</b></>
                        )}
                      </span>
                      <span>
                        {isComplete ? (
                          <b style={{ color: '#059669' }}>✓ Đạt yêu cầu</b>
                        ) : (
                          <>Còn lại: <b>{remainingCount} câu</b></>
                        )}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </article>

          <aside className="panel exam-panel">
            <div className="exam-panel-header">
              <span className="eyebrow">Mô phỏng kỳ thi</span>
              <h2>Thi thử sát hạch</h2>
              <p>Bộ đề 50 câu hỏi trắc nghiệm chuẩn trong thời gian 30 phút.</p>
            </div>

            <div className="exam-summary-strip" style={{ marginTop: '16px' }}>
              <div className="exam-summary-item">
                <span>Số câu hỏi</span>
                <strong>50 câu</strong>
              </div>
              <div className="exam-summary-item">
                <span>Thời gian</span>
                <strong>30 phút</strong>
              </div>
              <div className="exam-summary-item">
                <span>Lượt đã thi</span>
                <strong>{(state?.attempts || []).length} lượt</strong>
              </div>
            </div>

            <button
              className="primary-exam-button"
              onClick={() => onStartExam(50, 30)}
              style={{ marginTop: '20px' }}
            >
              Bắt đầu thi thử (50 câu - 30 phút)
            </button>
          </aside>
        </section>
      </main>
    </div>
  )
}

/* =========================================================================
   QUESTION CARD COMPONENT
   ========================================================================= */
function QuestionCard({
  question,
  position,
  total,
  selected,
  answered,
  unsure,
  examMode,
  canPrev,
  canNext,
  onPrev,
  onSelect,
  onToggleUnsure,
  onNext,
}: {
  question: Question
  position: number
  total: number
  selected: number | null
  answered: boolean
  unsure: boolean
  examMode: boolean
  canPrev?: boolean
  canNext?: boolean
  onPrev?: () => void
  onSelect: (index: number) => void
  onToggleUnsure: () => void
  onNext: () => void
}) {
  return (
    <article className="question-card">
      <div className="question-topline">
        <span className="question-index-badge">Câu {position} / {total} (Mã #{question.id})</span>
        <div className="question-badges">
          {question.critical && <b className="critical-badge">★ Câu trọng yếu (Điểm liệt)</b>}
          <span className="chapter-badge">{question.chapter}</span>
        </div>
      </div>
      <div className="question-progress">
        <i style={{ width: `${(position / total) * 100}%` }} />
      </div>

      <h1>{question.question}</h1>

      {question.image && (
        <figure className="question-image">
          <img src={question.image} alt={`Hình minh họa câu ${question.id}`} />
        </figure>
      )}

      <div className="option-list">
        {question.options.map((option, index) => {
          let stateClass = selected === index ? 'selected' : ''
          if (answered && index === question.answer) stateClass = 'correct'
          if (answered && selected === index && index !== question.answer) stateClass = 'wrong'

          return (
            <button
              className={`option-button ${stateClass}`}
              onClick={() => onSelect(index)}
              disabled={answered && !examMode}
              key={option}
            >
              <span className="option-letter">{LETTERS[index]}</span>
              <strong>{option}</strong>
            </button>
          )
        })}
      </div>

      {!examMode && !answered && (
        <button className={`unsure-button ${unsure ? 'active' : ''}`} onClick={onToggleUnsure}>
          {unsure ? 'Đã đánh dấu chưa chắc' : 'Chưa chắc chắn'}
        </button>
      )}

      {answered && !examMode && (
        <div className={`feedback-box ${selected === question.answer ? 'success' : 'error'}`}>
          <strong>{selected === question.answer ? '✓ Chính xác' : '✗ Chưa chính xác'}</strong>
          <p style={{ marginTop: '4px' }}><strong>Đáp án đúng:</strong> {question.options[question.answer]}</p>
        </div>
      )}

      {answered && examMode && (
        <div className={`feedback-box ${selected === question.answer ? 'success' : 'error'}`}>
          <strong>
            {selected === question.answer
              ? '✓ Chính xác'
              : selected === -1 || selected === null
              ? '⚠️ Bạn chưa trả lời câu này'
              : '✗ Chưa chính xác'}
          </strong>
          <p style={{ marginTop: '4px' }}><strong>Đáp án đúng:</strong> {question.options[question.answer]}</p>
        </div>
      )}

      <div className="sticky-bottom-actions">
        {canPrev !== undefined && onPrev && (
          <button className="outline-button nav-prev-btn" disabled={!canPrev} onClick={onPrev}>
            ← Câu trước
          </button>
        )}
        <button
          className="primary-button nav-next-btn"
          disabled={!examMode && selected === null && !answered}
          onClick={onNext}
        >
          {examMode
            ? position === total
              ? 'Nộp bài thi'
              : 'Câu tiếp theo →'
            : answered
            ? position === total
              ? 'Hoàn thành'
              : 'Câu tiếp theo →'
            : 'Kiểm tra đáp án'}
        </button>
      </div>
    </article>
  )
}

/* =========================================================================
   STUDY COMPONENT
   ========================================================================= */
function Study({
  queue,
  title,
  sessionKey,
  initialIndex = 0,
  setState,
  onExit,
}: {
  queue: Question[]
  title: string
  sessionKey?: string
  initialIndex?: number
  state: LocalState
  setState: React.Dispatch<React.SetStateAction<LocalState>>
  onExit: () => void
}) {
  const [items] = useState(queue)
  const [index, setIndex] = useState(() => Math.min(Math.max(0, initialIndex), Math.max(0, queue.length - 1)))
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, { selected: number; answered: boolean; correct: boolean }>>({})
  const [unsureMap, setUnsureMap] = useState<Record<number, boolean>>({})
  const [isCompleted, setIsCompleted] = useState(false)
  const startedAt = useRef(Date.now())

  useEffect(() => {
    setIndex(Math.min(Math.max(0, initialIndex), Math.max(0, queue.length - 1)))
    setIsCompleted(false)
  }, [initialIndex])

  const currentIndex = Math.min(Math.max(0, index), items.length - 1)
  const question = items[currentIndex]

  const updateSavedIndex = (newIdx: number) => {
    if (sessionKey) {
      setState((current) => ({
        ...current,
        sessionProgress: {
          ...(current.sessionProgress || {}),
          [sessionKey]: newIdx,
        },
        lastUpdatedAt: new Date().toISOString(),
      }))
    }
  }

  const currentAnswerState = question ? selectedAnswers[question.id] : undefined
  const selected = currentAnswerState ? currentAnswerState.selected : null
  const answered = currentAnswerState ? currentAnswerState.answered : false
  const unsure = question ? (unsureMap[question.id] ?? false) : false

  const goToIndex = (newIdx: number) => {
    const clamped = Math.max(0, Math.min(newIdx, items.length - 1))
    setIndex(clamped)
    updateSavedIndex(clamped)
    startedAt.current = Date.now()
  }

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ('1234'.includes(event.key) && !answered && question) {
        const option = Number(event.key) - 1
        if (option < question.options.length) {
          setSelectedAnswers((prev) => ({
            ...prev,
            [question.id]: { selected: option, answered: false, correct: false },
          }))
        }
      } else if (event.key === 'ArrowLeft' && currentIndex > 0) {
        goToIndex(currentIndex - 1)
      } else if (event.key === 'ArrowRight' && currentIndex < items.length - 1 && answered) {
        goToIndex(currentIndex + 1)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [answered, question, currentIndex, items.length])

  const handleSelect = (optionIndex: number) => {
    if (!question || answered) return
    setSelectedAnswers((prev) => ({
      ...prev,
      [question.id]: { selected: optionIndex, answered: false, correct: false },
    }))
  }

  const handleToggleUnsure = () => {
    if (!question) return
    setUnsureMap((prev) => ({ ...prev, [question.id]: !prev[question.id] }))
  }

  const handleCheckOrNext = () => {
    if (!question || selected === null) return

    if (!answered) {
      const correct = selected === question.answer
      const responseMs = Date.now() - startedAt.current
      const nextIdxToSave = Math.min(currentIndex + 1, items.length - 1)

      setSelectedAnswers((prev) => ({
        ...prev,
        [question.id]: { selected, answered: true, correct },
      }))

      setState((current) => ({
        ...current,
        progress: {
          ...current.progress,
          [question.id]: recordAnswer(
            current.progress[question.id],
            question,
            correct,
            unsure,
            responseMs,
          ),
        },
        sessionProgress: {
          ...(current.sessionProgress || {}),
          ...(sessionKey ? { [sessionKey]: nextIdxToSave } : {}),
        },
        lastUpdatedAt: new Date().toISOString(),
      }))
      return
    }

    if (currentIndex < items.length - 1) {
      goToIndex(currentIndex + 1)
    } else {
      setIsCompleted(true)
    }
  }

  const handleRestart = () => {
    if (window.confirm('Bạn có muốn học lại phần này từ câu đầu tiên không?')) {
      setSelectedAnswers({})
      setIsCompleted(false)
      goToIndex(0)
    }
  }

  if (!question || isCompleted) {
    return (
      <main className="center-page">
        <div className="completion-card">
          <span className="eyebrow">Chúc mừng</span>
          <h1>Hoàn thành chuyên đề học tập</h1>
          <p style={{ margin: '12px 0 24px', color: 'var(--ink-soft)' }}>
            Bạn đã hoàn thành toàn bộ {items.length} câu hỏi trong phần này.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button className="outline-button" onClick={handleRestart}>Học lại từ đầu</button>
            <button className="primary-button" onClick={onExit}>Hoàn thành &amp; Về trang chủ</button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="study-shell">
      <div className="study-header">
        <button className="back-button" onClick={onExit}>← Quay lại</button>
        <div className="study-session-meta">
          <strong>{title}</strong>
        </div>
      </div>

      <QuestionCard
        question={question}
        position={currentIndex + 1}
        total={items.length}
        selected={selected}
        answered={answered}
        unsure={unsure}
        examMode={false}
        canPrev={currentIndex > 0}
        canNext={currentIndex < items.length - 1}
        onPrev={() => goToIndex(currentIndex - 1)}
        onSelect={handleSelect}
        onToggleUnsure={handleToggleUnsure}
        onNext={handleCheckOrNext}
      />
    </main>
  )
}

/* =========================================================================
   EXAM COMPONENT (Mô phỏng thi sát hạch 50 câu - 30 phút)
   ========================================================================= */
function Exam({
  questions,
  profile,
  setState,
  onExit,
}: {
  questions: Question[]
  state: LocalState
  profile: ExamProfile
  setState: React.Dispatch<React.SetStateAction<LocalState>>
  onExit: () => void
}) {
  const [examQuestions] = useState(() => buildExam(questions, profile))
  const [index, setIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({})
  const [seconds, setSeconds] = useState(profile.durationMinutes * 60)
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false)
  const [reviewMode, setReviewMode] = useState(false)
  const [result, setResult] = useState<{
    score: number
    total: number
    passed: boolean
    criticalFailed: boolean
    criticalFailedCount: number
    answeredCount: number
    durationUsedSeconds: number
  } | null>(null)

  const startedAt = useRef(new Date().toISOString())
  const questionStartedAt = useRef(Date.now())
  const questionTimes = useRef<Record<number, number>>({})
  const matrixScrollRef = useRef<HTMLDivElement>(null)

  const currentIndex = Math.min(Math.max(0, index), examQuestions.length - 1)
  const question = examQuestions[currentIndex]

  // Auto-scroll chip into view
  useEffect(() => {
    if (!matrixScrollRef.current) return
    const activeChip = matrixScrollRef.current.children[currentIndex] as HTMLElement | undefined
    if (activeChip) {
      activeChip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [currentIndex])

  const finishExam = () => {
    const durationUsedSeconds = profile.durationMinutes * 60 - seconds
    const finalAnswers: AttemptAnswer[] = examQuestions.map((q) => {
      const chosen = selectedAnswers[q.id]
      const isCorrect = chosen !== undefined && chosen === q.answer
      return {
        questionId: q.id,
        selected: chosen !== undefined ? chosen : -1,
        correct: isCorrect,
        responseMs: questionTimes.current[q.id] || 0,
      }
    })

    const score = finalAnswers.filter((a) => a.correct).length
    const answeredCount = Object.keys(selectedAnswers).length

    // Check critical questions
    const criticalQuestions = examQuestions.filter((q) => q.critical)
    const criticalFailedCount = criticalQuestions.filter(
      (q) => selectedAnswers[q.id] === undefined || selectedAnswers[q.id] !== q.answer,
    ).length
    const criticalFailed = criticalFailedCount > 0

    // Standard A1 rule: >= 42/50 questions correct & NO critical question wrong
    const passThreshold = Math.ceil(examQuestions.length * 0.84)
    const passed = score >= passThreshold && !criticalFailed

    const attemptId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `att-${Date.now()}`
    const attempt: MockAttempt = {
      id: attemptId,
      startedAt: startedAt.current,
      finishedAt: new Date().toISOString(),
      score,
      total: examQuestions.length,
      answers: finalAnswers,
      profileName: `${profile.questionCount} câu - ${profile.durationMinutes} phút`,
    }

    setState((current) => {
      const progress = { ...current.progress }
      for (const ans of finalAnswers) {
        const questionItem = questions.find((item) => item.id === ans.questionId)
        if (questionItem) {
          progress[ans.questionId] = recordAnswer(
            progress[ans.questionId],
            questionItem,
            ans.correct,
            false,
            ans.responseMs,
          )
        }
      }
      return {
        ...current,
        progress,
        attempts: [attempt, ...current.attempts].slice(0, 20),
        lastUpdatedAt: new Date().toISOString(),
      }
    })

    setResult({
      score,
      total: examQuestions.length,
      passed,
      criticalFailed,
      criticalFailedCount,
      answeredCount,
      durationUsedSeconds,
    })
    setShowConfirmSubmit(false)
  }

  // Timer
  useEffect(() => {
    if (result) return
    const timer = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          finishExam()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [result])

  const handleSelect = (optionIndex: number) => {
    if (result && !reviewMode) return
    if (!question) return
    const elapsed = Date.now() - questionStartedAt.current
    questionTimes.current[question.id] = (questionTimes.current[question.id] || 0) + elapsed
    setSelectedAnswers((prev) => ({ ...prev, [question.id]: optionIndex }))
  }

  const goToIndex = (newIdx: number) => {
    if (!question) return
    const elapsed = Date.now() - questionStartedAt.current
    questionTimes.current[question.id] = (questionTimes.current[question.id] || 0) + elapsed
    setIndex(Math.max(0, Math.min(newIdx, examQuestions.length - 1)))
    questionStartedAt.current = Date.now()
  }

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (result && !reviewMode) {
    const minutesUsed = Math.floor(result.durationUsedSeconds / 60)
    const secondsUsed = result.durationUsedSeconds % 60

    return (
      <main className="center-page">
        <div className={`completion-card ${result.passed ? 'passed' : 'failed'}`}>
          <div className={`exam-status-badge ${result.passed ? 'pass-badge' : 'fail-badge'}`}>
            {result.passed ? '✓ ĐẠT YÊU CẦU' : '✗ KHÔNG ĐẠT'}
          </div>

          <span className="eyebrow">KẾT QUẢ THI THỬ SÁT HẠCH</span>
          <div className="exam-big-score-wrap">
            <span className="big-score">{result.score} / {result.total}</span>
            <span className="big-score-sub">
              Điểm đạt tối thiểu: {Math.ceil(result.total * 0.84)}/{result.total} câu &amp; Không sai câu điểm liệt
            </span>
          </div>

          {result.criticalFailed && (
            <div className="critical-warning-box">
              <strong>⚠️ Chú ý:</strong> Bạn đã làm sai {result.criticalFailedCount} câu điểm liệt (câu trọng yếu). Theo quy chế thi sát hạch, sai câu điểm liệt sẽ bị tính không đạt.
            </div>
          )}

          <div className="exam-breakdown-grid">
            <div className="breakdown-box">
              <span className="label">Đúng</span>
              <span className="value text-success">{result.score}</span>
            </div>
            <div className="breakdown-box">
              <span className="label">Sai</span>
              <span className="value text-danger">{result.total - result.score}</span>
            </div>
            <div className="breakdown-box">
              <span className="label">Chưa làm</span>
              <span className="value text-muted">{result.total - result.answeredCount}</span>
            </div>
            <div className="breakdown-box">
              <span className="label">Thời gian</span>
              <span className="value">{minutesUsed}:{secondsUsed.toString().padStart(2, '0')}</span>
            </div>
          </div>

          <div className="exam-result-actions">
            <button className="primary-button" onClick={() => setReviewMode(true)}>
              Xem lại bài thi chi tiết
            </button>
            <button className="outline-button" onClick={onExit}>
              Hoàn thành &amp; Về trang chủ
            </button>
          </div>
        </div>
      </main>
    )
  }

  const selectedOption = question ? (selectedAnswers[question.id] ?? null) : null

  return (
    <main className="study-shell">
      <div className="study-header exam-top-header">
        <button className="back-button" onClick={onExit}>← Thoát</button>
        <div className="exam-session-meta">
          <strong>{profile.name || 'Mô phỏng thi sát hạch'}</strong>
        </div>
        {!result ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className={`timer ${seconds < 180 ? 'timer-warning' : ''}`}>
              ⏱ {formatTimer(seconds)}
            </div>
            <button className="submit-exam-btn" onClick={() => setShowConfirmSubmit(true)}>
              Nộp bài
            </button>
          </div>
        ) : (
          <button className="primary-button" onClick={() => setReviewMode(false)}>
            Về kết quả
          </button>
        )}
      </div>

      <div className="exam-matrix-bar">
        <div className="exam-matrix-scroll" ref={matrixScrollRef}>
          {examQuestions.map((q, idx) => {
            const isAnswered = selectedAnswers[q.id] !== undefined
            const isActive = idx === currentIndex
            let stateClass = ''
            if (result) {
              const isCorrect = selectedAnswers[q.id] === q.answer
              stateClass = isCorrect ? 'correct' : 'wrong'
            } else if (isAnswered) {
              stateClass = 'answered'
            }

            return (
              <button
                key={q.id}
                className={`exam-nav-chip ${isActive ? 'active' : ''} ${stateClass}`}
                onClick={() => goToIndex(idx)}
              >
                <span>{idx + 1}</span>
                {q.critical && <span className="critical-star">★</span>}
              </button>
            )
          })}
        </div>
      </div>

      {question && (
        <QuestionCard
          question={question}
          position={currentIndex + 1}
          total={examQuestions.length}
          selected={selectedOption}
          answered={Boolean(result)}
          unsure={false}
          examMode={true}
          canPrev={currentIndex > 0}
          canNext={currentIndex < examQuestions.length - 1}
          onPrev={() => goToIndex(currentIndex - 1)}
          onSelect={handleSelect}
          onToggleUnsure={() => undefined}
          onNext={() => {
            if (currentIndex < examQuestions.length - 1) {
              goToIndex(currentIndex + 1)
            } else if (!result) {
              setShowConfirmSubmit(true)
            }
          }}
        />
      )}

      {showConfirmSubmit && (
        <div className="dialog-backdrop" onClick={() => setShowConfirmSubmit(false)}>
          <div className="auth-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Xác nhận nộp bài thi</h3>
            <p style={{ margin: '14px 0', color: 'var(--ink-soft)' }}>
              Bạn đã trả lời <strong>{Object.keys(selectedAnswers).length}/{examQuestions.length}</strong> câu hỏi. Bạn có chắc chắn muốn kết thúc bài thi và nộp bài không?
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="subtle-button" onClick={() => setShowConfirmSubmit(false)}>
                Làm tiếp
              </button>
              <button className="submit-exam-btn" onClick={finishExam}>
                Nộp bài ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

/* =========================================================================
   APP ROOT COMPONENT
   ========================================================================= */
export function App() {
  const [view, setView] = useState<View>('portal')
  const [state, setState] = useState<LocalState>(INITIAL_STATE)
  const [_auth, setAuth] = useState<AuthState>({ session: null, user: null, role: 'learner', displayName: null })
  const [examProfile, setExamProfile] = useState<ExamProfile>({
    name: 'Thi thử 50 câu - 30 phút',
    questionCount: 50,
    durationMinutes: 30,
    passScore: 42,
    criticalRule: 'unverified',
  })
  const [studyQueue, setStudyQueue] = useState<Question[]>([])
  const [studySessionKey, setStudySessionKey] = useState<string>('')
  const [studyInitialIndex, setStudyInitialIndex] = useState<number>(0)
  const [studyTitle, setStudyTitle] = useState<string>('')
  const [toastMessage, setToastMessage] = useState<string>('')
  const [toastVisible, setToastVisible] = useState(false)
  const toastTimer = useRef<number | null>(null)

  const questions = gplxA1Questions

  const showToast = (msg = 'Chức năng đang được cập nhật — chuyên đề An toàn giao thông hiện đã sẵn sàng.') => {
    setToastMessage(msg)
    setToastVisible(true)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToastVisible(false), 2600)
  }

  // Load local state from IndexedDB on initial mount
  useEffect(() => {
    loadLocalState().then((loaded) => {
      if (loaded && loaded.progress) {
        setState((prev) => ({
          ...prev,
          ...loaded,
          progress: { ...(prev.progress || {}), ...(loaded.progress || {}) },
        }))
      }
    }).catch(() => undefined)
  }, [])

  // Save local state
  useEffect(() => {
    if (state && state.progress) {
      saveLocalState(state).catch(() => undefined)
    }
  }, [state])

  // Auth bootstrap
  useEffect(() => {
    getAuthState().then(setAuth).catch(() => undefined)
    if (!supabase) return
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setAuth({ session: null, user: null, role: 'learner', displayName: null })
      } else {
        getAuthState().then(setAuth).catch(() => undefined)
      }
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  // Sync with remote progress when signed in
  useEffect(() => {
    if (!_auth.user) return
    loadRemoteProgress(_auth.user.id).then((remote) => {
      setState((prev) => ({
        ...prev,
        progress: mergeProgress(prev.progress, remote),
      }))
    }).catch(() => undefined)
  }, [_auth.user])

  const startTrafficStudy = (mode: Exclude<StudyMode, 'exam'>) => {
    const key = `mode:${mode}`
    let queue: Question[] = []
    if (mode === 'all') {
      queue = [...questions]
    } else if (mode === 'today') {
      queue = buildTodayQueue(questions, state.progress)
    } else {
      queue = selectModeQuestions(mode, questions, state.progress)
    }

    if (mode === 'weak' && queue.length === 0) {
      alert('🎉 Tuyệt vời! Hiện tại bạn không có câu nào bị làm sai. Hãy tiếp tục luyện tập các nhóm kiến thức hoặc thi thử nhé!')
      return
    }

    if (!queue.length) {
      queue = buildTodayQueue(questions, state.progress)
    }
    const seenCount = queue.filter((q) => (state.progress[q.id]?.seen ?? 0) > 0).length
    const initialIdx = mode === 'weak' ? 0 : Math.min(seenCount, queue.length - 1)

    const titles: Record<Exclude<StudyMode, 'exam'>, string> = {
      today: 'Kế hoạch ôn tập',
      all: `Toàn bộ ${questions.length} câu`,
      weak: `Ôn luyện câu làm sai (${queue.length} câu)`,
      critical: 'Câu trọng yếu (Điểm liệt)',
    }
    setStudyQueue(queue)
    setStudySessionKey(key)
    setStudyInitialIndex(initialIdx)
    setStudyTitle(titles[mode])
    setView('study')
  }

  const startTrafficChapterStudy = (chapter: string) => {
    const chapterQuestions = questions.filter((question) => question.chapter === chapter)
    const key = `chapter:${chapter}`
    const seenCount = chapterQuestions.filter((q) => (state.progress[q.id]?.seen ?? 0) > 0).length
    const initialIdx = Math.min(seenCount, chapterQuestions.length - 1)

    setStudyQueue(chapterQuestions)
    setStudySessionKey(key)
    setStudyInitialIndex(initialIdx)
    setStudyTitle(`Luyện theo nhóm: ${chapter}`)
    setView('study')
  }

  const startTrafficExam = (questionCount: number, durationMinutes: number) => {
    setExamProfile({
      name: `Thi thử sát hạch ${questionCount} câu - ${durationMinutes} phút`,
      questionCount,
      durationMinutes,
      passScore: 42,
      criticalRule: 'unverified',
    })
    setView('exam')
  }

  const [currentArticle, setCurrentArticle] = useState<NewsArticle | null>(K602_FEATURED_ARTICLE)

  const handleReadArticle = (article: NewsArticle) => {
    setCurrentArticle(article)
    setView('article')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="app">
      {view === 'portal' && (
        <Portal
          questions={questions}
          state={state}
          onOpenTrafficHub={() => setView('traffic-hub')}
          onStartTrafficStudy={startTrafficStudy}
          onStartTrafficExam={startTrafficExam}
          onReadArticle={handleReadArticle}
          onShowToast={showToast}
        />
      )}

      {view === 'article' && (
        <ArticleFullPage
          article={currentArticle || K602_FEATURED_ARTICLE}
          onBackToPortal={() => {
            setView('portal')
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        />
      )}

      {view === 'traffic-hub' && (
        <TrafficSafetyHub
          questions={questions}
          state={state}
          onBackToPortal={() => setView('portal')}
          onStart={startTrafficStudy}
          onStartChapter={startTrafficChapterStudy}
          onStartExam={startTrafficExam}
        />
      )}

      {view === 'study' && (
        <Study
          queue={studyQueue}
          title={studyTitle}
          sessionKey={studySessionKey}
          initialIndex={studyInitialIndex}
          state={state}
          setState={setState}
          onExit={() => setView('traffic-hub')}
        />
      )}

      {view === 'exam' && (
        <Exam
          questions={questions}
          profile={examProfile}
          state={state}
          setState={setState}
          onExit={() => setView('portal')}
        />
      )}

      {/* FLOATING TOAST */}
      <div className={`toast ${toastVisible ? 'show' : ''}`}>
        {toastMessage}
      </div>
    </div>
  )
}
export default App
