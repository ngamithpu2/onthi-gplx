import { useEffect, useRef, useState } from 'react'
import { gplxA1Questions } from './modules/gplx-a1'
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
type View = 'portal' | 'traffic-hub' | 'study' | 'exam'

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
  onShowToast,
}: {
  questions: Question[]
  state: LocalState
  onOpenTrafficHub: () => void
  onStartTrafficStudy: (mode: Exclude<StudyMode, 'exam'>) => void
  onStartTrafficExam: (questionCount: number, durationMinutes: number) => void
  onShowToast: (msg?: string) => void
}) {
  const [newsMonth, setNewsMonth] = useState<string>('all')
  const [practiceTab, setPracticeTab] = useState<'luyen-tap' | 'hoc-tap'>('luyen-tap')
  const [searchQuery, setSearchQuery] = useState('')
  const [bannerVisible, setBannerVisible] = useState(true)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [clockStr, setClockStr] = useState({ day: 'Hôm nay', text: '' })

  // Calculate live readiness for Traffic Safety module
  const readiness = getReadiness(questions, state?.progress || {})
  const trafficPercent = Math.min(100, Math.max(0, Math.round(((readiness?.seen || 0) / questions.length) * 100)))

  // Clock updater
  useEffect(() => {
    function updateClock() {
      const now = new Date()
      const days = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']
      const dd = String(now.getDate()).padStart(2, '0')
      const mm = String(now.getMonth() + 1).padStart(2, '0')
      const yyyy = now.getFullYear()
      const hh = String(now.getHours()).padStart(2, '0')
      const min = String(now.getMinutes()).padStart(2, '0')
      setClockStr({
        day: days[now.getDay()],
        text: ` · ${dd}/${mm}/${yyyy} · ${hh}:${min}`,
      })
    }
    updateClock()
    const timer = setInterval(updateClock, 10000)
    return () => clearInterval(timer)
  }, [])

  const qLower = searchQuery.trim().toLowerCase()
  const matchSearch = (text: string) => qLower === '' || text.toLowerCase().includes(qLower)

  const newsItems = [
    {
      id: 'n1',
      month: '2026-08',
      date: '15/08/2026',
      unit: 'Ban Tham mưu',
      tag: 'thongbao',
      tagLabel: 'Thông báo',
      title: 'Lịch kiểm tra chuyên đề An toàn kho tàng — tháng 9',
      desc: 'Thông báo thời gian, hình thức kiểm tra chuyên đề An toàn kho tàng dành cho toàn thể quân nhân đơn vị.',
      search: 'thông báo lịch kiểm tra chuyên đề an toàn kho tháng 9',
      thumbClass: 'ph-gold',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6">
          <rect x="6" y="3" width="12" height="18" rx="1.5" />
          <path d="M9 8h6M9 12h6M9 16h3" />
        </svg>
      ),
    },
    {
      id: 'n2',
      month: '2026-08',
      date: '02/08/2026',
      unit: 'Ban Kỹ thuật',
      tag: 'hoatdong',
      tagLabel: 'Hoạt động',
      title: 'Tổng kết công tác bảo quản trang bị 6 tháng đầu năm',
      desc: 'Đánh giá kết quả thực hiện nhiệm vụ bảo quản, bảo dưỡng trang bị 6 tháng đầu năm và phương hướng thời gian tới.',
      search: 'tổng kết công tác bảo quản trang bị 6 tháng đầu năm',
      thumbClass: 'ph-red',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
        </svg>
      ),
    },
    {
      id: 'n3',
      month: '2026-07',
      date: '28/07/2026',
      unit: 'Ban Hậu cần',
      tag: 'huanluyen',
      tagLabel: 'Huấn luyện',
      title: 'Tập huấn nghiệp vụ phòng cháy, chữa cháy',
      desc: 'Tổ chức tập huấn, thực hành phương án chữa cháy tại các khu vực kho theo kế hoạch huấn luyện năm.',
      search: 'tập huấn nghiệp vụ phòng cháy chữa cháy pccc',
      thumbClass: 'ph-green',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6">
          <path d="M12 3c3 3 4 5 4 8a4 4 0 1 1-8 0c0-3 1-5 4-8z" />
        </svg>
      ),
    },
    {
      id: 'n4',
      month: '2026-07',
      date: '10/07/2026',
      unit: 'Ban Chính trị',
      tag: 'huanluyen',
      tagLabel: 'Huấn luyện',
      title: 'Triển khai học tập chuyên đề chính trị quý III',
      desc: 'Quán triệt nội dung học tập chính trị quý III tới toàn thể cán bộ, quân nhân chuyên nghiệp, chiến sĩ.',
      search: 'triển khai học tập chuyên đề chính trị quý III',
      thumbClass: 'ph-green',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6">
          <path d="M4 5h9v14H4zM13 8h7v11h-7" />
          <path d="M6.5 9h4M6.5 12h4M6.5 15h4" />
        </svg>
      ),
    },
    {
      id: 'n5',
      month: '2026-06',
      date: '05/06/2026',
      unit: 'Ban Tham mưu',
      tag: 'thongbao',
      tagLabel: 'Thông báo',
      title: 'Kiểm tra định kỳ công tác quản lý kho',
      desc: 'Thông báo kế hoạch kiểm tra định kỳ công tác quản lý, sổ sách và nghiệp vụ kho quý II.',
      search: 'kiểm tra định kỳ công tác quản lý kho',
      thumbClass: 'ph-gold',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6">
          <path d="M3 8h5l2-3h4l2 3h5v11H3z" />
          <path d="M3 8l2 11M21 8l-2 11" />
        </svg>
      ),
    },
  ]

  const filteredNews = newsItems.filter(
    (item) => (newsMonth === 'all' || item.month === newsMonth) && matchSearch(item.search),
  )

  const libraryTopics = [
    { code: 'TV-01', title: 'An toàn kho tàng', desc: 'Quy định, quy trình bảo đảm an toàn trong khu vực kho.', search: 'an toàn kho tàng', status: 'Đang cập nhật' },
    { code: 'TV-02', title: 'Phòng cháy, chữa cháy', desc: 'Tài liệu nghiệp vụ, phương án và quy trình xử lý tình huống cháy nổ.', search: 'phòng cháy chữa cháy pccc', status: 'Đang cập nhật' },
    { code: 'TV-03', title: 'Nghiệp vụ xuất – nhập kho', desc: 'Quy trình tiếp nhận, cấp phát, luân chuyển hàng hoá trong kho.', search: 'nghiệp vụ xuất nhập kho', status: 'Đang cập nhật' },
    { code: 'TV-04', title: 'Bảo quản, bảo dưỡng trang bị', desc: 'Hướng dẫn kỹ thuật bảo quản định kỳ theo mùa và theo chu kỳ.', search: 'bảo quản bảo dưỡng trang bị', status: 'Đang cập nhật' },
    { code: 'TV-05', title: 'Điều lệnh, điều lệ quân đội', desc: 'Hệ thống điều lệnh đội ngũ và điều lệ quản lý bộ đội.', search: 'điều lệnh điều lệ quân đội', status: 'Đang cập nhật' },
    { code: 'TV-06', title: 'Chính trị, tư tưởng', desc: 'Tài liệu học tập chính trị, giáo dục truyền thống đơn vị.', search: 'chính trị tư tưởng', status: 'Đang cập nhật' },
    { code: 'TV-07', title: 'Pháp luật Nhà nước & Quân đội', desc: 'Văn bản pháp luật liên quan đến chức năng, nhiệm vụ của đơn vị.', search: 'pháp luật nhà nước quân đội', status: 'Đang cập nhật' },
    { code: 'TV-08', title: 'Kỹ năng nghiệp vụ chuyên môn', desc: 'Tài liệu bổ trợ kỹ năng theo từng vị trí công tác trong kho.', search: 'kỹ năng nghiệp vụ chuyên môn', status: 'Đang cập nhật' },
    {
      code: 'TV-09',
      title: 'An toàn giao thông đường bộ',
      desc: 'Bộ 150 câu hỏi trắc nghiệm Luật trật tự an toàn giao thông đường bộ & sát hạch lái xe A1.',
      search: 'an toàn giao thông đường bộ gplx a1 xe máy',
      status: 'Sẵn sàng học',
      isTraffic: true,
    },
  ]

  const practiceItems = [
    { code: 'LT-01', title: 'An toàn kho tàng', desc: '4 bài luyện tập trắc nghiệm tình huống.', search: 'an toàn kho tàng', progress: 0, status: 'Chưa bắt đầu' },
    { code: 'LT-02', title: 'Phòng cháy, chữa cháy', desc: '3 bài luyện tập xử lý tình huống.', search: 'phòng cháy chữa cháy pccc', progress: 0, status: 'Chưa bắt đầu' },
    { code: 'LT-03', title: 'Nghiệp vụ xuất – nhập kho', desc: '5 bài luyện tập quy trình nghiệp vụ.', search: 'nghiệp vụ xuất nhập kho', progress: 0, status: 'Chưa bắt đầu' },
    { code: 'LT-04', title: 'Bảo quản, bảo dưỡng trang bị', desc: '4 bài luyện tập nhận diện quy trình.', search: 'bảo quản bảo dưỡng trang bị', progress: 0, status: 'Chưa bắt đầu' },
    { code: 'LT-05', title: 'Điều lệnh, điều lệ quân đội', desc: '4 bài luyện tập lý thuyết.', search: 'điều lệnh điều lệ', progress: 0, status: 'Chưa bắt đầu' },
    { code: 'LT-06', title: 'Chính trị, tư tưởng', desc: '4 bài luyện tập nhận thức chuyên đề.', search: 'chính trị tư tưởng', progress: 0, status: 'Chưa bắt đầu' },
    {
      code: 'LT-07',
      title: 'An toàn giao thông đường bộ',
      desc: `Luyện tập 150 câu hỏi lý thuyết sát hạch lái xe A1 (${readiness.seen}/150 câu đã học).`,
      search: 'an toàn giao thông đường bộ gplx a1',
      progress: trafficPercent,
      status: trafficPercent === 100 ? 'Đã hoàn thành' : trafficPercent > 0 ? `${trafficPercent}% đã học` : 'Sẵn sàng',
      isTraffic: true,
    },
  ]

  const learningItems = [
    { code: 'HT-01', title: 'An toàn kho tàng', desc: '6 bài học lý thuyết kèm hình ảnh minh hoạ.', search: 'an toàn kho tàng', progress: 0, status: 'Chưa bắt đầu' },
    { code: 'HT-02', title: 'Phòng cháy, chữa cháy', desc: '5 bài học quy trình và phương án xử lý.', search: 'phòng cháy chữa cháy pccc', progress: 0, status: 'Chưa bắt đầu' },
    { code: 'HT-03', title: 'Nghiệp vụ xuất – nhập kho', desc: '7 bài học quy trình nghiệp vụ chi tiết.', search: 'nghiệp vụ xuất nhập kho', progress: 0, status: 'Chưa bắt đầu' },
    { code: 'HT-04', title: 'Bảo quản, bảo dưỡng trang bị', desc: '6 bài học kỹ thuật theo chu kỳ bảo quản.', search: 'bảo quản bảo dưỡng trang bị', progress: 0, status: 'Chưa bắt đầu' },
    { code: 'HT-05', title: 'Điều lệnh, điều lệ quân đội', desc: '5 bài học điều lệnh đội ngũ cơ bản.', search: 'điều lệnh điều lệ', progress: 0, status: 'Chưa bắt đầu' },
    { code: 'HT-06', title: 'Chính trị, tư tưởng', desc: '5 bài học chuyên đề chính trị theo quý.', search: 'chính trị tư tưởng', progress: 0, status: 'Chưa bắt đầu' },
    {
      code: 'HT-07',
      title: 'An toàn giao thông đường bộ',
      desc: 'Học tập 6 nhóm kiến thức pháp luật và kỹ thuật lái xe an toàn.',
      search: 'an toàn giao thông đường bộ học tập',
      progress: trafficPercent,
      status: trafficPercent === 100 ? 'Đã hoàn thành' : trafficPercent > 0 ? `${trafficPercent}% đã học` : 'Sẵn sàng',
      isTraffic: true,
    },
  ]

  const testListItems = [
    { code: 'KT-01', title: 'An toàn kho tàng', questionsCount: '20 câu', duration: '30 phút', difficulty: 'basic', diffLabel: 'Cơ bản', search: 'an toàn kho tàng kiểm tra' },
    { code: 'KT-02', title: 'Phòng cháy, chữa cháy', questionsCount: '15 câu', duration: '25 phút', difficulty: 'basic', diffLabel: 'Cơ bản', search: 'phòng cháy chữa cháy pccc kiểm tra' },
    { code: 'KT-03', title: 'Nghiệp vụ xuất – nhập kho', questionsCount: '25 câu', duration: '40 phút', difficulty: 'adv', diffLabel: 'Nâng cao', search: 'nghiệp vụ xuất nhập kho kiểm tra' },
    { code: 'KT-04', title: 'Bảo quản, bảo dưỡng trang bị', questionsCount: '20 câu', duration: '30 phút', difficulty: 'adv', diffLabel: 'Nâng cao', search: 'bảo quản bảo dưỡng trang bị kiểm tra' },
    { code: 'KT-05', title: 'Điều lệnh, điều lệ quân đội', questionsCount: '15 câu', duration: '20 phút', difficulty: 'basic', diffLabel: 'Cơ bản', search: 'điều lệnh điều lệ kiểm tra' },
    { code: 'KT-06', title: 'Chính trị, tư tưởng', questionsCount: '20 câu', duration: '30 phút', difficulty: 'basic', diffLabel: 'Cơ bản', search: 'chính trị tư tưởng kiểm tra' },
    {
      code: 'KT-07',
      title: 'Chuyên đề: An toàn giao thông đường bộ',
      questionsCount: '50 câu',
      duration: '30 phút',
      difficulty: 'official',
      diffLabel: 'Sát hạch',
      search: 'an toàn giao thông đường bộ sát hạch 50 câu 30 phút',
      isTraffic: true,
    },
  ]

  const filteredTests = testListItems.filter((t) => matchSearch(t.search))

  return (
    <>
      {/* DEMO NOTICE BANNER */}
      {bannerVisible && (
        <div className="demo-banner">
          <span>
            🛈 <strong>Bản dựng giao diện để duyệt bố cục</strong> — danh mục chuyên đề, bài luyện tập, đề kiểm tra và tin tức hiện là dữ liệu minh hoạ, sẽ thay bằng nội dung chính thức sau khi thống nhất.
          </span>
          <button onClick={() => setBannerVisible(false)} aria-label="Đóng thông báo">×</button>
        </div>
      )}

      {/* TOPBAR */}
      <header className="topbar">
        <div className="container">
          <div className="brand">
            <div className="brand-emblem">
              <svg viewBox="0 0 100 100">
                <polygon points="50,6 61,36 94,36 67,55 78,90 50,70 22,90 33,55 6,36 39,36" fill="#E4C876" />
              </svg>
            </div>
            <div className="brand-text">
              <div className="name">KHO K602</div>
              <div className="org">Tổng cục Công nghiệp Quốc phòng</div>
              <div className="addr">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
                  <circle cx="12" cy="10" r="2.5" />
                </svg>
                Phường Vạn Xuân, tỉnh Thái Nguyên
              </div>
            </div>
          </div>

          <div className="topbar-right">
            <div className="clock">
              <span className="day">{clockStr.day}</span>
              {clockStr.text}
            </div>
            <div className="search-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm chuyên đề, bài luyện tập, đề kiểm tra…"
              />
            </div>
            <button
              className="hamburger"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              aria-label="Mở menu điều hướng"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN NAV */}
      <nav className="mainnav">
        <div className="container">
          <div className={`nav-panel ${mobileNavOpen ? 'open' : ''}`}>
            <ul>
              <li>
                <a href="#trang-chu" onClick={() => setMobileNavOpen(false)} className="active">
                  <span className="code">TC</span>Trang chủ
                </a>
              </li>
              <li>
                <a href="#tin-tuc" onClick={() => setMobileNavOpen(false)}>
                  <span className="code">TT</span>Tin tức
                </a>
              </li>
              <li>
                <a href="#thu-vien" onClick={() => setMobileNavOpen(false)}>
                  <span className="code">TV</span>Thư viện kho
                </a>
              </li>
              <li>
                <a href="#hoc-tap" onClick={() => setMobileNavOpen(false)}>
                  <span className="code">HT</span>Luyện tập &amp; Học tập
                </a>
              </li>
              <li>
                <a href="#kiem-tra" onClick={() => setMobileNavOpen(false)}>
                  <span className="code">KT</span>Kiểm tra
                </a>
              </li>
              <li>
                <a href="#gioi-thieu" onClick={() => setMobileNavOpen(false)}>
                  <span className="code">GT</span>Giới thiệu
                </a>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      <main>
        {/* HERO */}
        <section className="hero" id="trang-chu">
          <div className="container hero-grid">
            <div className="hero-inner">
              <div className="eyebrow">Cổng thông tin nội bộ đơn vị</div>
              <h1>Thư viện, luyện tập &amp; kiểm tra <span>Kho K602</span></h1>
              <p className="lead">
                Nơi tra cứu tài liệu, ôn luyện và kiểm tra theo từng chuyên đề nghiệp vụ của đơn vị — sắp xếp theo mã mục lục để tìm nhanh, đúng nội dung cần dùng.
              </p>
              <div className="hero-actions">
                <a href="#thu-vien" className="btn btn-primary">Xem thư viện kho</a>
                <a href="#kiem-tra" className="btn btn-ghost">Vào phần kiểm tra</a>
              </div>
              <div className="stat-row">
                <div className="stat-tag"><div className="num">9</div><div className="lbl">Chuyên đề khung</div></div>
                <div className="stat-tag"><div className="num">24</div><div className="lbl">Bài luyện tập mẫu</div></div>
                <div className="stat-tag"><div className="num">7</div><div className="lbl">Đề kiểm tra mẫu</div></div>
                <div className="stat-tag"><div className="num">6</div><div className="lbl">Tin cập nhật gần đây</div></div>
              </div>
            </div>

            <aside className="news-widget">
              <div className="news-widget-head">
                <h3>Tin mới nhất</h3>
                <span className="live-dot">Cập nhật</span>
              </div>
              <div className="news-widget-list">
                {newsItems.slice(0, 4).map((item) => (
                  <a href="#tin-tuc" className="news-widget-item" key={item.id}>
                    <div className="news-widget-thumb">
                      <div className={`photo-ph ${item.thumbClass}`}>{item.icon}</div>
                    </div>
                    <div>
                      <h4>{item.title}</h4>
                      <div className="wmeta">
                        <span className="wtag">{item.tagLabel}</span>
                        <span className="wdate">·</span>
                        <span className="wdate">{item.date.slice(0, 5)}</span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
              <div className="news-widget-foot">
                <a href="#tin-tuc">Xem tất cả tin tức →</a>
              </div>
            </aside>
          </div>
        </section>

        {/* NEWS */}
        <section className="section" id="tin-tuc">
          <div className="container">
            <div className="section-head">
              <div>
                <div className="eyebrow">Cập nhật theo ngày</div>
                <h2>Tin tức đơn vị</h2>
              </div>
              <div className="section-note">Ảnh minh hoạ tạm thời — sẽ thay bằng ảnh thật của đơn vị khi có nội dung chính thức.</div>
            </div>

            <div className="filter-row">
              {['all', '2026-08', '2026-07', '2026-06'].map((m) => (
                <button
                  key={m}
                  className={`filter-btn ${newsMonth === m ? 'active' : ''}`}
                  onClick={() => setNewsMonth(m)}
                >
                  {m === 'all' ? 'Tất cả' : `Tháng ${m.slice(5)}/${m.slice(0, 4)}`}
                </button>
              ))}
            </div>

            <div className="news-layout">
              <div>
                {/* Featured Article */}
                <article className="news-featured">
                  <div className="thumb-wrap">
                    <div className="photo-ph ph-red">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6">
                        <path d="M13 4l-9 9h5l-1 7 9-9h-5l1-7z" />
                      </svg>
                      <span className="ph-caption">Ảnh minh hoạ</span>
                    </div>
                  </div>
                  <div className="news-featured-body">
                    <span className="news-tag hoatdong">Hoạt động</span>
                    <h3>Hội thao huấn luyện thể lực quý III</h3>
                    <p>
                      Đơn vị tổ chức hội thao rèn luyện thể lực cho cán bộ, chiến sĩ nhân dịp tổng kết công tác huấn luyện quý III, với nhiều nội dung thi đấu đồng đội và cá nhân.
                    </p>
                    <div className="news-featured-meta">
                      <span>20/08/2026</span>
                      <span>·</span>
                      <span>Ban Chính trị</span>
                    </div>
                  </div>
                </article>

                {/* News List */}
                <div className="news-main">
                  {filteredNews.map((item) => (
                    <div className="news-row" key={item.id}>
                      <div className="thumb-wrap">
                        <div className={`photo-ph ${item.thumbClass}`}>
                          {item.icon}
                          <span className="ph-caption">Ảnh minh hoạ</span>
                        </div>
                      </div>
                      <div className="news-row-body">
                        <span className={`news-tag ${item.tag}`}>{item.tagLabel}</span>
                        <h3>{item.title}</h3>
                        <p>{item.desc}</p>
                        <div className="news-row-meta">
                          <span>{item.date}</span>
                          <span>·</span>
                          <span>{item.unit}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredNews.length === 0 && (
                    <p className="news-empty" style={{ display: 'block' }}>
                      Không có tin tức phù hợp với bộ lọc hiện tại.
                    </p>
                  )}
                </div>
              </div>

              {/* Sidebar */}
              <aside className="news-sidebar">
                <h3>Đọc nhiều</h3>
                <div className="trending-item"><span className="trending-rank">01</span><h4>Lịch kiểm tra chuyên đề An toàn kho tàng — tháng 9</h4></div>
                <div className="trending-item"><span className="trending-rank">02</span><h4>Hội thao huấn luyện thể lực quý III</h4></div>
                <div className="trending-item"><span className="trending-rank">03</span><h4>Tập huấn nghiệp vụ phòng cháy, chữa cháy</h4></div>
                <div className="trending-item"><span className="trending-rank">04</span><h4>Kiểm tra định kỳ công tác quản lý kho</h4></div>
                <div className="trending-item"><span className="trending-rank">05</span><h4>Triển khai học tập chuyên đề chính trị quý III</h4></div>
              </aside>
            </div>
          </div>
        </section>

        {/* LIBRARY */}
        <section className="section alt" id="thu-vien">
          <div className="container">
            <div className="section-head">
              <div>
                <div className="eyebrow">Mục lục tra cứu</div>
                <h2>Thư viện kho</h2>
              </div>
              <div className="section-note">Mỗi chuyên đề mang một mã mục lục riêng (TV‑xx) để tra cứu và liên kết tài liệu nhanh hơn.</div>
            </div>

            <div className="tag-grid">
              {libraryTopics.filter((item) => matchSearch(item.search + ' ' + item.title)).map((item) => (
                <div className={`tag-card ${item.isTraffic ? 'special-featured' : ''}`} key={item.code}>
                  <span className="tag-code">{item.code}</span>
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                  <hr className="tag-divider" />
                  <div className="tag-meta">
                    <span className={`pill ${item.isTraffic ? 'active-pill' : ''}`}>{item.status}</span>
                    {item.isTraffic ? (
                      <button className="tag-link" onClick={onOpenTrafficHub}>
                        Vào học ngay →
                      </button>
                    ) : (
                      <button className="tag-link" onClick={() => onShowToast('Tài liệu đang được số hoá và cập nhật.')}>
                        Xem thư mục →
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* LEARN & PRACTICE */}
        <section className="section" id="hoc-tap">
          <div className="container">
            <div className="section-head">
              <div>
                <div className="eyebrow">Ôn luyện theo chuyên đề</div>
                <h2>Luyện tập &amp; Học tập</h2>
              </div>
              <div className="section-note">Danh mục chung với Thư viện kho — mỗi chuyên đề có bài học và bài luyện tập tương ứng.</div>
            </div>

            <div className="tabs">
              <button
                className={`tab-btn ${practiceTab === 'luyen-tap' ? 'active' : ''}`}
                onClick={() => setPracticeTab('luyen-tap')}
              >
                Luyện tập
              </button>
              <button
                className={`tab-btn ${practiceTab === 'hoc-tap' ? 'active' : ''}`}
                onClick={() => setPracticeTab('hoc-tap')}
              >
                Học tập
              </button>
            </div>

            {practiceTab === 'luyen-tap' ? (
              <div className="tag-grid">
                {practiceItems.filter((item) => matchSearch(item.search + ' ' + item.title)).map((item) => (
                  <div className={`tag-card ${item.isTraffic ? 'special-featured' : ''}`} key={item.code}>
                    <span className="tag-code">{item.code}</span>
                    <h3>{item.title}</h3>
                    <p>{item.desc}</p>
                    <div className="progress-bar">
                      <span style={{ width: `${item.progress}%` }}></span>
                    </div>
                    <hr className="tag-divider" />
                    <div className="tag-meta">
                      <span className={`pill ${item.isTraffic && item.progress > 0 ? 'active-pill' : ''}`}>{item.status}</span>
                      {item.isTraffic ? (
                        <button className="tag-link" onClick={() => onStartTrafficStudy('all')}>
                          Luyện tập →
                        </button>
                      ) : (
                        <button className="tag-link" onClick={() => onShowToast('Nội dung bài luyện tập đang được cập nhật.')}>
                          Luyện tập →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="tag-grid">
                {learningItems.filter((item) => matchSearch(item.search + ' ' + item.title)).map((item) => (
                  <div className={`tag-card ${item.isTraffic ? 'special-featured' : ''}`} key={item.code}>
                    <span className="tag-code">{item.code}</span>
                    <h3>{item.title}</h3>
                    <p>{item.desc}</p>
                    <div className="progress-bar">
                      <span style={{ width: `${item.progress}%` }}></span>
                    </div>
                    <hr className="tag-divider" />
                    <div className="tag-meta">
                      <span className={`pill ${item.isTraffic && item.progress > 0 ? 'active-pill' : ''}`}>{item.status}</span>
                      {item.isTraffic ? (
                        <button className="tag-link" onClick={onOpenTrafficHub}>
                          Học ngay →
                        </button>
                      ) : (
                        <button className="tag-link" onClick={() => onShowToast('Nội dung bài học lý thuyết đang được cập nhật.')}>
                          Học ngay →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* TESTS */}
        <section className="section alt" id="kiem-tra">
          <div className="container">
            <div className="section-head">
              <div>
                <div className="eyebrow">Đề kiểm tra theo chuyên đề</div>
                <h2>Kiểm tra</h2>
              </div>
              <div className="section-note">Số câu hỏi, thời gian và mức độ chuẩn theo từng chuyên đề nghiệp vụ.</div>
            </div>

            <div className="test-list">
              {filteredTests.map((item) => (
                <div className={`test-row ${item.isTraffic ? 'special-test' : ''}`} key={item.code}>
                  <span className="test-code">{item.code}</span>
                  <div className="test-info">
                    <h3>{item.title}</h3>
                    <div className="test-meta">
                      <span>{item.questionsCount}</span>
                      <span>{item.duration}</span>
                      <span className={`difficulty ${item.difficulty}`}>{item.diffLabel}</span>
                    </div>
                  </div>
                  {item.isTraffic ? (
                    <button
                      className="test-action special-action"
                      onClick={() => onStartTrafficExam(50, 30)}
                    >
                      Bắt đầu thi
                    </button>
                  ) : (
                    <button
                      className="test-action"
                      onClick={() => onShowToast('Đề kiểm tra đang được chuẩn bị.')}
                    >
                      Bắt đầu
                    </button>
                  )}
                </div>
              ))}
              {filteredTests.length === 0 && (
                <p className="news-empty" style={{ display: 'block' }}>
                  Không có đề kiểm tra phù hợp với từ khoá tìm kiếm.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ABOUT */}
        <section className="section" id="gioi-thieu">
          <div className="container about-grid">
            <div>
              <div className="eyebrow">Giới thiệu</div>
              <h2 style={{ fontSize: '26px', textTransform: 'uppercase', margin: '8px 0 18px', color: 'var(--green-deep)' }}>
                Kho K602
              </h2>
              <p>
                Kho K602 là đơn vị trực thuộc Tổng cục Công nghiệp Quốc phòng, thực hiện nhiệm vụ quản lý, bảo quản và bảo đảm theo chức năng được giao. Cổng thông tin này được xây dựng nhằm hệ thống hoá tài liệu nghiệp vụ, hỗ trợ cán bộ, quân nhân chuyên nghiệp, chiến sĩ tự học, tự luyện và tự kiểm tra kiến thức theo từng chuyên đề.
              </p>
              <p>
                Hệ thống tích hợp đầy đủ các tính năng tự ôn luyện, tự kiểm tra kiến thức sát hạch và thống kê tiến độ học tập chính xác cho từng chuyên đề.
              </p>
            </div>
            <div className="about-card">
              <dl>
                <dt>Đơn vị</dt><dd>Kho K602</dd>
                <dt>Trực thuộc</dt><dd>Tổng cục Công nghiệp Quốc phòng</dd>
                <dt>Địa chỉ</dt><dd>Phường Vạn Xuân, tỉnh Thái Nguyên</dd>
                <dt>Chuyên đề tích hợp</dt><dd>An toàn giao thông đường bộ (150 câu chuẩn GPLX A1)</dd>
                <dt>Hệ thống</dt><dd>Cổng thông tin &amp; Sát hạch nội bộ</dd>
              </dl>
            </div>
          </div>
        </section>
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
              <li><a href="#tin-tuc">Tin tức</a></li>
              <li><a href="#thu-vien">Thư viện kho</a></li>
              <li><a href="#hoc-tap">Luyện tập &amp; Học tập</a></li>
              <li><a href="#kiem-tra">Kiểm tra</a></li>
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
    </>
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

  return (
    <div className="app">
      {view === 'portal' && (
        <Portal
          questions={questions}
          state={state}
          onOpenTrafficHub={() => setView('traffic-hub')}
          onStartTrafficStudy={startTrafficStudy}
          onStartTrafficExam={startTrafficExam}
          onShowToast={showToast}
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
