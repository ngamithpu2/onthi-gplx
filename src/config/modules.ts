export interface PortalModule {
  id: string
  title: string
  shortTitle: string
  badge: string
  active: boolean
  description: string
  link?: string
}

export const PORTAL_MODULES: PortalModule[] = [
  {
    id: 'gplx',
    title: 'Ôn Thi GPLX Quốc Gia',
    shortTitle: 'Ôn thi GPLX',
    badge: 'Hoạt động',
    active: true,
    description: 'Hệ thống luyện thi lý thuyết GPLX sát hạch chuẩn',
  },
  {
    id: 'education',
    title: 'Học Tập & Giáo Dục',
    shortTitle: 'Học tập & Giáo dục',
    badge: 'Mở rộng',
    active: false,
    description: 'Tổng hợp tài liệu, khóa học và tri thức giáo dục',
  },
  {
    id: 'tech',
    title: 'Công Nghệ & Kỹ Năng',
    shortTitle: 'Công nghệ',
    badge: 'Mở rộng',
    active: false,
    description: 'Kỹ năng công nghệ, phần mềm và thủ thuật máy tính',
  },
  {
    id: 'tools',
    title: 'Công Cụ & Tiện Ích',
    shortTitle: 'Tiện ích',
    badge: 'Mở rộng',
    active: false,
    description: 'Các công cụ tính toán, tra cứu và tiện ích trực tuyến',
  },
  {
    id: 'news',
    title: 'Tin Tức & Bài Viết',
    shortTitle: 'Tin tức & Chia sẻ',
    badge: 'Mở rộng',
    active: false,
    description: 'Tổng hợp thông tin, kiến thức đời sống và tin tức',
  },
]
